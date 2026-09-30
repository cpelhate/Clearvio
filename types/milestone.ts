export type MilestoneStatus = 'A_VENIR' | 'ATTEINT' | 'MANQUE' | 'REPORTE'
export type DeliverableStatus = 'A_FAIRE' | 'EN_COURS' | 'LIVRE' | 'VALIDE' | 'REJETE'
export type ObjectiveStatus = 'PREVU' | 'EN_COURS' | 'ATTEINT' | 'ABANDONNE'

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  A_VENIR: 'À venir',
  ATTEINT: 'Atteint',
  MANQUE: 'Manqué',
  REPORTE: 'Reporté',
}
export const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, string> = {
  A_VENIR: 'var(--color-accent-default)',
  ATTEINT: 'var(--color-success-default)',
  MANQUE: 'var(--color-danger-default)',
  REPORTE: 'var(--color-warning-default)',
}
export const MILESTONE_STATUS_BG: Record<MilestoneStatus, string> = {
  A_VENIR: 'var(--color-accent-bg)',
  ATTEINT: 'var(--color-success-bg)',
  MANQUE: 'var(--color-danger-bg)',
  REPORTE: 'var(--color-warning-bg)',
}

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  LIVRE: 'Livré',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
}
export const DELIVERABLE_STATUS_COLORS: Record<DeliverableStatus, string> = {
  A_FAIRE: 'var(--color-text-tertiary)',
  EN_COURS: 'var(--color-accent-default)',
  LIVRE: 'var(--color-warning-default)',
  VALIDE: 'var(--color-success-default)',
  REJETE: 'var(--color-danger-default)',
}
export const DELIVERABLE_STATUS_BG: Record<DeliverableStatus, string> = {
  A_FAIRE: 'var(--color-bg-tertiary)',
  EN_COURS: 'var(--color-accent-bg)',
  LIVRE: 'var(--color-warning-bg)',
  VALIDE: 'var(--color-success-bg)',
  REJETE: 'var(--color-danger-bg)',
}

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  PREVU: 'Prévu',
  EN_COURS: 'En cours',
  ATTEINT: 'Atteint',
  ABANDONNE: 'Abandonné',
}
export const OBJECTIVE_STATUS_COLORS: Record<ObjectiveStatus, string> = {
  PREVU: 'var(--color-text-tertiary)',
  EN_COURS: 'var(--color-accent-default)',
  ATTEINT: 'var(--color-success-default)',
  ABANDONNE: 'var(--color-text-disabled)',
}
export const OBJECTIVE_STATUS_BG: Record<ObjectiveStatus, string> = {
  PREVU: 'var(--color-bg-tertiary)',
  EN_COURS: 'var(--color-accent-bg)',
  ATTEINT: 'var(--color-success-bg)',
  ABANDONNE: 'var(--color-bg-tertiary)',
}

export interface MilestoneType {
  id: string
  organizationId: string
  name: string
  color: string
  icon: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: string
  projectId: string
  typeId: string | null
  title: string
  shortName: string | null
  description: string | null
  color: string | null
  icon: string | null
  plannedDate: string
  actualDate: string | null
  status: MilestoneStatus
  showOnGantt: boolean
  createdAt: string
  updatedAt: string
  type?: MilestoneType | null
  deliverables?: Deliverable[]
}

export interface Deliverable {
  id: string
  projectId: string
  milestoneId: string | null
  title: string
  description: string | null
  responsibleId: string | null
  plannedDate: string | null
  status: DeliverableStatus
  createdAt: string
  updatedAt: string
}

export interface ProjectObjective {
  id: string
  projectId: string
  title: string
  successIndicator: string | null
  status: ObjectiveStatus
  order: number
  createdAt: string
  updatedAt: string
}
