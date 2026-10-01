import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    include: {
      deliverables: { include: { task: { select: { id: true, title: true, status: true } } } },
      type: true,
      tasks: {
        where: { parentId: null },
        include: { children: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: { plannedDate: 'asc' },
  })
  return NextResponse.json(milestones)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.MILESTONE_CREATE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
  if (!body.plannedDate) return NextResponse.json({ error: 'Date prévue requise' }, { status: 400 })

  const milestone = await prisma.milestone.create({
    data: {
      projectId,
      title: body.title.trim(),
      shortName: body.shortName ? body.shortName.slice(0, 6) : null,
      description: body.description ?? null,
      plannedDate: new Date(body.plannedDate),
      status: body.status || 'A_VENIR',
      showOnGantt: body.showOnGantt ?? true,
      color: body.color ?? null,
      icon: body.icon ?? null,
      typeId: body.typeId ?? null,
    },
    include: { type: true },
  })
  return NextResponse.json(milestone, { status: 201 })
}
