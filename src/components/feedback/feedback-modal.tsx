'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Loader2, CheckCircle2, Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useFeedback } from './feedback-provider'
import { FeedbackTypeSelector } from './feedback-type-selector'
import { Textarea } from '@/components/ui/textarea'
import { submitFeedback } from '@/lib/feedback/actions'
import type { FeedbackType } from '@/lib/types/feedback'

const placeholders: Record<FeedbackType, string> = {
  bug: 'What happened? What did you expect to happen?',
  feature: 'What would you like to see? How would it help?',
  general: "What's on your mind?",
}

type ModalState = 'form' | 'submitting' | 'success' | 'error'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function FeedbackModal() {
  const { isOpen, close } = useFeedback()
  const [type, setType] = useState<FeedbackType | null>(null)
  const [description, setDescription] = useState('')
  const [state, setState] = useState<ModalState>('form')
  const [errorMessage, setErrorMessage] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prefersReduced = useReducedMotion()
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const firstFocusRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const isValid = type !== null && description.trim().length >= 10

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay so exit animation plays with current content
      const t = setTimeout(() => {
        setType(null)
        setDescription('')
        setState('form')
        setErrorMessage('')
        clearScreenshot()
      }, 300)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Clear auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && state !== 'submitting') close()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, close, state])

  const clearScreenshot = useCallback(() => {
    setScreenshot(null)
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview)
      setScreenshotPreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [screenshotPreview])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Only PNG, JPEG, and WebP images are allowed.')
        e.target.value = ''
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('Screenshot must be under 5 MB.')
        e.target.value = ''
        return
      }

      // Revoke previous preview URL if any
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview)
      }

      setScreenshot(file)
      setScreenshotPreview(URL.createObjectURL(file))
    },
    [screenshotPreview]
  )

  const handleSubmit = useCallback(async () => {
    if (!type || description.trim().length < 10) return

    setState('submitting')
    setErrorMessage('')

    const formData = new FormData()
    formData.set('type', type)
    formData.set('description', description.trim())
    formData.set(
      'pageUrl',
      typeof window !== 'undefined' ? window.location.pathname : ''
    )
    formData.set(
      'browserInfo',
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    )
    if (screenshot) {
      formData.set('screenshot', screenshot)
    }

    const result = await submitFeedback(formData)

    if (result.error) {
      setState('error')
      setErrorMessage(result.error)
      return
    }

    setState('success')
    toast.success('Feedback sent — thank you!')

    closeTimerRef.current = setTimeout(() => {
      close()
    }, 2500)
  }, [type, description, screenshot, close])

  const backdropVariants = prefersReduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1 } }

  const panelVariants = prefersReduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0 },
      }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="feedback-backdrop"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={state !== 'submitting' ? close : undefined}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="feedback-panel"
            ref={modalRef}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={panelVariants}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { duration: 0.2, ease: 'easeOut' }
            }
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md bg-card border border-border rounded-xl shadow-2xl shadow-black/40 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            {state === 'success' ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <motion.div
                  initial={prefersReduced ? {} : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: 200,
                          damping: 10,
                          delay: 0.1,
                        }
                  }
                >
                  <CheckCircle2 className="w-12 h-12 text-green-400 mb-4" />
                </motion.div>
                <h3 className="text-lg font-bold font-serif text-cream mb-1">
                  Thank you!
                </h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll review your feedback shortly.
                </p>
                <button
                  onClick={close}
                  className="mt-6 text-sm text-gold hover:text-gold-bright transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2
                    id="feedback-title"
                    className="text-lg font-bold font-serif text-cream"
                  >
                    Send Feedback
                  </h2>
                  <button
                    ref={firstFocusRef}
                    onClick={close}
                    disabled={state === 'submitting'}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-cream/60 hover:text-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
                    aria-label="Close feedback form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                  {/* Type selector */}
                  <div>
                    <label className="block text-sm font-medium text-cream/80 mb-2">
                      What type of feedback?
                    </label>
                    <FeedbackTypeSelector
                      value={type}
                      onChange={setType}
                      disabled={state === 'submitting'}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="feedback-description"
                      className="block text-sm font-medium text-cream/80 mb-2"
                    >
                      Tell us more...
                    </label>
                    <Textarea
                      id="feedback-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        type ? placeholders[type] : 'Select a type above first...'
                      }
                      disabled={state === 'submitting'}
                      rows={4}
                      className="bg-surface border-border focus-visible:ring-gold focus-visible:border-gold/50 resize-none"
                    />
                    {description.length > 0 && description.trim().length < 10 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {10 - description.trim().length} more characters needed
                      </p>
                    )}
                  </div>

                  {/* Screenshot attachment */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileSelect}
                      disabled={state === 'submitting'}
                      className="hidden"
                      aria-label="Attach screenshot"
                    />

                    {screenshotPreview ? (
                      <div className="flex items-start gap-3 rounded-md bg-surface border border-border p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshotPreview}
                          alt="Screenshot preview"
                          className="rounded max-w-[200px] max-h-[120px] object-contain"
                        />
                        <button
                          type="button"
                          onClick={clearScreenshot}
                          disabled={state === 'submitting'}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors mt-1 disabled:opacity-50"
                          aria-label="Remove screenshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={state === 'submitting'}
                        className="flex items-center gap-2 text-xs text-cream/50 hover:text-cream/80 transition-colors disabled:opacity-50"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        Attach screenshot (optional)
                      </button>
                    )}
                  </div>

                  {/* Error message */}
                  {state === 'error' && errorMessage && (
                    <p className="text-sm text-red-400">{errorMessage}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 space-y-3">
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid || state === 'submitting'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-full bg-gold text-background hover:bg-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {state === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Feedback'
                    )}
                  </button>

                  <p className="text-[11px] text-center text-muted-foreground">
                    Includes your current page URL and browser info to help us
                    debug.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
