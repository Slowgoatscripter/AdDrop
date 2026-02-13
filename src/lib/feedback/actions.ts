'use server'

import { createClient } from '@/lib/supabase/server'
import type { FeedbackType } from '@/lib/types/feedback'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function submitFeedback(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Extract fields from FormData
  const type = formData.get('type') as FeedbackType
  const description = (formData.get('description') as string)?.trim()
  const pageUrl = formData.get('pageUrl') as string
  const browserInfo = formData.get('browserInfo') as string
  const screenshotFile = formData.get('screenshot') as File | null

  // Validate type
  const validTypes = ['bug', 'feature', 'general'] as const
  if (!validTypes.includes(type)) {
    return { error: 'Invalid feedback type' }
  }

  // Validate description length
  if (!description || description.length < 10) {
    return { error: 'Description must be at least 10 characters' }
  }

  // Rate limit: max 10 feedback per user in last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', twentyFourHoursAgo)

  if (countError) {
    console.error('[feedback] Rate limit check failed:', countError.message)
    return { error: 'Something went wrong. Please try again.' }
  }

  if (count !== null && count >= 10) {
    return { error: 'You\'ve reached the feedback limit for today. Please try again tomorrow.' }
  }

  // Handle screenshot upload
  let screenshotPath: string | null = null

  if (screenshotFile && screenshotFile.size > 0) {
    // Server-side validation
    if (!ALLOWED_MIME_TYPES.includes(screenshotFile.type)) {
      return { error: 'Invalid screenshot type. Only PNG, JPEG, and WebP are allowed.' }
    }

    if (screenshotFile.size > MAX_FILE_SIZE) {
      return { error: 'Screenshot must be under 5 MB.' }
    }

    // Generate unique filename
    const ext = screenshotFile.name.split('.').pop() || 'png'
    const randomSuffix = Math.random().toString(36).substring(2, 10)
    screenshotPath = `${user.id}/${Date.now()}-${randomSuffix}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('feedback-screenshots')
      .upload(screenshotPath, screenshotFile, {
        contentType: screenshotFile.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[feedback] Screenshot upload failed:', uploadError.message)
      // Don't block submission — screenshot is optional
      screenshotPath = null
    }
  }

  // Insert feedback
  const { error: insertError } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      type,
      description,
      page_url: pageUrl || null,
      browser_info: browserInfo || null,
      screenshot_url: screenshotPath,
    })

  if (insertError) {
    console.error('[feedback] Insert failed:', insertError.message)

    // Clean up uploaded screenshot if insert fails
    if (screenshotPath) {
      await supabase.storage
        .from('feedback-screenshots')
        .remove([screenshotPath])
        .catch((err) => {
          console.error('[feedback] Screenshot cleanup failed:', err)
        })
    }

    return { error: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}

export async function getScreenshotSignedUrl(path: string): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient()

  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { url: null, error: 'Not authenticated' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') return { url: null, error: 'Not authorized' }

  const { data, error } = await supabase.storage
    .from('feedback-screenshots')
    .createSignedUrl(path, 3600)

  if (error) {
    console.error('[feedback] Signed URL generation failed:', error.message)
    return { url: null, error: 'Could not load screenshot' }
  }

  return { url: data.signedUrl }
}
