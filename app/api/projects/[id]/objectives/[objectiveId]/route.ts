import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; objectiveId: string }> }) {
  const { id: projectId, objectiveId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.OBJECTIVE_EDIT, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  const objective = await prisma.projectObjective.update({
    where: { id: objectiveId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.successIndicator !== undefined && { successIndicator: body.successIndicator }),
      ...(body.status !== undefined && { status: body.status }),
    },
  })
  return NextResponse.json(objective)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; objectiveId: string }> }) {
  const { id: projectId, objectiveId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.OBJECTIVE_DELETE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  await prisma.projectObjective.delete({ where: { id: objectiveId } })
  return NextResponse.json({ success: true })
}
