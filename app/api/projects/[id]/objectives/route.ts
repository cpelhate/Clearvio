import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const objectives = await prisma.projectObjective.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(objectives)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.OBJECTIVE_CREATE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  const count = await prisma.projectObjective.count({ where: { projectId } })
  if (count >= 10) return NextResponse.json({ error: 'Maximum 10 objectifs par projet' }, { status: 400 })

  const objective = await prisma.projectObjective.create({
    data: {
      projectId,
      title: body.title.trim(),
      successIndicator: body.successIndicator?.trim() || null,
      status: body.status || 'PREVU',
      order: count,
    },
  })
  return NextResponse.json(objective, { status: 201 })
}
