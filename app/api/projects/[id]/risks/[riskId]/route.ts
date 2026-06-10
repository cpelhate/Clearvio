import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; riskId: string }> }) {
  const { id: projectId, riskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.RISK_EDIT, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  const risk = await prisma.projectRisk.update({
    where: { id: riskId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.probability !== undefined && { probability: body.probability }),
      ...(body.impact !== undefined && { impact: body.impact }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.mitigation !== undefined && { mitigation: body.mitigation }),
    },
  })
  return NextResponse.json(risk)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; riskId: string }> }) {
  const { id: projectId, riskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.RISK_DELETE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  await prisma.projectRisk.delete({ where: { id: riskId } })
  return NextResponse.json({ success: true })
}
