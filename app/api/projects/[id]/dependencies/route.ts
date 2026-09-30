import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DependableType, DependencyType } from '@prisma/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Récupérer tous les IDs d'éléments du projet
  const [milestones, deliverables, tasks] = await Promise.all([
    prisma.milestone.findMany({ where: { projectId }, select: { id: true } }),
    prisma.deliverable.findMany({ where: { projectId }, select: { id: true } }),
    prisma.task.findMany({ where: { projectId }, select: { id: true } }),
  ])

  const allIds = [
    ...milestones.map(m => m.id),
    ...deliverables.map(d => d.id),
    ...tasks.map(t => t.id),
  ]

  const dependencies = await prisma.dependency.findMany({
    where: {
      OR: [
        { sourceId: { in: allIds } },
        { targetId: { in: allIds } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(dependencies)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const { sourceType, sourceId, targetType, targetId, type = 'FIN_DEBUT', lagDays = 0 } = body

  if (!sourceType || !sourceId || !targetType || !targetId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  if (sourceId === targetId && sourceType === targetType) {
    return NextResponse.json({ error: 'Une dépendance ne peut pas pointer sur elle-même' }, { status: 400 })
  }

  const dep = await prisma.dependency.create({
    data: {
      id: crypto.randomUUID(),
      sourceType: sourceType as DependableType,
      sourceId,
      targetType: targetType as DependableType,
      targetId,
      type: type as DependencyType,
      lagDays: lagDays ?? 0,
    },
  })
  return NextResponse.json(dep, { status: 201 })
}
