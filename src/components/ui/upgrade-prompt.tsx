'use client'

import { Lock } from 'lucide-react'
import Link from 'next/link'

interface UpgradePromptProps {
  feature: 'export' | 'share' | 'regenerate'
}

const FEATURE_MESSAGES = {
  export: 'Export campaigns as PDF or ZIP',
  share: 'Share campaigns with clients',
  regenerate: 'Regenerate ad copy for any platform',
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Lock className="h-3.5 w-3.5" />
      <span>{FEATURE_MESSAGES[feature]}</span>
      <Link
        href="/pricing"
        className="text-gold hover:underline font-medium"
      >
        Upgrade to Pro
      </Link>
    </div>
  )
}
