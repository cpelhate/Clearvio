import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    include: { deliverables: true },
    orderBy: { plannedDate: 'asc' },
  })
  return NextResponse.json(milestones)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
  if (!body.plannedDate) return NextResponse.json({ error: 'Date prévue requise' }, { status: 400 })

  const milestone = await prisma.milestone.create({
    data: {
      projectId,
      title: body.title.trim(),
      plannedDate: new Date(body.plannedDate),
      status: body.status || 'A_VENIR',
      showOnGantt: body.showOnGantt ?? true,
    },
  })
  return NextResponse.json(milestone, { status: 201 })
}
