export type TaskStatus = 'A_FAIRE' | 'EN_COURS' | 'EN_REVUE' | 'TERMINE' | 'BLOQUE'
export type TaskPriority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'CRITIQUE'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  EN_REVUE: 'En révision',
  TERMINE: 'Terminé',
  BLOQUE: 'Bloqué',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  A_FAIRE: 'var(--color-text-tertiary)',
  EN_COURS: 'var(--color-accent-default)',
  EN_REVUE: 'var(--color-warning-default)',
  TERMINE: 'var(--color-success-default)',
  BLOQUE: 'var(--color-danger-default)',
}

export const TASK_STATUS_BG: Record<TaskStatus, string> = {
  A_FAIRE: 'var(--color-bg-tertiary)',
  EN_COURS: 'var(--color-accent-bg)',
  EN_REVUE: 'var(--color-warning-bg)',
  TERMINE: 'var(--color-success-bg)',
  BLOQUE: 'var(--color-danger-bg)',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  CRITIQUE: 'Critique',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  BASSE: 'var(--color-text-tertiary)',
  NORMALE: 'var(--color-text-secondary)',
  HAUTE: 'var(--color-warning-default)',
  CRITIQUE: 'var(--color-danger-default)',
}

export interface Task {
  id: string
  projectId: string
  parentId: string | null
  milestoneId: string | null
  title: string
  shortName: string | null
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null
  startDate: string | null
  dueDate: string | null
  order: number
  level: number
  createdAt: string
  updatedAt: string
  children?: Task[]
}
