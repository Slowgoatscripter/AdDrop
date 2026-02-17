'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Sparkles, X } from 'lucide-react';
import type { QualitySuggestion, QualityConstraintViolation, QualityCategory } from '@/lib/types/quality';

interface QualitySuggestionsPanelProps {
  suggestions: QualitySuggestion[];
  constraints: QualityConstraintViolation[];
  onApply?: (suggestion: QualitySuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
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
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
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
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
            <Check className="w-5 h-5" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-emerald-900">
              {constraints.length} constraint{constraints.length !== 1 ? 's' : ''} auto-enforced
            </p>
            <p className="text-xs text-emerald-700">Click to review what was enforced</p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-emerald-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-emerald-600" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {constraints.map((constraint) => (
            <div key={constraint.id} className="rounded-lg border border-emerald-200 bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 capitalize">
                  {constraint.type.replace(/-/g, ' ')}
                </span>
                <span className="text-xs text-emerald-600">{constraint.platform}</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{constraint.issue}</p>
              {constraint.autoFixed && constraint.fixedText && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Before</p>
                    <p className="text-sm text-red-700 line-through bg-red-50 rounded px-2 py-1">
                      {constraint.currentText}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">After</p>
                    <p className="text-sm text-green-700 bg-green-50 rounded px-2 py-1">
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
}: {
  suggestion: QualitySuggestion;
  onApply?: (suggestion: QualitySuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityColors[suggestion.severity]}`}
        >
          {categoryLabels[suggestion.category] || suggestion.category}
        </span>
      </div>

      <p className="text-sm text-gray-800 mb-2">{suggestion.issue}</p>

      <div className="space-y-2 mb-3">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-0.5">Current</p>
          <p className="text-sm text-gray-500 bg-gray-50 rounded px-2 py-1">
            {suggestion.currentText}
          </p>
        </div>
        {suggestion.suggestedRewrite && (
          <div>
            <p className="text-xs font-medium text-emerald-600 mb-0.5">Suggested</p>
            <p className="text-sm text-emerald-800 bg-emerald-50 rounded px-2 py-1">
              {suggestion.suggestedRewrite}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3">{suggestion.explanation}</p>

      <div className="flex items-center gap-2">
        {suggestion.suggestedRewrite && onApply && (
          <button
            onClick={() => onApply(suggestion)}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Apply
          </button>
        )}
        {onDismiss && (
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
          <button
            onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600">
                <Sparkles className="w-5 h-5" />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-amber-900">
                  {suggestions.length} quality suggestion{suggestions.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-700">
                  Review and apply suggested improvements
                </p>
              </div>
            </div>
            {suggestionsExpanded ? (
              <ChevronDown className="w-4 h-4 text-amber-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-amber-600" />
            )}
          </button>

          {suggestionsExpanded && (
            <div className="mt-4 space-y-4">
              {Array.from(grouped.entries()).map(([platform, platformSuggestions]) => (
                <div key={platform}>
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                    {platform}
                  </p>
                  <div className="space-y-2">
                    {platformSuggestions.map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onApply={onApply}
                        onDismiss={onDismiss}
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
