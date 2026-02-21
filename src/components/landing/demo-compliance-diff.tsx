'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplianceAutoFix } from '@/lib/types/compliance';

interface DemoComplianceDiffProps {
  autoFixes: ComplianceAutoFix[];
}

function formatCategory(category: string): string {
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function DemoComplianceDiff({ autoFixes }: DemoComplianceDiffProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'text-gold text-sm font-medium cursor-pointer hover:text-gold/80 transition-colors',
          'flex items-center gap-1',
        )}
      >
        {expanded ? 'Hide details' : 'See what our compliance engine caught →'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="compliance-diff"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              {autoFixes.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>No violations found — this copy was clean from the start!</span>
                </div>
              ) : (
                autoFixes.map((fix, idx) => (
                  <div
                    key={idx}
                    className="bg-surface/50 border border-gold/10 rounded-lg p-4 space-y-2"
                  >
                    {/* Category badge */}
                    <span className="inline-block bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full">
                      {formatCategory(fix.category)}
                    </span>

                    {/* Before */}
                    <p className="text-red-400/80 line-through text-sm leading-relaxed">
                      {fix.before}
                    </p>

                    {/* After */}
                    <p className="text-emerald-400 text-sm leading-relaxed">{fix.after}</p>

                    {/* Platform label */}
                    <p className="text-muted-foreground text-xs capitalize">{fix.platform}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
