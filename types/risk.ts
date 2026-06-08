export type RiskProbability = 'FAIBLE' | 'MOYEN' | 'ELEVE'
export type RiskImpact = 'FAIBLE' | 'MOYEN' | 'ELEVE'
export type RiskStatus = 'OUVERT' | 'EN_COURS' | 'RESOLU' | 'ACCEPTE'

export const RISK_PROBABILITY_LABELS: Record<RiskProbability, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
}

export const RISK_IMPACT_LABELS: Record<RiskImpact, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
}

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En traitement',
  RESOLU: 'Résolu',
  ACCEPTE: 'Accepté',
}

// Niveau de risque = probabilité × impact
export type RiskLevel = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE'

export function getRiskLevel(probability: RiskProbability, impact: RiskImpact): RiskLevel {
  const score = { FAIBLE: 1, MOYEN: 2, ELEVE: 3 }
  const s = score[probability] * score[impact]
  if (s >= 9) return 'CRITIQUE'
  if (s >= 4) return 'ELEVE'
  if (s >= 2) return 'MOYEN'
  return 'FAIBLE'
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
}

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  FAIBLE: 'var(--color-success-default)',
  MOYEN: 'var(--color-warning-default)',
  ELEVE: 'var(--color-danger-default)',
  CRITIQUE: '#7c2d12', // rouge très foncé — seule exception hardcodée acceptable pour critique
}

export const RISK_LEVEL_BG: Record<RiskLevel, string> = {
  FAIBLE: 'var(--color-success-bg)',
  MOYEN: 'var(--color-warning-bg)',
  ELEVE: 'var(--color-danger-bg)',
  CRITIQUE: 'rgba(124, 45, 18, 0.1)',
}

export interface ProjectRisk {
  id: string
  projectId: string
  title: string
  description: string | null
  probability: RiskProbability
  impact: RiskImpact
  status: RiskStatus
  mitigation: string | null
  order: number
  createdAt: string
  updatedAt: string
}
