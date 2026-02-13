'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from './user-menu'
import { MobileDrawer } from './mobile-drawer'
import { appLinks, adminLinks, adminAppLink, adminSecondaryLinks, type NavLink } from './nav-links'
import { BetaBadge } from '@/components/ui/beta-badge'
import { useFeedbackOptional } from '@/components/feedback/feedback-provider'

interface AppHeaderUser {
  displayName?: string
  email: string
  role: string
}

interface AppHeaderProps {
  variant: 'landing' | 'app' | 'admin' | 'auth'
  user?: AppHeaderUser | null
}

export function AppHeader({ variant, user: userProp }: AppHeaderProps) {
  const pathname = usePathname()
  const prefersReduced = useReducedMotion()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const feedback = useFeedbackOptional()

  // Client-side auth fetch for landing variant (no server layout provides user)
  const [clientUser, setClientUser] = useState<AppHeaderUser | null>(null)
  const user = userProp !== undefined ? userProp : clientUser

  useEffect(() => {
    if (variant !== 'landing' || userProp !== undefined) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      // Fetch profile for role + display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, role')
        .eq('id', data.user.id)
        .single()
      setClientUser({
        displayName: profile?.display_name ?? undefined,
        email: data.user.email ?? '',
        role: profile?.role ?? 'user',
      })
    })
  }, [variant, userProp])

  // Scroll detection for landing glass effect
  useEffect(() => {
    if (variant !== 'landing') return
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [variant])

  const isActive = (href: string) => {
    if (href === '/admin' && pathname === '/admin') return true
    if (href === '/dashboard' && pathname === '/dashboard') return true
    if (href === '/settings/account' && pathname.startsWith('/settings')) return true
    if (href === '/create' && pathname === '/create') return true
    if (
      href !== '/admin' &&
      href !== '/dashboard' &&
      href !== '/settings/account' &&
      href !== '/create' &&
      pathname.startsWith(href)
    )
      return true
    return false
  }

  const isAdmin = user?.role === 'admin'

  // --- AUTH VARIANT: logo only, centered ---
  if (variant === 'auth') {
    return (
      <header className="h-14 flex items-center justify-center px-6">
        <Link href="/" className="flex items-center min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm">
          <span className="text-xl font-bold text-foreground">Ad</span>
          <span className="text-xl font-bold italic text-gold font-serif">Drop</span>
        </Link>
      </header>
    )
  }

  // --- Determine header classes by variant ---
  let headerClasses = 'flex items-center justify-between px-6 z-30'

  if (variant === 'landing') {
    headerClasses += ` fixed top-0 left-0 right-0 z-50 h-14 md:h-[72px] transition-all duration-300 ${
      isScrolled
        ? 'bg-background/80 backdrop-blur-lg border-b border-gold/10'
        : 'bg-transparent border-b border-transparent'
    }`
  } else if (variant === 'app') {
    headerClasses += ' h-14 bg-background border-b border-border'
  } else if (variant === 'admin') {
    headerClasses += ' h-14 bg-card border-b border-border border-l-2 border-l-gold'
  }

  // --- Determine nav links ---
  let navLinks: NavLink[] = []
  if (variant === 'app') {
    navLinks = [...appLinks]
    if (isAdmin) navLinks.push(adminAppLink)
  } else if (variant === 'admin') {
    navLinks = adminLinks
  }

  // --- Logo destination ---
  const logoHref =
    variant === 'admin' ? '/admin' : variant === 'app' ? '/dashboard' : '/'

  // --- Drawer variant (no drawer for auth) ---
  const drawerVariant = variant === 'landing' ? 'landing' : variant === 'admin' ? 'admin' : 'app'

  return (
    <>
      <HeaderTag variant={variant} className={headerClasses} prefersReduced={prefersReduced}>
        {/* Left: Logo */}
        <Link
          href={logoHref}
          className="flex items-center min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
        >
          <span className="text-xl font-bold text-foreground">Ad</span>
          <span className="text-xl font-bold italic text-gold font-serif">Drop</span>
        </Link>
        {variant === 'app' && <BetaBadge />}

        {/* Center/Right: Desktop nav + actions */}
        <div className="hidden md:flex items-center gap-1">
          {/* Desktop nav links */}
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative px-3 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm ${
                  active ? 'text-gold' : 'text-cream/60 hover:text-cream'
                }`}
              >
                {link.label}
                {/* Active underline */}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-gold"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                )}
              </Link>
            )
          })}

          {/* Admin secondary links (desktop) */}
          {variant === 'admin' &&
            adminSecondaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-cream/60 hover:text-cream transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            ))}

          {/* Landing anonymous: Log In + Sign Up */}
          {variant === 'landing' && !user && (
            <>
              <Link
                href="/login"
                className="text-sm text-cream/80 hover:text-gold transition-colors min-h-[44px] flex items-center px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-sm border border-gold/60 text-gold hover:bg-gold hover:text-background px-5 py-2 min-h-[44px] rounded-full transition-all flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ml-2"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Landing authenticated: Dashboard/Admin button */}
          {variant === 'landing' && user && (
            <Link
              href={isAdmin ? '/admin' : '/dashboard'}
              className="text-sm border border-gold/60 text-gold hover:bg-gold hover:text-background px-5 py-2 min-h-[44px] rounded-full transition-all flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ml-2"
            >
              {isAdmin ? 'Admin Panel' : 'Dashboard'}
            </Link>
          )}

          {/* User menu dropdown (app / admin) */}
          {(variant === 'app' || variant === 'admin') && user && (
            <div className="ml-2">
              <UserMenu user={user} showAdminLink={variant === 'app' && isAdmin} onFeedbackClick={feedback?.open} />
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-md text-cream/80 hover:text-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
        >
          <Menu className="w-5 h-5" />
        </button>
      </HeaderTag>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant={drawerVariant}
        user={user}
        onFeedbackClick={feedback?.open}
      />
    </>
  )
}

/** Landing variant uses motion.header for entrance animation; others use plain header */
function HeaderTag({
  variant,
  className,
  prefersReduced,
  children,
}: {
  variant: string
  className: string
  prefersReduced: boolean | null
  children: React.ReactNode
}) {
  if (variant === 'landing') {
    return (
      <motion.header
        aria-label="Main navigation"
        className={className}
        initial={prefersReduced ? undefined : { opacity: 0 }}
        animate={prefersReduced ? undefined : { opacity: 1 }}
        transition={prefersReduced ? undefined : { delay: 0.5, duration: 0.5 }}
      >
        {children}
      </motion.header>
    )
  }
  return (
    <header aria-label="Main navigation" className={className}>
      {children}
    </header>
  )
}
