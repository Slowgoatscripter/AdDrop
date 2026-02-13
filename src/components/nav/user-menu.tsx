'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Settings, Shield, LogOut, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  user: { displayName?: string; email: string; role: string }
  showAdminLink?: boolean
  onFeedbackClick?: () => void
}

function getInitials(displayName?: string, email?: string): string {
  if (displayName) return displayName.charAt(0).toUpperCase()
  if (email) return email.charAt(0).toUpperCase()
  return '?'
}

export function UserMenu({ user, showAdminLink, onFeedbackClick }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [showNewBadge, setShowNewBadge] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const prefersReduced = useReducedMotion()

  // Check localStorage for "New" badge visibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('feedback-fab-seen')
      if (!seen) {
        setShowNewBadge(true)
      }
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const handleSignOut = useCallback(async () => {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }, [router])

  const initials = getInitials(user.displayName, user.email)
  const displayLabel = user.displayName || user.email

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
          open ? 'text-gold' : 'text-cream/80 hover:text-cream'
        }`}
      >
        {/* Initials avatar */}
        <span className="w-8 h-8 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center justify-center text-sm font-medium">
          {initials}
        </span>
        <span className="text-sm font-medium hidden lg:inline max-w-[120px] truncate">
          {displayLabel}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-60 bg-card border border-border rounded-lg shadow-lg shadow-black/20 overflow-hidden z-50"
            role="menu"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-cream truncate">{displayLabel}</p>
              <p className="text-xs text-cream/50 truncate mt-0.5">{user.email}</p>
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-gold">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                {user.role}
              </span>
            </div>

            {/* Links */}
            <div className="py-1">
              <Link
                href="/settings/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-cream/80 hover:text-cream hover:bg-surface transition-colors"
                role="menuitem"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>

              {showAdminLink && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-cream/80 hover:text-cream hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}

              {onFeedbackClick && (
                <button
                  onClick={() => {
                    setOpen(false)
                    localStorage.setItem('feedback-fab-seen', 'true')
                    setShowNewBadge(false)
                    onFeedbackClick()
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-cream/80 hover:text-cream hover:bg-surface transition-colors w-full"
                  role="menuitem"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Feedback
                  {showNewBadge && (
                    <span className="ml-auto text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Sign out */}
            <div className="border-t border-border py-1">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-cream/80 hover:text-cream hover:bg-surface transition-colors w-full"
                role="menuitem"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
