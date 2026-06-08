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
  const now = new Date()
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, archivedAt: null },
    orderBy: { updatedAt: 'desc' },
  })

  const projectIds = projects.map(p => p.id)

  const [allTasks, milestones, objectives] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, status: true },
    }),
    prisma.milestone.findMany({
      where: {
        projectId: { in: projectIds },
        status: 'A_VENIR',
        plannedDate: { gte: now, lte: in30days },
      },
      orderBy: { plannedDate: 'asc' },
      take: 5,
    }),
    prisma.projectObjective.findMany({
      where: { projectId: { in: projectIds } },
      select: { status: true },
    }),
  ])

  // KPIs
  const activeProjects = projects.filter(p => p.status === 'EN_COURS' || p.status === 'CRITIQUE').length

  const tasksInProgress = allTasks.filter(t => t.status === 'EN_COURS').length

  const upcomingMilestones = milestones.length

  const totalObjectives = objectives.length
  const objectivesRate = totalObjectives > 0
    ? Math.round((objectives.filter(o => o.status === 'ATTEINT').length / totalObjectives) * 100)
    : 0

  // Recent projects (5 derniers modifiés)
  const projectMap = new Map(projects.map(p => [p.id, p]))
  const tasksByProject = new Map<string, { total: number; done: number }>()
  for (const task of allTasks) {
    const existing = tasksByProject.get(task.projectId) ?? { total: 0, done: 0 }
    tasksByProject.set(task.projectId, {
      total: existing.total + 1,
      done: existing.done + (task.status === 'TERMINE' ? 1 : 0),
    })
  }

  const recentProjects = projects.slice(0, 5).map(p => {
    const tasks = tasksByProject.get(p.id) ?? { total: 0, done: 0 }
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      color: p.color,
      endDate: p.endDate,
      taskTotal: tasks.total,
      taskDone: tasks.done,
    }
  })

  // Upcoming milestones with project names (reuse already fetched projects)
  const milestoneProjectMap = new Map(projects.map(p => [p.id, p.name]))

  const upcomingMilestonesList = milestones.map(m => ({
    id: m.id,
    title: m.title,
    plannedDate: m.plannedDate,
    projectName: milestoneProjectMap.get(m.projectId) ?? 'Projet inconnu',
    status: m.status,
  }))

  return NextResponse.json({
    activeProjects,
    tasksInProgress,
    upcomingMilestones,
    objectivesRate,
    recentProjects,
    upcomingMilestonesList,
  })
}
