export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: 'admin' | 'user'
  created_at: string
}

export interface AdminStats {
  totalUsers: number
  adminCount: number
  recentSignups: number
}
