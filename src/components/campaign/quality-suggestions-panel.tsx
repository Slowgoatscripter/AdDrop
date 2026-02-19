'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Sparkles, X } from 'lucide-react';
import type { QualitySuggestion, QualityConstraintViolation, QualityCategory } from '@/lib/types/quality';

interface QualitySuggestionsPanelProps {
  suggestions: QualitySuggestion[];
  constraints: QualityConstraintViolation[];
  onApply?: (suggestion: QualitySuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
  applyingId?: string | null;
}

const categoryLabels: Record<QualityCategory, string> = {
  'platform-format': 'Platform Format',
  'cta-effectiveness': 'CTA Effectiveness',
  'anti-pattern': 'Anti-Pattern',
  'power-avoid-words': 'Power/Avoid Words',
  'formatting': 'Formatting',
  'hook-strength': 'Hook Strength',
  'specificity': 'Specificity',
  'feature-to-benefit': 'Feature to Benefit',
  'tone-consistency': 'Tone Consistency',
  'variation-redundancy': 'Variation Redundancy',
  'platform-optimization': 'Platform Optimization',
  'demographic-fit': 'Demographic Fit',
  'property-type-fit': 'Property Type Fit',
  'emotional-triggers': 'Emotional Triggers',
  'voice-authenticity': 'Voice Authenticity',
};

const severityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-destructive/10 text-destructive',
  critical: 'bg-destructive/20 text-destructive',
};

function groupByPlatform(suggestions: QualitySuggestion[]): Map<string, QualitySuggestion[]> {
  const grouped = new Map<string, QualitySuggestion[]>();
  for (const s of suggestions) {
    const existing = grouped.get(s.platform) || [];
    existing.push(s);
    grouped.set(s.platform, existing);
  }
  return grouped;
}

function ConstraintsSection({ constraints }: { constraints: QualityConstraintViolation[] }) {
  const [expanded, setExpanded] = useState(false);

  if (constraints.length === 0) return null;

  return (
    <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-6 py-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-500">
            <Check className="w-5 h-5" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-green-500">
              {constraints.length} constraint{constraints.length !== 1 ? 's' : ''} auto-enforced
            </p>
            <p className="text-xs text-green-500">Click to review what was enforced</p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-green-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-green-500" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {constraints.map((constraint) => (
            <div key={constraint.id} className="rounded-lg border border-green-500/20 bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500 capitalize">
                  {constraint.type.replace(/-/g, ' ')}
                </span>
                <span className="text-xs text-green-500">{constraint.platform}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{constraint.issue}</p>
              {constraint.autoFixed && constraint.fixedText && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Before</p>
                    <p className="text-sm text-destructive line-through bg-destructive/10 rounded px-2 py-1">
                      {constraint.currentText}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">After</p>
                    <p className="text-sm text-green-500 bg-green-500/10 rounded px-2 py-1">
                      {constraint.fixedText}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  isApplying,
}: {
  suggestion: QualitySuggestion;
  onApply?: (suggestion: QualitySuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
  isApplying?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityColors[suggestion.severity]}`}
        >
          {categoryLabels[suggestion.category] || suggestion.category}
        </span>
      </div>

      <p className="text-sm text-foreground mb-2">{suggestion.issue}</p>

      <div className="space-y-2 mb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Current</p>
          <p className="text-sm text-muted-foreground bg-muted rounded px-2 py-1">
            {suggestion.currentText}
          </p>
        </div>
        {suggestion.suggestedRewrite && (
          <div>
            <p className="text-xs font-medium text-green-500 mb-0.5">Suggested</p>
            <p className="text-sm text-green-500 bg-green-500/10 rounded px-2 py-1">
              {suggestion.suggestedRewrite}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">{suggestion.explanation}</p>

      <div className="flex items-center gap-2">
        {suggestion.suggestedRewrite && onApply && (
          <button
            onClick={() => onApply(suggestion)}
            disabled={isApplying}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplying ? (
              <span className="w-3 h-3 border border-green-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={() => onDismiss(suggestion.id)}
            disabled={isApplying}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-3 h-3" />
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export function QualitySuggestionsPanel({
  suggestions,
  constraints,
  onApply,
  onDismiss,
  applyingId,
}: QualitySuggestionsPanelProps) {
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);

  if (suggestions.length === 0 && constraints.length === 0) {
    return null;
  }

  const grouped = groupByPlatform(suggestions);

  return (
    <div className="space-y-3">
      <ConstraintsSection constraints={constraints} />

      {suggestions.length > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-6 py-4">
          <button
            onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500">
                <Sparkles className="w-5 h-5" />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-yellow-500">
                  {suggestions.length} quality suggestion{suggestions.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-yellow-500">
                  Review and apply suggested improvements
                </p>
              </div>
            </div>
            {suggestionsExpanded ? (
              <ChevronDown className="w-4 h-4 text-yellow-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-yellow-500" />
            )}
          </button>

          {suggestionsExpanded && (
            <div className="mt-4 space-y-4">
              {Array.from(grouped.entries()).map(([platform, platformSuggestions]) => (
                <div key={platform}>
                  <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide mb-2">
                    {platform}
                  </p>
                  <div className="space-y-2">
                    {platformSuggestions.map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onApply={onApply}
                        onDismiss={onDismiss}
                        isApplying={suggestion.id === applyingId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
