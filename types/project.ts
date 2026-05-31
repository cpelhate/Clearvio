export type ProjectStatus =
  | 'INITIALISATION'
  | 'EN_COURS'
  | 'EN_ATTENTE'
  | 'CRITIQUE'
  | 'TERMINE'
  | 'ARCHIVE'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  INITIALISATION: 'En initialisation',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  CRITIQUE: 'Critique',
  TERMINE: 'Terminé',
  ARCHIVE: 'Archivé',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  INITIALISATION: 'var(--color-text-tertiary)',
  EN_COURS: 'var(--color-accent-default)',
  EN_ATTENTE: 'var(--color-warning-default)',
  CRITIQUE: 'var(--color-danger-default)',
  TERMINE: 'var(--color-success-default)',
  ARCHIVE: 'var(--color-text-disabled)',
}

export const PROJECT_STATUS_BG: Record<ProjectStatus, string> = {
  INITIALISATION: 'var(--color-bg-tertiary)',
  EN_COURS: 'var(--color-accent-bg)',
  EN_ATTENTE: 'var(--color-warning-bg)',
  CRITIQUE: 'var(--color-danger-bg)',
  TERMINE: 'var(--color-success-bg)',
  ARCHIVE: 'var(--color-bg-tertiary)',
}

export const PROJECT_COLORS = [
  '#1D3461', '#0F7B55', '#8A5C00', '#B91C1C',
  '#6B21A8', '#0E7490', '#9D174D', '#374151',
]

export interface Project {
  id: string
  organizationId: string
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  category: string | null
  color: string
  managerId: string
  createdBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  members: ProjectMember[]
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: 'CO_RESPONSABLE' | 'CONTRIBUTEUR' | 'OBSERVATEUR'
  joinedAt: string
}
