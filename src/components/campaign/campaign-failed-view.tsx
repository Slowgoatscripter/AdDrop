'use client';

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CampaignFailedViewProps {
  error?: string | null;
  onRetry: () => void;
  onStartOver: () => void;
}

export default function CampaignFailedView({
  error,
  onRetry,
  onStartOver,
}: CampaignFailedViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md w-full">

        {/* Error icon */}
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </span>
        </div>

        {/* Title and message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Campaign generation failed</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error
              ? error
              : 'Something went wrong while generating your campaign. This is usually temporary.'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={onStartOver} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Start Over
          </Button>
        </div>

        {/* Support note */}
        <p className="text-xs text-muted-foreground/70">
          If this keeps happening, try refreshing the page or starting a new campaign.
        </p>
      </div>
    </div>
  );
}
