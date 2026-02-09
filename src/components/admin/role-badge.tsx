interface RoleBadgeProps {
  role: 'admin' | 'user'
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        role === 'admin'
          ? 'bg-gold/10 text-gold'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {role}
    </span>
  )
}
