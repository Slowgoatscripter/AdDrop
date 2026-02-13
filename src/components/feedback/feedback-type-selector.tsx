'use client'

import { Bug, Sparkles, MessageCircle } from 'lucide-react'
import type { FeedbackType } from '@/lib/types/feedback'

const types = [
  {
    value: 'bug' as const,
    label: 'Bug Report',
    icon: Bug,
    activeClasses: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  {
    value: 'feature' as const,
    label: 'Feature Request',
    icon: Sparkles,
    activeClasses: 'bg-gold/10 text-gold border-gold/30',
  },
  {
    value: 'general' as const,
    label: 'General',
    icon: MessageCircle,
    activeClasses: 'bg-cream/10 text-cream border-cream/30',
  },
] satisfies { value: FeedbackType; label: string; icon: React.ComponentType<{ className?: string }>; activeClasses: string }[]

interface FeedbackTypeSelectorProps {
  value: FeedbackType | null
  onChange: (type: FeedbackType) => void
  disabled?: boolean
}

export function FeedbackTypeSelector({ value, onChange, disabled }: FeedbackTypeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Feedback type" className="flex gap-2">
      {types.map((t) => {
        const isSelected = value === t.value
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(t.value)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full border transition-colors min-h-[44px] ${
              isSelected
                ? t.activeClasses
                : 'bg-transparent border-border text-muted-foreground hover:text-cream hover:border-cream/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
