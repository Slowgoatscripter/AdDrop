'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { verifyBackupCodeAction } from '@/app/settings/security/actions'
import { ShieldCheck, KeyRound } from 'lucide-react'

export default function MfaChallengePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <ShieldCheck className="w-10 h-10 text-gold mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    }>
      <MfaChallengeContent />
    </Suspense>
  )
}

function MfaChallengeContent() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [factorsLoading, setFactorsLoading] = useState(true)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function loadFactors() {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) {
        setError('Failed to load MFA factors.')
        setFactorsLoading(false)
        return
      }
      const verified = data.totp.find((f) => f.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
      } else {
        setError('No verified MFA factor found.')
      }
      setFactorsLoading(false)
    }
    loadFactors()
  }, [])

  const getRedirectUrl = useCallback((): string => {
    const next = searchParams.get('next')
    // Validate redirect: must start with / and not start with // (open redirect prevention)
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return next
    }
    return '/admin'
  }, [searchParams])

  const handleTotpVerify = useCallback(async (totpCode: string) => {
    if (!factorId || totpCode.length !== 6) return
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: totpCode,
    })

    if (error) {
      setError('Invalid code. Please try again.')
      setLoading(false)
      setCode('')
      return
    }

    router.push(getRedirectUrl())
    router.refresh()
  }, [factorId, router, getRedirectUrl])

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && factorId && !loading) {
      handleTotpVerify(code)
    }
  }, [code, factorId, loading, handleTotpVerify])

  async function handleBackupCodeVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!backupCode.trim()) return
    setError(null)
    setLoading(true)

    const result = await verifyBackupCodeAction(backupCode.trim())
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(getRedirectUrl())
    router.refresh()
  }

  if (factorsLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <ShieldCheck className="w-10 h-10 text-gold mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <ShieldCheck className="w-10 h-10 text-gold mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the code from your authenticator app'}
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center mb-4">{error}</p>
        )}

        {useBackupCode ? (
          <form onSubmit={handleBackupCodeVerify} className="space-y-4">
            <div>
              <label htmlFor="backupCode" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Backup code
              </label>
              <input
                id="backupCode"
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-center font-mono tracking-wider placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                placeholder="xxxx-xxxx"
                autoFocus
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={!backupCode.trim() || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? 'Verifying...' : 'Verify backup code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(false)
                setBackupCode('')
                setError(null)
              }}
              className="w-full text-center text-sm text-gold hover:underline"
            >
              Use authenticator app instead
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="totpCode" className="block text-sm font-medium text-muted-foreground mb-1.5">
                6-digit code
              </label>
              <input
                id="totpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-3 rounded-md bg-muted border border-border text-foreground text-center text-2xl font-mono tracking-[0.5em] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                placeholder="000000"
                autoFocus
                autoComplete="one-time-code"
                disabled={loading}
              />
            </div>
            {loading && (
              <p className="text-sm text-muted-foreground text-center">Verifying...</p>
            )}
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(true)
                setCode('')
                setError(null)
              }}
              className="w-full text-center text-sm text-gold hover:underline"
            >
              Use a backup code instead
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
