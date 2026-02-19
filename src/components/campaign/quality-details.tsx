'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Undo2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QualityIssue, QualityCategory } from '@/lib/types/quality';

interface QualityDetailsProps {
  issues: QualityIssue[];
  onRevert?: (issue: QualityIssue) => void;
}

const categoryColors: Record<QualityCategory, string> = {
  'platform-format': 'bg-sky-100 text-sky-800',
  'cta-effectiveness': 'bg-lime-100 text-lime-800',
  'anti-pattern': 'bg-fuchsia-100 text-fuchsia-800',
  'power-avoid-words': 'bg-orange-100 text-orange-800',
  'formatting': 'bg-stone-100 text-stone-800',
  'hook-strength': 'bg-violet-100 text-violet-800',
  'specificity': 'bg-teal-100 text-teal-800',
  'feature-to-benefit': 'bg-emerald-100 text-emerald-800',
  'tone-consistency': 'bg-cyan-100 text-cyan-800',
  'variation-redundancy': 'bg-amber-100 text-amber-800',
  'platform-optimization': 'bg-blue-100 text-blue-800',
  'demographic-fit': 'bg-rose-100 text-rose-800',
  'property-type-fit': 'bg-indigo-100 text-indigo-800',
  'emotional-triggers': 'bg-pink-100 text-pink-800',
  'voice-authenticity': 'bg-purple-100 text-purple-800',
};

const categoryLabels: Record<QualityCategory, string> = {
  'platform-format': 'Format',
  'cta-effectiveness': 'CTA',
  'anti-pattern': 'Anti-Pattern',
  'power-avoid-words': 'Weak Words',
  'formatting': 'Formatting',
  'hook-strength': 'Hook',
  'specificity': 'Specificity',
  'feature-to-benefit': 'Benefits',
  'tone-consistency': 'Tone',
  'variation-redundancy': 'Variation',
  'platform-optimization': 'Platform',
  'demographic-fit': 'Audience',
  'property-type-fit': 'Property Type',
  'emotional-triggers': 'Emotion',
  'voice-authenticity': 'Voice',
};

function QualityIssueItem({
  issue,
  onRevert,
}: {
  issue: QualityIssue;
  onRevert?: (issue: QualityIssue) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [reverted, setReverted] = useState(false);

  const colorClass = categoryColors[issue.category] || 'bg-slate-100 text-slate-800';
  const label = categoryLabels[issue.category] || issue.category;
  const isAutoFixed = issue.fixedText != null && issue.originalText != null;

  function handleRevert() {
    if (onRevert) {
      onRevert(issue);
      setReverted(true);
    }
  }

  if (reverted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        <Undo2 className="w-4 h-4 flex-shrink-0" />
        <span>Reverted to original text</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
      {/* Header row: category badge, priority dot, source badge, and revert button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
              issue.priority === 'required' ? 'bg-red-500' : 'bg-amber-500'
            }`}
          />
          <Badge variant="outline" className={`text-xs ${colorClass} border-0`}>
            {label}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs border-0 ${
              issue.source === 'ai'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {issue.source === 'ai' ? 'AI' : 'Rule'}
          </Badge>
          {issue.score != null && (
            <span className="text-xs text-muted-foreground">
              Score: {issue.score}/10
            </span>
          )}
        </div>
        {isAutoFixed && onRevert && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex-shrink-0 h-7 gap-1"
            onClick={handleRevert}
          >
            <Undo2 className="w-3 h-3" />
            Revert
          </Button>
        )}
      </div>

      {/* Issue description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{issue.issue}</p>

      {/* Before/After for auto-fixed issues */}
      {isAutoFixed && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground font-medium w-12 flex-shrink-0 pt-0.5">Before:</span>
            <span className="text-red-700 line-through bg-red-50 rounded px-1.5 py-0.5 leading-relaxed">
              {issue.originalText}
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground font-medium w-12 flex-shrink-0 pt-0.5">After:</span>
            <span className="text-emerald-800 bg-emerald-50 rounded px-1.5 py-0.5 leading-relaxed">
              {issue.fixedText}
            </span>
          </div>
        </div>
      )}

      {/* Suggested fix for non-auto-fixed issues */}
      {!isAutoFixed && issue.suggestedFix && (
        <div className="flex items-start gap-2 text-xs">
          <span className="text-muted-foreground">
            Suggested: <span className="font-medium text-emerald-500">{issue.suggestedFix}</span>
          </span>
        </div>
      )}

      {/* Context (the matched text / surrounding copy) */}
      {issue.context && (
        <p className="text-xs text-muted-foreground italic">
          &ldquo;{issue.context}&rdquo;
        </p>
      )}

      {/* Expandable "Why" section */}
      <button
        onClick={() => setShowWhy(!showWhy)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showWhy ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Why this matters
      </button>

      {showWhy && (
        <div className="text-xs text-muted-foreground bg-secondary rounded p-2 border border-border">
          <p className="font-medium text-secondary-foreground mb-1">
            {issue.priority === 'required' ? 'Required Fix' : 'Recommended Improvement'}
          </p>
          <p>
            {issue.priority === 'required'
              ? `This issue can reduce ad performance. ${issue.suggestedFix}`
              : `Addressing this can improve engagement. ${issue.suggestedFix}`}
          </p>
        </div>
      )}
    </div>
  );
}

export function QualityDetails({ issues, onRevert }: QualityDetailsProps) {
  const [expanded, setExpanded] = useState(false);

  if (issues.length === 0) return null;

  const improvements = issues.filter((i) => i.fixedText != null).length;
  const suggestions = issues.filter((i) => i.fixedText == null).length;

  const parts: string[] = [];
  if (improvements > 0) {
    parts.push(`${improvements} quality improvement${improvements !== 1 ? 's' : ''}`);
  }
  if (suggestions > 0) {
    parts.push(`${suggestions} suggestion${suggestions !== 1 ? 's' : ''}`);
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <Sparkles className="w-3 h-3" />
        {parts.join(', ')}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {issues.map((issue, i) => (
            <QualityIssueItem
              key={`${issue.platform}-${issue.category}-${i}`}
              issue={issue}
              onRevert={onRevert}
            />
          ))}
        </div>
      )}
    </div>
  );
}
