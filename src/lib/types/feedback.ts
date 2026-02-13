export type FeedbackType = 'bug' | 'feature' | 'general';
export type FeedbackStatus = 'new' | 'reviewing' | 'resolved' | 'dismissed';

export interface FeedbackItem {
  id: string;
  user_id: string;
  type: FeedbackType;
  description: string;
  status: FeedbackStatus;
  page_url?: string;
  screenshot_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackWithUser extends FeedbackItem {
  user?: {
    display_name: string | null;
    email: string;
  } | null;
}
