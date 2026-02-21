'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { sanitizeAuthError } from '@/lib/auth/sanitize-error'
import { Captcha } from '@/components/auth/captcha'
import { KeyRound, Mail } from 'lucide-react'
import { AppHeader } from '@/components/nav/app-header'
import { Footer } from '@/components/nav/footer'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader variant="auth" />
      <Suspense fallback={
        <main className="flex-1 flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-sm text-center">
            <KeyRound className="w-10 h-10 text-gold mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </main>
      }>
        <ForgotPasswordContent />
      </Suspense>
      <Footer />
    </div>
  )
}

function ForgotPasswordContent() {
  const [email, setEmail] = useState('')
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(searchParams.get('error'))
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/callback?next=/reset-password',
      captchaToken: captchaToken ?? undefined,
    })

    if (error) {
      setError(sanitizeAuthError(error))
      setLoading(false)
      return
    }

    // Always show success regardless of email existence
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Mail className="w-12 h-12 text-gold" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-2">
            If an account with that email exists, we&apos;ve sent a reset link.
          </p>
          <p className="text-xs text-muted-foreground/70 mb-6">
            Check your spam folder if you don&apos;t see the email.
          </p>
          <Link
            href="/login"
            className="text-sm text-gold hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <KeyRound className="w-10 h-10 text-gold" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Captcha onVerify={setCaptchaToken} />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/login" className="text-gold hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
