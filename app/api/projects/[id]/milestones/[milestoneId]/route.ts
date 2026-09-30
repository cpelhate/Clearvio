import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const { id: projectId, milestoneId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.MILESTONE_EDIT, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.shortName !== undefined && { shortName: body.shortName ? body.shortName.slice(0, 6) : null }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.plannedDate !== undefined && { plannedDate: new Date(body.plannedDate) }),
      ...(body.actualDate !== undefined && { actualDate: body.actualDate ? new Date(body.actualDate) : null }),
      ...(body.showOnGantt !== undefined && { showOnGantt: body.showOnGantt }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.typeId !== undefined && { typeId: body.typeId }),
    },
    include: { type: true },
  })
  return NextResponse.json(milestone)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const { id: projectId, milestoneId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.MILESTONE_DELETE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  await prisma.milestone.delete({ where: { id: milestoneId } })
  return NextResponse.json({ success: true })
}
