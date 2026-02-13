'use client'

import { FeedbackProvider } from './feedback-provider'
import { FeedbackFAB } from './feedback-fab'
import { FeedbackModal } from './feedback-modal'

export function FeedbackShell({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      {children}
      <FeedbackFAB />
      <FeedbackModal />
    </FeedbackProvider>
  )
}
