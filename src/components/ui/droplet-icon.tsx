import { cn } from '@/lib/utils'

interface DropletIconProps {
  className?: string
  size?: number
  glow?: boolean
}

export function DropletIcon({ className, size = 20, glow = false }: DropletIconProps) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 20 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(glow && 'drop-shadow-[0_0_8px_hsl(var(--gold)/0.5)]', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="droplet-gradient" x1="10" y1="0" x2="10" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--gold-light))" />
          <stop offset="100%" stopColor="hsl(var(--gold))" />
        </linearGradient>
      </defs>
      <path
        d="M10 0C10 0 0 12 0 17C0 22.5228 4.47715 26 10 26C15.5228 26 20 22.5228 20 17C20 12 10 0 10 0Z"
        fill="url(#droplet-gradient)"
      />
      <ellipse cx="7" cy="15" rx="2.5" ry="3.5" fill="hsl(var(--gold-light))" opacity="0.3" />
    </svg>
  )
}
