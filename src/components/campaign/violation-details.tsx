'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComplianceViolation } from '@/lib/types';

interface ViolationDetailsProps {
  violations: ComplianceViolation[];
  onReplace: (platform: string, oldTerm: string, newTerm: string) => void;
}

const categoryColors: Record<string, string> = {
  'steering': 'bg-purple-100 text-purple-800',
  'familial-status': 'bg-blue-100 text-blue-800',
  'disability': 'bg-teal-100 text-teal-800',
  'race-color-national-origin': 'bg-orange-100 text-orange-800',
  'religion': 'bg-indigo-100 text-indigo-800',
  'sex-gender': 'bg-pink-100 text-pink-800',
  'age': 'bg-cyan-100 text-cyan-800',
  'marital-status': 'bg-violet-100 text-violet-800',
  'creed': 'bg-gray-100 text-gray-800',
  'economic-exclusion': 'bg-yellow-100 text-yellow-800',
  'misleading-claims': 'bg-rose-100 text-rose-800',
  'military-status': 'bg-green-100 text-green-800',
};

const categoryLabels: Record<string, string> = {
  'steering': 'Steering',
  'familial-status': 'Familial Status',
  'disability': 'Disability',
  'race-color-national-origin': 'Race / National Origin',
  'religion': 'Religion',
  'sex-gender': 'Sex / Gender',
  'age': 'Age',
  'marital-status': 'Marital Status',
  'creed': 'Creed',
  'economic-exclusion': 'Economic Exclusion',
  'misleading-claims': 'Misleading Claims',
  'military-status': 'Military Status',
};

function highlightTerm(context: string, term: string): React.ReactNode {
  const idx = context.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return context;

  const before = context.slice(0, idx);
  const match = context.slice(idx, idx + term.length);
  const after = context.slice(idx + term.length);

  return (
    <>
      {before}
      <strong className="bg-red-100 text-red-900 px-0.5 rounded">{match}</strong>
      {after}
    </>
  );
}

function ViolationItem({
  violation,
  onReplace,
}: {
  violation: ComplianceViolation;
  onReplace: (platform: string, oldTerm: string, newTerm: string) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const [fixed, setFixed] = useState(false);

  const colorClass = categoryColors[violation.category] || 'bg-slate-100 text-slate-800';
  const label = categoryLabels[violation.category] || violation.category;

  function handleReplace() {
    onReplace(violation.platform, violation.term, violation.alternative);
    setFixed(true);
  }

  if (fixed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <Check className="w-4 h-4 flex-shrink-0" />
        <span>
          Replaced &ldquo;{violation.term}&rdquo; with &ldquo;{violation.alternative}&rdquo;
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
              violation.severity === 'hard' ? 'bg-red-500' : 'bg-amber-500'
            }`}
          />
          <Badge variant="outline" className={`text-xs ${colorClass} border-0`}>
            {label}
          </Badge>
        </div>
        <Button size="sm" variant="outline" className="text-xs flex-shrink-0 h-7" onClick={handleReplace}>
          Replace
        </Button>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        &ldquo;{highlightTerm(violation.context, violation.term)}&rdquo;
      </p>

      <p className="text-xs text-muted-foreground">{violation.explanation}</p>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          Suggested: <span className="font-medium text-green-400">{violation.alternative}</span>
        </span>
      </div>

      <button
        onClick={() => setShowMore(!showMore)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showMore ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Learn more
      </button>

      {showMore && (
        <div className="text-xs text-muted-foreground bg-secondary rounded p-2 border border-border">
          <p className="font-medium text-secondary-foreground mb-1">Legal Reference</p>
          <p>{violation.law}</p>
        </div>
      )}
    </div>
  );
}

export function ViolationDetails({ violations, onReplace }: ViolationDetailsProps) {
  const [expanded, setExpanded] = useState(false);

  if (violations.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {violations.length} compliance {violations.length === 1 ? 'issue' : 'issues'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {violations.map((v, i) => (
            <ViolationItem key={`${v.platform}-${v.term}-${i}`} violation={v} onReplace={onReplace} />
          ))}
        </div>
      )}
    </div>
  );
}
