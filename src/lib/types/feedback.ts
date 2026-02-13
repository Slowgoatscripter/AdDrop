export type FeedbackType = 'bug' | 'feature' | 'general'
export type FeedbackStatus = 'new' | 'reviewing' | 'resolved' | 'closed'

export interface Feedback {
  id: string
  user_id: string
  type: FeedbackType
  description: string
  page_url: string | null
  browser_info: string | null
  screenshot_url: string | null
  status: FeedbackStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface FeedbackWithUser extends Feedback {
  user: {
    display_name: string | null
    email: string
  }
}

export interface FeedbackFilters {
  status?: FeedbackStatus | 'all'
  type?: FeedbackType | 'all'
  page?: number
}

export interface FeedbackSubmission {
  type: FeedbackType
  description: string
  pageUrl: string
  browserInfo: string
  screenshotFile?: File
}
