export type OrgPlan = 'FREE' | 'TRIAL' | 'PRO' | 'BUSINESS'

export interface PlanLimits {
  projects: number        // max projets (Infinity = illimité)
  members: number         // max membres par org
  ai: boolean             // fonctionnalités IA
  github: boolean         // intégration GitHub
  documents: boolean      // stockage documents
  documentsQuota: number  // quota par projet en octets (0 = désactivé)
}

// Fichier central à modifier pour ajuster les limites et features par plan
export const PLAN_LIMITS: Record<OrgPlan, PlanLimits> = {
  FREE: {
    projects: 3,
    members: 5,
    ai: false,
    github: false,
    documents: false,
    documentsQuota: 0,
  },
  TRIAL: {
    projects: Infinity,
    members: 20,
    ai: false,
    github: true,
    documents: true,
    documentsQuota: 500 * 1024 * 1024, // 500 Mo
  },
  PRO: {
    projects: Infinity,
    members: 20,
    ai: true,
    github: true,
    documents: true,
    documentsQuota: 500 * 1024 * 1024, // 500 Mo
  },
  BUSINESS: {
    projects: Infinity,
    members: Infinity,
    ai: true,
    github: true,
    documents: true,
    documentsQuota: 1024 * 1024 * 1024, // 1 Go
  },
}

export const PLAN_LABELS: Record<OrgPlan, string> = {
  FREE: 'Gratuit',
  TRIAL: 'Essai Pro',
  PRO: 'Pro',
  BUSINESS: 'Business',
}

export const PLAN_PRICES: Record<OrgPlan, string> = {
  FREE: 'Gratuit',
  TRIAL: '7 jours gratuits',
  PRO: '15 €/mois',
  BUSINESS: '49 €/mois',
}

// Résoudre le plan effectif depuis le statut Stripe
export function resolvePlan(
  subscriptionStatus: string | null | undefined,
  stripePriceId: string | null | undefined
): OrgPlan {
  if (!subscriptionStatus) return 'FREE'
  if (subscriptionStatus === 'trialing') return 'TRIAL'
  if (subscriptionStatus === 'active' || subscriptionStatus === 'past_due') {
    const proPriceId = process.env.STRIPE_PRICE_PRO
    const businessPriceId = process.env.STRIPE_PRICE_BUSINESS
    if (stripePriceId === businessPriceId) return 'BUSINESS'
    if (stripePriceId === proPriceId) return 'PRO'
  }
  return 'FREE'
}

export function canUseFeature(plan: OrgPlan, feature: keyof PlanLimits): boolean {
  const limits = PLAN_LIMITS[plan]
  const val = limits[feature]
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val > 0
  return false
}

export function getPlanForFeature(feature: keyof PlanLimits): OrgPlan {
  if (PLAN_LIMITS.PRO[feature]) return 'PRO'
  return 'PRO'
}

export const FEATURE_LABELS: Partial<Record<keyof PlanLimits, string>> = {
  ai: 'les fonctionnalités IA',
  github: 'l\'intégration GitHub',
  documents: 'le stockage de documents',
}
