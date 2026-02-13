'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface FeedbackContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return ctx
}

/** Safe version that returns null when used outside FeedbackProvider */
export function useFeedbackOptional() {
  return useContext(FeedbackContext)
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <FeedbackContext.Provider value={{ isOpen, open, close }}>
      {children}
    </FeedbackContext.Provider>
  )
}
