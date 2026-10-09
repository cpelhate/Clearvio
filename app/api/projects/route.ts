import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const projects = await prisma.project.findMany({
    where: {
      organizationId: member.organizationId,
      archivedAt: null,
    },
    include: {
      members: true,
      _count: false,
    },
    orderBy: { createdAt: 'desc' },
  })

  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const projectIds = projects.map(p => p.id)

  // Fetch tasks, risks, milestones for all projects in 3 parallel queries
  const [tasks, risks, milestones] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: { in: projectIds }, parentId: null },
      select: { projectId: true, status: true, dueDate: true },
    }),
    prisma.projectRisk.findMany({
      where: { projectId: { in: projectIds }, status: { in: ['OUVERT', 'EN_COURS'] } },
      select: { projectId: true },
    }),
    prisma.milestone.findMany({
      where: {
        projectId: { in: projectIds },
        status: 'A_VENIR',
        plannedDate: { gte: now, lte: in30 },
      },
      select: { projectId: true },
    }),
  ])

  // Group by projectId
  const tasksByProject = new Map<string, typeof tasks>()
  const risksByProject = new Map<string, number>()
  const milestonesByProject = new Map<string, number>()

  for (const t of tasks) {
    if (!tasksByProject.has(t.projectId)) tasksByProject.set(t.projectId, [])
    tasksByProject.get(t.projectId)!.push(t)
  }
  for (const r of risks) risksByProject.set(r.projectId, (risksByProject.get(r.projectId) ?? 0) + 1)
  for (const m of milestones) milestonesByProject.set(m.projectId, (milestonesByProject.get(m.projectId) ?? 0) + 1)

  const enriched = projects.map(p => {
    const pts = tasksByProject.get(p.id) ?? []
    const total = pts.length
    const termine = pts.filter(t => t.status === 'TERMINE').length
    const enCours = pts.filter(t => t.status === 'EN_COURS').length
    const bloque = pts.filter(t => t.status === 'BLOQUE').length
    const enRetard = pts.filter(t =>
      t.status !== 'TERMINE' && t.dueDate != null && new Date(t.dueDate) < now
    ).length
    const progressPct = total > 0 ? Math.round((termine / total) * 100) : 0
    const risquesOuverts = risksByProject.get(p.id) ?? 0
    const jalonsProchains = milestonesByProject.get(p.id) ?? 0

    // Health indicator
    let health: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL'
    if (p.status === 'CRITIQUE' || enRetard >= 3 || (p.endDate && new Date(p.endDate) < now && p.status !== 'TERMINE')) {
      health = 'CRITICAL'
    } else if (enRetard > 0 || bloque > 1 || p.status === 'EN_ATTENTE') {
      health = 'AT_RISK'
    } else {
      health = 'ON_TRACK'
    }

    return {
      ...p,
      taskStats: { total, termine, enCours, bloque, enRetard },
      progressPct,
      risquesOuverts,
      jalonsProchains,
      health,
    }
  })

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.PROJECT_CREATE)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  const { name, description, status, startDate, endDate, category, color } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const project = await prisma.project.create({
    data: {
      organizationId: perm.organizationId,
      name: name.trim(),
      description: description?.trim() || null,
      status: status || 'INITIALISATION',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      category: category?.trim() || null,
      color: color || '#1D3461',
      managerId: user.id,
      createdBy: user.id,
    },
  })

  // Ajouter le créateur comme membre co-responsable
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: user.id,
      role: 'CO_RESPONSABLE',
    },
  })

  return NextResponse.json(project, { status: 201 })
}
