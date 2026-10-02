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
  const isAdmin = member.role === 'ADMIN'
  const now = new Date()
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, archivedAt: null },
    orderBy: { updatedAt: 'desc' },
  })

  const projectIds = projects.map(p => p.id)

  const [allTasks, milestones, objectives, myTodayTasks] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, status: true, assigneeId: true, dueDate: true, updatedAt: true },
    }),
    prisma.milestone.findMany({
      where: {
        projectId: { in: projectIds },
        status: 'A_VENIR',
        plannedDate: { gte: now, lte: in30days },
      },
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { id: true, status: true } },
      },
      orderBy: { plannedDate: 'asc' },
      take: 5,
    }),
    prisma.projectObjective.findMany({
      where: { projectId: { in: projectIds } },
      select: { status: true },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        assigneeId: user.id,
        status: { not: 'TERMINE' },
        OR: [
          { dueDate: { lte: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1) } },
          { status: 'EN_COURS' },
        ],
      },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, projectId: true },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 8,
    }),
  ])

  // KPIs
  const activeProjects = projects.filter(p => p.status === 'EN_COURS' || p.status === 'CRITIQUE').length
  const tasksInProgress = allTasks.filter(t => t.status === 'EN_COURS').length
  const tasksOverdue = allTasks.filter(t =>
    t.status !== 'TERMINE' && t.dueDate && new Date(t.dueDate) < now
  ).length
  const tasksDoneToday = allTasks.filter(t =>
    t.status === 'TERMINE' && t.updatedAt >= todayStart
  ).length
  const upcomingMilestones = milestones.length

  const totalObjectives = objectives.length
  const objectivesRate = totalObjectives > 0
    ? Math.round((objectives.filter(o => o.status === 'ATTEINT').length / totalObjectives) * 100)
    : 0

  // Tasks by status (for segmented bar)
  const tasksByStatus = {
    A_FAIRE: allTasks.filter(t => t.status === 'A_FAIRE').length,
    EN_COURS: allTasks.filter(t => t.status === 'EN_COURS').length,
    EN_REVUE: allTasks.filter(t => t.status === 'EN_REVUE').length,
    TERMINE: allTasks.filter(t => t.status === 'TERMINE').length,
    BLOQUE: allTasks.filter(t => t.status === 'BLOQUE').length,
  }

  // Recent projects (5 derniers modifiés)
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

  // Upcoming milestones with project names
  const milestoneProjectMap = new Map(projects.map(p => [p.id, p.name]))

  const upcomingMilestonesList = milestones.map(m => ({
    id: m.id,
    title: m.title,
    plannedDate: m.plannedDate,
    projectId: m.projectId,
    projectName: milestoneProjectMap.get(m.projectId) ?? 'Projet inconnu',
    status: m.status,
    taskCount: m._count.tasks,
    taskDone: m.tasks.filter(t => t.status === 'TERMINE').length,
  }))

  // My today tasks with project names
  const myTodayTasksWithProject = myTodayTasks.map(t => ({
    ...t,
    projectName: projects.find(p => p.id === t.projectId)?.name ?? '',
  }))

  // Member workload (admin only)
  let memberWorkload: { userId: string; name: string | null; count: number }[] = []
  if (isAdmin) {
    const activeTasks = allTasks.filter(t => t.status !== 'TERMINE' && t.assigneeId)
    const workloadMap = new Map<string, number>()
    for (const t of activeTasks) {
      if (t.assigneeId) workloadMap.set(t.assigneeId, (workloadMap.get(t.assigneeId) ?? 0) + 1)
    }
    const userIds = Array.from(workloadMap.keys())
    const profiles = await prisma.profile.findMany({ where: { id: { in: userIds } } })
    const profileMap = new Map(profiles.map(p => [p.id, p.fullName]))
    memberWorkload = Array.from(workloadMap.entries())
      .map(([userId, count]) => ({ userId, name: profileMap.get(userId) ?? null, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }

  return NextResponse.json({
    activeProjects,
    tasksInProgress,
    tasksOverdue,
    tasksDoneToday,
    upcomingMilestones,
    objectivesRate,
    tasksByStatus,
    recentProjects,
    upcomingMilestonesList,
    myTodayTasks: myTodayTasksWithProject,
    memberWorkload,
    isAdmin,
  })
}
