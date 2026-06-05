import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const { milestoneId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.plannedDate !== undefined && { plannedDate: new Date(body.plannedDate) }),
      ...(body.actualDate !== undefined && { actualDate: body.actualDate ? new Date(body.actualDate) : null }),
      ...(body.showOnGantt !== undefined && { showOnGantt: body.showOnGantt }),
    },
  })
  return NextResponse.json(milestone)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const { milestoneId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await prisma.milestone.delete({ where: { id: milestoneId } })
  return NextResponse.json({ success: true })
}
