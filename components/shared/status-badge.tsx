interface StatusBadgeProps {
  label: string
  color: string
  bg: string
}

export function StatusBadge({ label, color, bg }: StatusBadgeProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
      color, background: bg,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
