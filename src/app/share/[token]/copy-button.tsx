'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: 'ghost' | 'outline' | 'secondary';
  size?: 'sm' | 'icon' | 'default';
  className?: string;
}

export function CopyButton({ text, label, variant = 'ghost', size = 'sm', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleCopy} className={className}>
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          {label && <span className="ml-1">Copied</span>}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label && <span className="ml-1">{label}</span>}
        </>
      )}
    </Button>
  );
}
