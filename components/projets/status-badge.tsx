import { ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_STATUS_BG } from '@/types/project'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.02em',
      color: PROJECT_STATUS_COLORS[status],
      background: PROJECT_STATUS_BG[status],
      border: `1px solid ${PROJECT_STATUS_COLORS[status]}22`,
      whiteSpace: 'nowrap',
    }}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}
