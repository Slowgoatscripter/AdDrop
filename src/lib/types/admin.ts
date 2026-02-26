export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: 'admin' | 'user'
  created_at: string
  rate_limit_exempt?: boolean
  subscription_tier?: 'free' | 'pro' | 'enterprise'
  stripe_customer_id?: string
  subscription_status?: string
  current_period_end?: string
}

export interface AdminStats {
  totalUsers: number
  adminCount: number
  recentSignups: number
}
