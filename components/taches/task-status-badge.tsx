import { TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_STATUS_BG } from '@/types/task'

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
      color: TASK_STATUS_COLORS[status],
      background: TASK_STATUS_BG[status],
      border: `1px solid color-mix(in srgb, ${TASK_STATUS_COLORS[status]} 30%, transparent)`,
      whiteSpace: 'nowrap',
    }}>
      {TASK_STATUS_LABELS[status]}
    </span>
  )
}
