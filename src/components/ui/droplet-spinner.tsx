import { cn } from '@/lib/utils'

interface DropletSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizes = {
  sm: 'w-4 h-5',
  md: 'w-6 h-7',
  lg: 'w-8 h-10',
}

export function DropletSpinner({ className, size = 'md', label }: DropletSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'droplet-shape bg-gradient-to-b from-gold-light to-gold animate-droplet-bounce',
          sizes[size]
        )}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  )
}
