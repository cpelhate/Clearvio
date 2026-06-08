import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const orgId = member.organizationId

  // 1. Récupérer tous les projets non archivés
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, status: { not: 'ARCHIVE' } },
    include: { members: true },
    orderBy: { updatedAt: 'desc' },
  })

  const projectIds = projects.map(p => p.id)

  // 2. Requêtes parallèles
  const [tasks, milestones, risks] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, status: true, dueDate: true },
    }),
    prisma.milestone.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, status: true, plannedDate: true },
      orderBy: { plannedDate: 'asc' },
    }),
    prisma.projectRisk.findMany({
      where: { projectId: { in: projectIds }, status: { in: ['OUVERT', 'EN_COURS'] } },
      select: { projectId: true, probability: true, impact: true, status: true },
    }),
  ])

  const now = new Date()

  // 3. Calculer les métriques par projet
  const projectsWithMetrics = projects.map(p => {
    const pTasks = tasks.filter(t => t.projectId === p.id)
    const pMilestones = milestones.filter(m => m.projectId === p.id)
    const pRisks = risks.filter(r => r.projectId === p.id)

    const taskTotal = pTasks.length
    const taskDone = pTasks.filter(t => t.status === 'TERMINE').length
    const taskProgress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0

    // Prochain jalon à venir
    const nextMilestone = pMilestones.find(m => m.status === 'A_VENIR' && new Date(m.plannedDate) >= now)

    // Niveau de risque max (score = proba × impact)
    const riskScore: Record<string, number> = { FAIBLE: 1, MOYEN: 2, ELEVE: 3 }
    const maxRiskScore = pRisks.reduce((max, r) => {
      const score = (riskScore[r.probability] ?? 0) * (riskScore[r.impact] ?? 0)
      return score > max ? score : max
    }, 0)
    const maxRiskLevel = maxRiskScore >= 9 ? 'CRITIQUE' : maxRiskScore >= 4 ? 'ELEVE' : maxRiskScore >= 2 ? 'MOYEN' : maxRiskScore > 0 ? 'FAIBLE' : null

    // Retard : date de fin dépassée et projet pas terminé
    const isLate = p.endDate && new Date(p.endDate) < now && p.status !== 'TERMINE'

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      color: p.color,
      category: p.category,
      startDate: p.startDate,
      endDate: p.endDate,
      membersCount: p.members.length,
      taskTotal,
      taskDone,
      taskProgress,
      nextMilestone: nextMilestone ? {
        plannedDate: nextMilestone.plannedDate,
      } : null,
      openRisksCount: pRisks.length,
      maxRiskLevel,
      isLate,
    }
  })

  // 4. KPIs globaux
  const byStatus = {
    INITIALISATION: projects.filter(p => p.status === 'INITIALISATION').length,
    EN_COURS: projects.filter(p => p.status === 'EN_COURS').length,
    EN_ATTENTE: projects.filter(p => p.status === 'EN_ATTENTE').length,
    CRITIQUE: projects.filter(p => p.status === 'CRITIQUE').length,
    TERMINE: projects.filter(p => p.status === 'TERMINE').length,
  }

  const lateCount = projectsWithMetrics.filter(p => p.isLate).length
  const criticalRiskCount = projectsWithMetrics.filter(p => p.maxRiskLevel === 'CRITIQUE' || p.maxRiskLevel === 'ELEVE').length
  const avgProgress = projectsWithMetrics.length > 0
    ? Math.round(projectsWithMetrics.reduce((s, p) => s + p.taskProgress, 0) / projectsWithMetrics.length)
    : 0

  return NextResponse.json({
    summary: {
      total: projects.length,
      byStatus,
      lateCount,
      criticalRiskCount,
      avgProgress,
    },
    projects: projectsWithMetrics,
  })
}
