import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; objectiveId: string }> }) {
  const { objectiveId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

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
  const { objectiveId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await prisma.projectObjective.delete({ where: { id: objectiveId } })
  return NextResponse.json({ success: true })
}
