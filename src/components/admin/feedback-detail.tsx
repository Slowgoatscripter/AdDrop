'use client'

import { useState, useTransition, useEffect } from 'react'
import { updateFeedbackStatus } from '@/app/admin/feedback/actions'
import { getScreenshotSignedUrl } from '@/lib/feedback/actions'
import type { FeedbackWithUser, FeedbackStatus } from '@/lib/types/feedback'
import { Bug, Sparkles, MessageCircle, ImageIcon } from 'lucide-react'

const statusOptions: { value: FeedbackStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const typeConfig = {
  bug: { icon: Bug, label: 'Bug Report', color: 'text-red-400' },
  feature: { icon: Sparkles, label: 'Feature Request', color: 'text-gold' },
  general: { icon: MessageCircle, label: 'General Feedback', color: 'text-cream' },
}

const statusColors: Record<FeedbackStatus, string> = {
  new: 'text-gold',
  reviewing: 'text-blue-400',
  resolved: 'text-green-400',
  closed: 'text-muted-foreground',
}

interface FeedbackDetailProps {
  item: FeedbackWithUser
}

export function FeedbackDetail({ item }: FeedbackDetailProps) {
  const [notes, setNotes] = useState(item.admin_notes || '')
  const [isPending, startTransition] = useTransition()
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [screenshotLoading, setScreenshotLoading] = useState(false)
  const typeInfo = typeConfig[item.type]
  const TypeIcon = typeInfo.icon

  // Fetch signed URL for screenshot when component mounts
  useEffect(() => {
    if (!item.screenshot_url) return

    let cancelled = false
    setScreenshotLoading(true)

    getScreenshotSignedUrl(item.screenshot_url).then((result) => {
      if (cancelled) return
      setScreenshotUrl(result.url)
      setScreenshotLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [item.screenshot_url])

  function handleStatusChange(newStatus: FeedbackStatus) {
    startTransition(async () => {
      try {
        await updateFeedbackStatus(item.id, newStatus)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      try {
        await updateFeedbackStatus(item.id, item.status, notes)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save notes')
      }
    })
  }

  const timeAgo = getTimeAgo(item.created_at)

  return (
    <div className="px-4 py-4 bg-muted/20 border-t border-border">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
            <span className={`text-sm font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className={`text-sm font-medium ${statusColors[item.status]}`} aria-label={`Status: ${item.status}`}>
              &bull; {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            from {item.user?.display_name || 'Unknown'} &middot;{' '}
            {item.user?.email || 'No email'} &middot; {timeAgo}
            {item.page_url && (
              <>
                {' '}&middot;{' '}
                <span className="text-gold/70">{item.page_url}</span>
              </>
            )}
          </p>
          {item.browser_info && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {item.browser_info.slice(0, 100)}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="rounded-md bg-card border border-border p-3 mb-4">
        <p className="text-sm text-foreground whitespace-pre-wrap">{item.description}</p>
      </div>

      {/* Screenshot */}
      {item.screenshot_url && (
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
            <ImageIcon className="w-3.5 h-3.5" />
            Screenshot:
          </label>
          {screenshotLoading ? (
            <div className="w-[200px] h-[120px] rounded-md bg-muted border border-border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : screenshotUrl ? (
            <a
              href={screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt="Feedback screenshot"
                className="rounded-md border border-border max-w-[200px] max-h-[120px] object-contain hover:opacity-80 transition-opacity cursor-pointer"
              />
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">Could not load screenshot</p>
          )}
        </div>
      )}

      {/* Status + Admin Notes */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Status:</label>
          <select
            value={item.status}
            onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Admin Notes:
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes..."
            rows={3}
            className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveNotes}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-gold text-background hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}
