import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; deliverableId: string }> }) {
  const { id: projectId, deliverableId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.DELIVERABLE_EDIT, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  const deliverable = await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.milestoneId !== undefined && { milestoneId: body.milestoneId }),
      ...(body.plannedDate !== undefined && { plannedDate: body.plannedDate ? new Date(body.plannedDate) : null }),
    },
  })
  return NextResponse.json(deliverable)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; deliverableId: string }> }) {
  const { id: projectId, deliverableId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.DELIVERABLE_DELETE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  await prisma.deliverable.delete({ where: { id: deliverableId } })
  return NextResponse.json({ success: true })
}
