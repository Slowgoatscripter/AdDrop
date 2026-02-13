'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { sanitizeAuthError } from '@/lib/auth/sanitize-error'
import { Lock } from 'lucide-react'
import { AppHeader } from '@/components/nav/app-header'
import { Footer } from '@/components/nav/footer'

function PasswordStrength({ password }: { password: string }) {
  const length = password.length
  if (length === 0) return null

  let color = 'bg-destructive'
  let width = '33%'
  let label = 'Weak'

  if (length >= 12) {
    color = 'bg-green-500'
    width = '100%'
    label = 'Strong'
  } else if (length >= 8) {
    color = 'bg-yellow-500'
    width = '66%'
    label = 'Fair'
  }

  return (
    <div className="space-y-1">
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Check for existing session or PASSWORD_RECOVERY event
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setHasSession(true)
        }
      }
    )

    // If no session detected after a short delay, show error
    const timeout = setTimeout(() => {
      setHasSession((prev) => (prev === null ? false : prev))
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setError(sanitizeAuthError(error))
      setLoading(false)
      return
    }

    // Sign out all sessions after password reset
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login?message=password_reset_success')
  }

  // Still checking for session
  if (hasSession === null) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader variant="auth" />
        <main className="flex-1 flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-sm text-center">
            <div className="flex justify-center mb-4">
              <Lock className="w-10 h-10 text-gold animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // No valid session
  if (!hasSession) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader variant="auth" />
        <main className="flex-1 flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-sm text-center">
            <div className="flex justify-center mb-4">
              <Lock className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Invalid or expired link</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This password reset link is no longer valid. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
            >
              Request new reset link
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader variant="auth" />
      <main className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Lock className="w-10 h-10 text-gold" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a strong password for your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-muted-foreground mb-1.5">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                placeholder="••••••••"
              />
              <div className="mt-2">
                <PasswordStrength password={newPassword} />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Updating password...' : 'Reset password'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
