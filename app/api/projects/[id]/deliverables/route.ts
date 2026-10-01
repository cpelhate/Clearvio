import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const deliverables = await prisma.deliverable.findMany({
    where: { projectId },
    include: { task: { select: { id: true, title: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(deliverables)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.DELIVERABLE_CREATE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  const deliverable = await prisma.deliverable.create({
    data: {
      projectId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      milestoneId: body.milestoneId || null,
      taskId: body.taskId || null,
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : null,
      status: body.status || 'A_FAIRE',
    },
  })
  return NextResponse.json(deliverable, { status: 201 })
}
