import {
  LayoutDashboard,
  Plus,
  Settings,
  Shield,
  Users,
  FlaskConical,
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'

export interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

/** App-section links (dashboard, create, settings) */
export const appLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/create', label: 'Create', icon: Plus },
  { href: '/settings/account', label: 'Settings', icon: Settings },
]

/** Admin-section primary nav */
export const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/settings', label: 'Platform Settings', icon: Settings },
  { href: '/admin/test', label: 'AI Test Lab', icon: FlaskConical },
]

/** Admin secondary links (cross-section navigation) */
export const adminSecondaryLinks: NavLink[] = [
  { href: '/dashboard', label: 'Back to App', icon: ArrowLeft },
  { href: '/', label: 'View Landing Page', icon: ExternalLink },
]

/** Admin link shown to admins in the app-section header */
export const adminAppLink: NavLink = {
  href: '/admin',
  label: 'Admin',
  icon: Shield,
}
