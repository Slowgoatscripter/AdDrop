'use client'

import { useEffect, useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { X, LogOut, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  appLinks,
  adminLinks,
  adminSecondaryLinks,
  adminAppLink,
  type NavLink,
} from './nav-links'

interface MobileDrawerUser {
  displayName?: string
  email: string
  role: string
}

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  variant: 'landing' | 'app' | 'admin'
  user?: MobileDrawerUser | null
  onFeedbackClick?: () => void
}

function getInitials(displayName?: string, email?: string): string {
  if (displayName) return displayName.charAt(0).toUpperCase()
  if (email) return email.charAt(0).toUpperCase()
  return '?'
}

function DrawerLink({
  link,
  isActive,
  onClose,
}: {
  link: NavLink
  isActive: boolean
  onClose: () => void
}) {
  return (
    <Link
      href={link.href}
      onClick={onClose}
      className={`flex items-center gap-3 px-4 py-3 text-sm rounded-md transition-colors min-h-[44px] ${
        isActive
          ? 'text-gold bg-gold/5 border-l-2 border-gold'
          : 'text-cream/80 hover:text-cream hover:bg-surface'
      }`}
    >
      <link.icon className="w-4 h-4" />
      {link.label}
    </Link>
  )
}

export function MobileDrawer({ open, onClose, variant, user, onFeedbackClick }: MobileDrawerProps) {
  const [showNewBadge, setShowNewBadge] = useState(false)
  const pathname = usePathname()
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

  // Close on route change
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Body scroll lock + inert
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const main = document.querySelector('main')
    if (main) main.setAttribute('inert', '')
    return () => {
      document.body.style.overflow = ''
      if (main) main.removeAttribute('inert')
    }
  }, [open])

  const handleSignOut = useCallback(async () => {
    onClose()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }, [onClose, router])

  const isActive = (href: string) => {
    if (href === '/admin' && pathname === '/admin') return true
    if (href === '/dashboard' && pathname === '/dashboard') return true
    if (href !== '/admin' && href !== '/dashboard' && pathname.startsWith(href)) return true
    return false
  }

  // Determine nav links based on variant
  let links: NavLink[] = []
  let secondaryLinks: NavLink[] = []
  const isAdmin = user?.role === 'admin'

  if (variant === 'app') {
    links = [...appLinks]
    if (isAdmin) links.push(adminAppLink)
  } else if (variant === 'admin') {
    links = adminLinks
    secondaryLinks = adminSecondaryLinks
  }

  const slideVariants = prefersReduced
    ? { closed: { opacity: 0 }, open: { opacity: 1 } }
    : { closed: { x: '100%' }, open: { x: 0 } }

  const backdropVariants = prefersReduced
    ? { closed: { opacity: 0 }, open: { opacity: 1 } }
    : { closed: { opacity: 0 }, open: { opacity: 1 } }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial="closed"
            animate="open"
            exit="closed"
            variants={backdropVariants}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer-panel"
            initial="closed"
            animate="open"
            exit="closed"
            variants={slideVariants}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { type: 'tween', duration: 0.3, ease: 'easeOut' }
            }
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-background border-l border-border flex flex-col md:hidden overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            {/* Header with close */}
            <div className="flex items-center justify-between p-4 border-b border-border min-h-[56px]">
              <Link href="/" onClick={onClose} className="flex items-center">
                <span className="text-xl font-bold text-foreground">Ad</span>
                <span className="text-xl font-bold italic text-gold font-serif">Drop</span>
              </Link>
              <button
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center rounded-md text-cream/60 hover:text-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User card (authenticated) */}
            {user && (
              <div className="px-4 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center justify-center text-sm font-medium shrink-0">
                    {getInitials(user.displayName, user.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cream truncate">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-xs text-cream/50 truncate">{user.email}</p>
                    <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-gold">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation links */}
            <div className="flex-1 py-2">
              {/* Landing anonymous: CTA + auth links */}
              {variant === 'landing' && !user && (
                <>
                  <div className="px-4 py-2">
                    <Link
                      href="/create"
                      onClick={onClose}
                      className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium border border-gold/60 text-gold hover:bg-gold hover:text-background rounded-full transition-all min-h-[44px]"
                    >
                      Start Creating Ads
                    </Link>
                  </div>
                  <div className="border-t border-border mt-2 pt-2">
                    <Link
                      href="/login"
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-cream/80 hover:text-cream hover:bg-surface transition-colors min-h-[44px]"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-cream/80 hover:text-cream hover:bg-surface transition-colors min-h-[44px]"
                    >
                      Sign Up
                    </Link>
                  </div>
                </>
              )}

              {/* Landing authenticated */}
              {variant === 'landing' && user && (
                <>
                  <div className="px-4 py-2">
                    <Link
                      href={isAdmin ? '/admin' : '/dashboard'}
                      onClick={onClose}
                      className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium border border-gold/60 text-gold hover:bg-gold hover:text-background rounded-full transition-all min-h-[44px]"
                    >
                      {isAdmin ? 'Admin Panel' : 'Dashboard'}
                    </Link>
                  </div>
                </>
              )}

              {/* App / Admin nav links */}
              {links.length > 0 && (
                <div className="px-2">
                  {links.map((link) => (
                    <DrawerLink
                      key={link.href}
                      link={link}
                      isActive={isActive(link.href)}
                      onClose={onClose}
                    />
                  ))}
                </div>
              )}

              {/* Admin secondary links */}
              {secondaryLinks.length > 0 && (
                <div className="border-t border-border mt-2 pt-2 px-2">
                  {secondaryLinks.map((link) => (
                    <DrawerLink
                      key={link.href}
                      link={link}
                      isActive={false}
                      onClose={onClose}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Feedback + Sign out (authenticated) */}
            {user && (
              <div className="border-t border-border p-4 space-y-1">
                {onFeedbackClick && (
                  <button
                    onClick={() => {
                      onClose()
                      localStorage.setItem('feedback-fab-seen', 'true')
                      setShowNewBadge(false)
                      onFeedbackClick()
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-cream/80 hover:text-cream hover:bg-surface rounded-md transition-colors w-full min-h-[44px]"
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
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-cream/80 hover:text-cream hover:bg-surface rounded-md transition-colors w-full min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
