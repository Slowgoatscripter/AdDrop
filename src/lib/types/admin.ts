export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: 'admin' | 'user'
  created_at: string
  rate_limit_exempt?: boolean
}

export interface AdminStats {
  totalUsers: number
  adminCount: number
  recentSignups: number
}
