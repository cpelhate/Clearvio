import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; riskId: string }> }) {
  const { riskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

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
  const { riskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await prisma.projectRisk.delete({ where: { id: riskId } })
  return NextResponse.json({ success: true })
}
