'use client'

import { MessageSquarePlus } from 'lucide-react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useFeedback } from './feedback-provider'
import { useEffect, useState, useCallback } from 'react'

export function FeedbackFAB() {
  const { open } = useFeedback()
  const prefersReduced = useReducedMotion()
  const [seen, setSeen] = useState(true) // default true to avoid flash
  const [showCallout, setShowCallout] = useState(false)
  const [platform, setPlatform] = useState<'mac' | 'other'>('other')

  // Check if user has seen the FAB before
  useEffect(() => {
    const hasSeenFAB = localStorage.getItem('feedback-fab-seen')
    setSeen(!!hasSeenFAB)

    // Set platform for keyboard shortcut display
    if (typeof navigator !== 'undefined') {
      const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform)
      setPlatform(isMac ? 'mac' : 'other')
    }
  }, [])

  // Handler functions (defined before useEffects that use them)
  const handleFeedbackClick = useCallback(() => {
    localStorage.setItem('feedback-fab-seen', 'true')
    setSeen(true)
    setShowCallout(false)
    open()
  }, [open])

  const handleDismissCallout = useCallback(() => {
    localStorage.setItem('feedback-fab-seen', 'true')
    setSeen(true)
    setShowCallout(false)
  }, [])

  // Show callout after delay if not seen
  useEffect(() => {
    if (!seen && !prefersReduced) {
      const showTimer = setTimeout(() => {
        setShowCallout(true)
      }, 1500)

      const hideTimer = setTimeout(() => {
        setShowCallout(false)
      }, 1500 + 8000) // 1.5s delay + 8s display

      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [seen, prefersReduced])

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        if (!seen) {
          handleFeedbackClick()
        } else {
          open()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, seen, handleFeedbackClick])

  const shortcutText = platform === 'mac' ? '⌘⇧F' : 'Ctrl+Shift+F'

  // Check if user prefers reduced motion for pulse
  const shouldPulse = !seen && !prefersReduced

  return (
    <>
      {/* First-visit callout */}
      <AnimatePresence>
        {showCallout && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-36 md:bottom-6 right-20 md:right-20 z-40 bg-foreground text-background px-4 py-2 rounded-lg shadow-xl max-w-[200px] pointer-events-auto"
          >
            <button
              onClick={handleDismissCallout}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gold text-background flex items-center justify-center text-xs hover:scale-110 transition-transform"
              aria-label="Dismiss"
            >
              ×
            </button>
            <p className="text-sm">Have feedback? Tap here anytime.</p>
            {/* Caret pointing to FAB */}
            <div className="absolute top-1/2 -right-2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-foreground -translate-y-1/2 md:hidden" />
            <div className="hidden md:block absolute bottom-3 -right-2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReduced ? { duration: 0 } : { delay: 0.3, duration: 0.3 }}
        onClick={handleFeedbackClick}
        className={`group fixed bottom-20 md:bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gold text-background flex items-center justify-center shadow-lg hover:scale-105 hover:shadow-xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background ${shouldPulse ? 'animate-pulse-gold' : ''}`}
        aria-label="Send feedback"
        aria-describedby="feedback-tooltip"
      >
        <MessageSquarePlus className="w-6 h-6" />

        {/* Tooltip */}
        <span
          id="feedback-tooltip"
          role="tooltip"
          className="absolute right-full mr-3 px-3 py-1.5 bg-foreground text-background text-sm rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        >
          Send Feedback ({shortcutText})
        </span>
      </motion.button>
    </>
  )
}
