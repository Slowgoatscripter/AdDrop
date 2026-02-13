'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FeedbackStatus, FeedbackType, FeedbackWithUser } from '@/lib/types/feedback'

const PAGE_SIZE = 20

export async function getFeedback(filters: {
  status?: FeedbackStatus | 'all'
  type?: FeedbackType | 'all'
  page?: number
}): Promise<{ data: FeedbackWithUser[]; totalCount: number }> {
  const supabase = await createClient()

  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  // Build query — no join (feedback.user_id -> auth.users, not profiles)
  let query = supabase
    .from('feedback')
    .select('*', { count: 'exact' })

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }

  // Pagination
  const page = filters.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  query = query
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) throw new Error(error.message)

  // Fetch user profiles for each unique user_id
  const feedbackRows = data || []
  const userIds = [...new Set(feedbackRows.map((f: { user_id: string }) => f.user_id))]

  let profileMap: Record<string, { display_name: string | null; email: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds)

    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map((p) => [p.id, { display_name: p.display_name, email: p.email }])
      )
    }
  }

  const result: FeedbackWithUser[] = feedbackRows.map((f: Record<string, unknown>) => ({
    ...f,
    user: profileMap[f.user_id as string] || { display_name: null, email: 'Unknown' },
  })) as FeedbackWithUser[]

  return {
    data: result,
    totalCount: count ?? 0,
  }
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNotes?: string
) {
  const supabase = await createClient()

  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  // Build update payload
  const updateData: Record<string, string> = { status }
  if (adminNotes !== undefined) {
    updateData.admin_notes = adminNotes
  }

  const { error } = await supabase
    .from('feedback')
    .update(updateData)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/feedback')
  revalidatePath('/admin')
}

export async function getFeedbackStats(): Promise<{
  newCount: number
  totalCount: number
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  const { count: newCount } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new')

  const { count: totalCount } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })

  return {
    newCount: newCount ?? 0,
    totalCount: totalCount ?? 0,
  }
}

export async function getRecentFeedback(): Promise<FeedbackWithUser[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw new Error(error.message)

  const feedbackRows = data || []
  const userIds = [...new Set(feedbackRows.map((f) => f.user_id))]

  let profileMap: Record<string, { display_name: string | null; email: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds)

    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map((p) => [p.id, { display_name: p.display_name, email: p.email }])
      )
    }
  }

  return feedbackRows.map((f) => ({
    ...f,
    user: profileMap[f.user_id] || { display_name: null, email: 'Unknown' },
  })) as FeedbackWithUser[]
}
