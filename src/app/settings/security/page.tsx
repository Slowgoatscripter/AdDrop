'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldCheck, ShieldOff, Copy, Download, RefreshCw, AlertTriangle, Info } from 'lucide-react'
import {
  getMfaStatus,
  enrollMfa,
  verifyMfaEnrollment,
  unenrollMfa,
  generateNewBackupCodes,
} from './actions'

type MfaState = 'loading' | 'not_enrolled' | 'enrolling' | 'verifying' | 'showing_backup_codes' | 'enrolled'

interface Factor {
  id: string
  friendly_name?: string
  factor_type: string
  status: string
}

export default function SecurityPage() {
  const [state, setState] = useState<MfaState>('loading')
  const [factors, setFactors] = useState<Factor[]>([])
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  // Enrollment state
  const [enrollmentId, setEnrollmentId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Backup codes
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  // Unenroll state
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disabling, setDisabling] = useState(false)

  // Error/message
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    const result = await getMfaStatus()
    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to load MFA status.')
      setState('not_enrolled')
      return
    }
    setFactors(result.data.factors)
    setBackupCodesRemaining(result.data.backupCodesRemaining)
    setIsAdmin(result.data.isAdmin)
    const verifiedFactor = result.data.factors.find((f) => f.status === 'verified')
    setState(verifiedFactor ? 'enrolled' : 'not_enrolled')
  }

  async function handleEnroll() {
    setError(null)
    const result = await enrollMfa()
    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to start enrollment.')
      return
    }
    setEnrollmentId(result.data.id)
    setQrCode(result.data.totp.qr_code)
    setSecret(result.data.totp.secret)
    setState('enrolling')
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setVerifying(true)

    const verifyResult = await verifyMfaEnrollment(enrollmentId, verifyCode)
    if (verifyResult.error) {
      setError(verifyResult.error)
      setVerifying(false)
      return
    }

    // After successful enrollment, generate backup codes
    const codesResult = await generateNewBackupCodes()
    if (codesResult.data) {
      setBackupCodes(codesResult.data)
    }
    setVerifying(false)
    setState('showing_backup_codes')
  }

  async function handleRegenerateBackupCodes() {
    setError(null)
    const result = await generateNewBackupCodes()
    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to generate backup codes.')
      return
    }
    setBackupCodes(result.data)
    setState('showing_backup_codes')
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDisabling(true)

    const verifiedFactor = factors.find((f) => f.status === 'verified')
    if (!verifiedFactor) {
      setError('No active MFA factor found.')
      setDisabling(false)
      return
    }

    const result = await unenrollMfa(verifiedFactor.id)
    if (result.error) {
      setError(result.error)
      setDisabling(false)
      return
    }
    setShowDisableConfirm(false)
    setDisableCode('')
    setFactors([])
    setState('not_enrolled')
    setDisabling(false)
  }

  function handleCopyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadBackupCodes() {
    const content = backupCodes.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'addrop-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDismissBackupCodes() {
    setBackupCodes([])
    loadStatus()
  }

  if (state === 'loading') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Security</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-muted rounded-md" />
          <div className="h-10 bg-muted rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage two-factor authentication</p>
      </div>

      {isAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-gold/5 border border-gold/20">
          <Info className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <p className="text-sm text-gold">
            MFA is required for admin accounts. You must keep two-factor authentication enabled.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Not enrolled */}
      {state === 'not_enrolled' && (
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h2>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account with a TOTP authenticator app.
              </p>
            </div>
          </div>
          <button
            onClick={handleEnroll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Set up two-factor authentication
          </button>
        </div>
      )}

      {/* Enrolling - show QR code */}
      {state === 'enrolling' && (
        <div className="border border-border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Scan QR Code</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>

          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Can&apos;t scan? Enter this code manually:
            </p>
            <code className="block p-3 bg-muted rounded-md text-sm text-foreground font-mono break-all select-all">
              {secret}
            </code>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="verifyCode" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Enter the 6-digit code from your app
              </label>
              <input
                id="verifyCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                className="w-full max-w-[200px] px-3 py-2 rounded-md bg-muted border border-border text-foreground text-center text-lg font-mono tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                placeholder="000000"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={verifyCode.length !== 6 || verifying}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? 'Verifying...' : 'Verify and enable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setState('not_enrolled')
                  setVerifyCode('')
                  setError(null)
                }}
                className="px-4 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Showing backup codes */}
      {state === 'showing_backup_codes' && backupCodes.length > 0 && (
        <div className="border border-border rounded-lg p-6 space-y-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Save Your Backup Codes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Save these codes in a safe place. They won&apos;t be shown again. Each code can only be used once.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
            {backupCodes.map((code, i) => (
              <code key={i} className="text-sm font-mono text-foreground text-center py-1">
                {code}
              </code>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyBackupCodes}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy all'}
            </button>
            <button
              onClick={handleDownloadBackupCodes}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          <button
            onClick={handleDismissBackupCodes}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
          >
            I&apos;ve saved my codes
          </button>
        </div>
      )}

      {/* Enrolled */}
      {state === 'enrolled' && (
        <div className="border border-border rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Two-factor authentication is enabled</h2>
              <p className="text-sm text-muted-foreground">
                Your account is protected with TOTP two-factor authentication.
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Backup codes remaining: <span className="text-foreground font-medium">{backupCodesRemaining} of 8</span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleRegenerateBackupCodes}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate backup codes
            </button>

            {!showDisableConfirm ? (
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-destructive/30 text-sm text-destructive hover:bg-destructive/5 transition-colors"
              >
                <ShieldOff className="w-4 h-4" />
                Disable MFA
              </button>
            ) : (
              <form onSubmit={handleDisable} className="flex items-end gap-3">
                <div>
                  <label htmlFor="disableCode" className="block text-xs text-muted-foreground mb-1">
                    Enter TOTP code to confirm
                  </label>
                  <input
                    id="disableCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                    className="w-[140px] px-3 py-2 rounded-md bg-muted border border-border text-foreground text-center font-mono tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                    placeholder="000000"
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
                <button
                  type="submit"
                  disabled={disableCode.length !== 6 || disabling}
                  className="px-4 py-2 rounded-md bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disabling ? 'Disabling...' : 'Confirm disable'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableConfirm(false)
                    setDisableCode('')
                  }}
                  className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
