import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const risks = await prisma.projectRisk.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(risks)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  const count = await prisma.projectRisk.count({ where: { projectId } })

  const risk = await prisma.projectRisk.create({
    data: {
      projectId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      probability: body.probability || 'MOYEN',
      impact: body.impact || 'MOYEN',
      status: body.status || 'OUVERT',
      mitigation: body.mitigation?.trim() || null,
      order: count,
    },
  })
  return NextResponse.json(risk, { status: 201 })
}
