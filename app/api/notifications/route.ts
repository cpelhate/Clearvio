import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export interface Notification {
  id: string
  type: 'milestone_due' | 'milestone_overdue' | 'task_due' | 'task_overdue' | 'project_late'
  message: string
  projectId: string
  projectName: string
  date: string
  severity: 'warning' | 'danger'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json([])

  const now = new Date()
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const projects = await prisma.project.findMany({
    where: { organizationId: member.organizationId, status: { not: 'ARCHIVE' } },
    select: { id: true, name: true, endDate: true, status: true },
  })

  const projectIds = projects.map(p => p.id)
  const projectMap = new Map(projects.map(p => [p.id, p.name]))

  const [milestones, tasks] = await Promise.all([
    prisma.milestone.findMany({
      where: {
        projectId: { in: projectIds },
        status: 'A_VENIR',
        plannedDate: { lte: in7days },
      },
      select: { id: true, projectId: true, title: true, plannedDate: true },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        status: { notIn: ['TERMINE'] },
        dueDate: { lte: in3days, not: null },
      },
      select: { id: true, projectId: true, title: true, dueDate: true },
    }),
  ])

  const notifications: Notification[] = []

  // Projets en retard
  for (const p of projects) {
    if (p.endDate && new Date(p.endDate) < now && p.status !== 'TERMINE') {
      notifications.push({
        id: `project-late-${p.id}`,
        type: 'project_late',
        message: `Le projet "${p.name}" est en retard`,
        projectId: p.id,
        projectName: p.name,
        date: new Date(p.endDate!).toISOString(),
        severity: 'danger',
      })
    }
  }

  // Jalons
  for (const m of milestones) {
    const isOverdue = new Date(m.plannedDate) < now
    notifications.push({
      id: `milestone-${m.id}`,
      type: isOverdue ? 'milestone_overdue' : 'milestone_due',
      message: isOverdue
        ? `Jalon "${m.title}" dépassé`
        : `Jalon "${m.title}" dans moins de 7 jours`,
      projectId: m.projectId,
      projectName: projectMap.get(m.projectId) ?? '',
      date: new Date(m.plannedDate).toISOString(),
      severity: isOverdue ? 'danger' : 'warning',
    })
  }

  // Tâches
  for (const t of tasks) {
    if (!t.dueDate) continue
    const isOverdue = new Date(t.dueDate) < now
    notifications.push({
      id: `task-${t.id}`,
      type: isOverdue ? 'task_overdue' : 'task_due',
      message: isOverdue
        ? `Tâche "${t.title}" en retard`
        : `Tâche "${t.title}" à rendre dans moins de 3 jours`,
      projectId: t.projectId,
      projectName: projectMap.get(t.projectId) ?? '',
      date: new Date(t.dueDate!).toISOString(),
      severity: isOverdue ? 'danger' : 'warning',
    })
  }

  // Tri : danger d'abord, puis par date
  notifications.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'danger' ? -1 : 1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  return NextResponse.json(notifications)
}
