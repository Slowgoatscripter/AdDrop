'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sanitizeAuthError } from '@/lib/auth/sanitize-error'
import { Captcha } from '@/components/auth/captcha'
import { BetaSignupBanner } from '@/components/auth/beta-signup-banner'
import { UserPlus, Mail } from 'lucide-react'
import { AppHeader } from '@/components/nav/app-header'
import { Footer } from '@/components/nav/footer'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader variant="auth" />
      <Suspense fallback={
        <main className="flex-1 flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-sm text-center">
            <UserPlus className="w-10 h-10 text-gold mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </main>
      }>
        <SignupContent />
      </Suspense>
      <Footer />
    </div>
  )
}

function SignupContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [tosAccepted, setTosAccepted] = useState(false)
  const searchParams = useSearchParams()
  const next = searchParams.get('next')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!tosAccepted) {
      setError('You must agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || undefined, tos_accepted_at: new Date().toISOString() },
        captchaToken: captchaToken ?? undefined,
        emailRedirectTo: next
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
          : `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(sanitizeAuthError(error))
      setLoading(false)
      return
    }

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
          <p className="text-sm text-muted-foreground mb-6">
            We&apos;ve sent a confirmation link to <span className="text-foreground font-medium">{email}</span>.
            Please check your inbox to confirm your account.
          </p>
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
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
          <p className="text-sm text-muted-foreground mt-1">Create your account</p>
        </div>

        {next && <BetaSignupBanner />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Display name <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
              placeholder="Your name"
            />
          </div>

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Confirm password
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

          <Captcha onVerify={setCaptchaToken} />

          <div className="flex items-start gap-2">
            <input
              id="tos"
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 appearance-none rounded border border-border bg-muted checked:bg-gold checked:border-gold focus:ring-2 focus:ring-gold/50 cursor-pointer relative checked:after:content-['✓'] checked:after:text-background checked:after:text-[10px] checked:after:font-bold checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
            />
            <label htmlFor="tos" className="text-xs text-muted-foreground leading-relaxed">
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="text-gold hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="text-gold hover:underline">Privacy Policy</Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-gold hover:underline">
            Sign in
          </Link>
        </p>
        </div>
      </main>
  )
}
