'use client'

import { useEffect, useRef, useCallback } from 'react'

interface CaptchaProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }
    const existing = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject())
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject()
    document.head.appendChild(script)
  })
}

export function Captcha({ onVerify, onError, onExpire }: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const stableOnVerify = useCallback((token: string) => onVerify(token), [onVerify])
  const stableOnError = useCallback(() => onError?.(), [onError])
  const stableOnExpire = useCallback(() => onExpire?.(), [onExpire])

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: stableOnVerify,
          'error-callback': stableOnError,
          'expired-callback': stableOnExpire,
          theme: 'dark',
        })
      })
      .catch(() => {
        // Turnstile failed to load — silently degrade
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey, stableOnVerify, stableOnError, stableOnExpire])

  if (!siteKey) return null

  return <div ref={containerRef} className="flex justify-center" />
}
