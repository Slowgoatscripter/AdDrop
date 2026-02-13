'use client'

import { useState, useTransition } from 'react'
import { getFeedback } from '@/app/admin/feedback/actions'
import { FeedbackDetail } from './feedback-detail'
import { Bug, Sparkles, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FeedbackWithUser, FeedbackType, FeedbackStatus } from '@/lib/types/feedback'

const typeFilters: { value: FeedbackType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bug', label: 'Bugs' },
  { value: 'feature', label: 'Features' },
  { value: 'general', label: 'General' },
]

const statusFilters: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const typeIcons = {
  bug: Bug,
  feature: Sparkles,
  general: MessageCircle,
}

const typeColors = {
  bug: 'text-red-400',
  feature: 'text-gold',
  general: 'text-cream',
}

const statusBadge: Record<FeedbackStatus, { dot: string; text: string }> = {
  new: { dot: 'bg-gold', text: 'text-gold' },
  reviewing: { dot: 'bg-blue-400', text: 'text-blue-400' },
  resolved: { dot: 'bg-green-400', text: 'text-green-400' },
  closed: { dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
}

const PAGE_SIZE = 20

interface FeedbackTableProps {
  initialData: FeedbackWithUser[]
  initialTotalCount: number
}

export function FeedbackTable({ initialData, initialTotalCount }: FeedbackTableProps) {
  const [data, setData] = useState(initialData)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function refetch(newType?: FeedbackType | 'all', newStatus?: FeedbackStatus | 'all', newPage?: number) {
    const t = newType ?? typeFilter
    const s = newStatus ?? statusFilter
    const p = newPage ?? page

    startTransition(async () => {
      try {
        const result = await getFeedback({ type: t, status: s, page: p })
        setData(result.data)
        setTotalCount(result.totalCount)
      } catch (err) {
        console.error('Failed to fetch feedback:', err)
      }
    })
  }

  function handleTypeChange(newType: FeedbackType | 'all') {
    setTypeFilter(newType)
    setPage(1)
    setExpandedId(null)
    refetch(newType, undefined, 1)
  }

  function handleStatusChange(newStatus: FeedbackStatus | 'all') {
    setStatusFilter(newStatus)
    setPage(1)
    setExpandedId(null)
    refetch(undefined, newStatus, 1)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setExpandedId(null)
    refetch(undefined, undefined, newPage)
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Type filter tabs */}
        <div className="flex gap-1">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleTypeChange(filter.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === filter.value
                  ? 'bg-gold/10 text-gold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Status filter dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus | 'all')}
          className="text-xs px-2 py-1.5 rounded-md bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          {statusFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={`rounded-lg border border-border bg-card overflow-hidden ${isPending ? 'opacity-60' : ''}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-10">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Description</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">User</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => {
              const TypeIcon = typeIcons[item.type]
              const badge = statusBadge[item.status]
              const isExpanded = expandedId === item.id

              return (
                <tr key={item.id} className="group">
                  <td colSpan={5} className="p-0">
                    {/* Clickable row */}
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="px-4 py-3 w-10">
                          <TypeIcon className={`w-4 h-4 ${typeColors[item.type]}`} />
                        </div>
                        <div className="px-4 py-3 flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate max-w-xs">
                            {item.description.slice(0, 80)}
                            {item.description.length > 80 ? '...' : ''}
                          </p>
                        </div>
                        <div className="px-4 py-3 hidden md:block">
                          <p className="text-sm text-muted-foreground">
                            {item.user?.display_name || item.user?.email || 'Unknown'}
                          </p>
                        </div>
                        <div className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${badge.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                        <div className="px-4 py-3 hidden sm:block">
                          <p className="text-xs text-muted-foreground">
                            {getTimeAgo(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Expandable detail */}
                    {isExpanded && <FeedbackDetail item={item} />}
                  </td>
                </tr>
              )
            })}

            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No feedback found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} items)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isPending}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isPending}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Showing {data.length} of {totalCount} feedback items
      </p>
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
