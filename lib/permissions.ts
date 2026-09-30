import { prisma } from './prisma'

export const ACTIONS = {
  PROJECT_CREATE: 'project.create',
  PROJECT_EDIT: 'project.edit',
  PROJECT_DELETE: 'project.delete',
  TASK_CREATE: 'task.create',
  TASK_EDIT: 'task.edit',
  TASK_DELETE: 'task.delete',
  MILESTONE_CREATE: 'milestone.create',
  MILESTONE_EDIT: 'milestone.edit',
  MILESTONE_DELETE: 'milestone.delete',
  DELIVERABLE_CREATE: 'deliverable.create',
  DELIVERABLE_EDIT: 'deliverable.edit',
  DELIVERABLE_DELETE: 'deliverable.delete',
  OBJECTIVE_CREATE: 'objective.create',
  OBJECTIVE_EDIT: 'objective.edit',
  OBJECTIVE_DELETE: 'objective.delete',
  RISK_CREATE: 'risk.create',
  RISK_EDIT: 'risk.edit',
  RISK_DELETE: 'risk.delete',
  DOCUMENT_UPLOAD: 'document.upload',
  DOCUMENT_DELETE: 'document.delete',
  COMMENT_CREATE: 'comment.create',
  COMMENT_DELETE_OTHER: 'comment.delete_other',
  MEMBER_INVITE: 'member.invite',
  MEMBER_REMOVE: 'member.remove',
  MEMBER_CHANGE_ROLE: 'member.change_role',
  NAV_PORTEFEUILLE: 'nav.portefeuille',
  NAV_ROADMAP: 'nav.roadmap',
  NAV_NOTIFICATIONS: 'nav.notifications',
} as const

export type Action = typeof ACTIONS[keyof typeof ACTIONS]

export const NAV_ACTIONS = ['nav.portefeuille', 'nav.roadmap', 'nav.notifications'] as const

export const CONFIGURABLE_ROLES = ['MEMBRE', 'CO_RESPONSABLE', 'CONTRIBUTEUR', 'OBSERVATEUR'] as const

export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  MEMBRE: {
    'project.create': false, 'project.edit': false, 'project.delete': false,
    'task.create': true, 'task.edit': true, 'task.delete': true,
    'milestone.create': true, 'milestone.edit': true, 'milestone.delete': true,
    'deliverable.create': true, 'deliverable.edit': true, 'deliverable.delete': true,
    'objective.create': true, 'objective.edit': true, 'objective.delete': true,
    'risk.create': true, 'risk.edit': true, 'risk.delete': true,
    'document.upload': true, 'document.delete': true,
    'comment.create': true, 'comment.delete_other': false,
    'member.invite': false, 'member.remove': false, 'member.change_role': false,
    'nav.portefeuille': false, 'nav.roadmap': false, 'nav.notifications': true,
  },
  CO_RESPONSABLE: {
    'project.create': false, 'project.edit': true, 'project.delete': false,
    'task.create': true, 'task.edit': true, 'task.delete': true,
    'milestone.create': true, 'milestone.edit': true, 'milestone.delete': true,
    'deliverable.create': true, 'deliverable.edit': true, 'deliverable.delete': true,
    'objective.create': true, 'objective.edit': true, 'objective.delete': true,
    'risk.create': true, 'risk.edit': true, 'risk.delete': true,
    'document.upload': true, 'document.delete': true,
    'comment.create': true, 'comment.delete_other': true,
    'member.invite': false, 'member.remove': false, 'member.change_role': false,
    'nav.portefeuille': true, 'nav.roadmap': true, 'nav.notifications': true,
  },
  CONTRIBUTEUR: {
    'project.create': false, 'project.edit': false, 'project.delete': false,
    'task.create': true, 'task.edit': true, 'task.delete': false,
    'milestone.create': false, 'milestone.edit': true, 'milestone.delete': false,
    'deliverable.create': true, 'deliverable.edit': true, 'deliverable.delete': false,
    'objective.create': false, 'objective.edit': true, 'objective.delete': false,
    'risk.create': false, 'risk.edit': true, 'risk.delete': false,
    'document.upload': true, 'document.delete': false,
    'comment.create': true, 'comment.delete_other': false,
    'member.invite': false, 'member.remove': false, 'member.change_role': false,
    'nav.portefeuille': true, 'nav.roadmap': true, 'nav.notifications': true,
  },
  OBSERVATEUR: {
    'project.create': false, 'project.edit': false, 'project.delete': false,
    'task.create': false, 'task.edit': false, 'task.delete': false,
    'milestone.create': false, 'milestone.edit': false, 'milestone.delete': false,
    'deliverable.create': false, 'deliverable.edit': false, 'deliverable.delete': false,
    'objective.create': false, 'objective.edit': false, 'objective.delete': false,
    'risk.create': false, 'risk.edit': false, 'risk.delete': false,
    'document.upload': false, 'document.delete': false,
    'comment.create': true, 'comment.delete_other': false,
    'member.invite': false, 'member.remove': false, 'member.change_role': false,
    'nav.portefeuille': false, 'nav.roadmap': false, 'nav.notifications': true,
  },
}

async function isRoleAllowed(organizationId: string, role: string, action: string): Promise<boolean> {
  if (role === 'ADMIN') return true
  const rule = await prisma.permissionRule.findUnique({
    where: { organizationId_role_action: { organizationId, role, action } },
  })
  if (rule !== null) return rule.allowed
  return DEFAULT_PERMISSIONS[role]?.[action] ?? false
}

// Returns null if user not found in org. Returns { allowed, organizationId }.
export async function checkPermission(
  userId: string,
  action: string,
  projectId?: string
): Promise<{ allowed: boolean; organizationId: string } | null> {
  const orgMember = await prisma.organizationMember.findFirst({ where: { userId } })
  if (!orgMember) return null
  const { organizationId, role: orgRole } = orgMember
  if (orgRole === 'ADMIN') return { allowed: true, organizationId }
  if (await isRoleAllowed(organizationId, orgRole, action)) return { allowed: true, organizationId }
  if (projectId) {
    const pm = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } })
    if (pm && await isRoleAllowed(organizationId, pm.role, action)) return { allowed: true, organizationId }
  }
  return { allowed: false, organizationId }
}
