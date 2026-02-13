'use client'

import { useState, useEffect } from 'react'
import { Save, Mail } from 'lucide-react'
import { getProfile, updateProfile, requestEmailChange } from './actions'

export default function AccountPage() {
  const [displayName, setDisplayName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [showEmailChange, setShowEmailChange] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailChanging, setEmailChanging] = useState(false)
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const profile = await getProfile()
        setDisplayName(profile.display_name || '')
        setCompany(profile.company || '')
        setPhone(profile.phone || '')
        setEmail(profile.email || '')
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load profile.' })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await updateProfile({
        display_name: displayName,
        company,
        phone,
      })
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile.' })
    }
    setSaving(false)
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    setEmailChanging(true)
    setEmailMessage(null)

    try {
      await requestEmailChange(newEmail)
      setEmailMessage({
        type: 'success',
        text: 'Confirmation email sent to both your current and new address.',
      })
      setNewEmail('')
      setShowEmailChange(false)
    } catch (err) {
      setEmailMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change email.' })
    }
    setEmailChanging(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Account</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-muted rounded-md" />
          <div className="h-10 bg-muted rounded-md" />
          <div className="h-10 bg-muted rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile information</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-muted-foreground mb-1.5">
            Display name
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
          <label htmlFor="company" className="block text-sm font-medium text-muted-foreground mb-1.5">
            Company
          </label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
            placeholder="Your company"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-1.5">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
            placeholder="+1 (555) 000-0000"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-destructive' : 'text-green-500'}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      <div className="border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-1">Email address</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your current email is <span className="text-foreground font-medium">{email}</span>
        </p>

        {emailMessage && (
          <p className={`text-sm mb-4 ${emailMessage.type === 'error' ? 'text-destructive' : 'text-green-500'}`}>
            {emailMessage.text}
          </p>
        )}

        {showEmailChange ? (
          <form onSubmit={handleEmailChange} className="space-y-3">
            <div>
              <label htmlFor="newEmail" className="block text-sm font-medium text-muted-foreground mb-1.5">
                New email address
              </label>
              <input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                placeholder="new@example.com"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={emailChanging}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                {emailChanging ? 'Sending...' : 'Send confirmation'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailChange(false)
                  setNewEmail('')
                  setEmailMessage(null)
                }}
                className="px-4 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowEmailChange(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Mail className="w-4 h-4" />
            Change email
          </button>
        )}
      </div>
    </div>
  )
}
