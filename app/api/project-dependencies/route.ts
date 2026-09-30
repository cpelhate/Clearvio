import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ProjectLinkType } from '@prisma/client'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  // Tous les projets de l'org
  const projects = await prisma.project.findMany({
    where: { organizationId: member.organizationId },
    select: { id: true },
  })
  const projectIds = projects.map(p => p.id)

  const deps = await prisma.projectDependency.findMany({
    where: {
      OR: [
        { sourceProjectId: { in: projectIds } },
        { targetProjectId: { in: projectIds } },
      ],
    },
    include: {
      sourceProject: { select: { id: true, name: true, status: true } },
      targetProject: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(deps)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const body = await request.json()
  const { sourceProjectId, targetProjectId, type = 'SUCCESSION', lagDays = 0 } = body

  if (!sourceProjectId || !targetProjectId) {
    return NextResponse.json({ error: 'Projets source et cible requis' }, { status: 400 })
  }
  if (sourceProjectId === targetProjectId) {
    return NextResponse.json({ error: 'Un projet ne peut pas dépendre de lui-même' }, { status: 400 })
  }

  const dep = await prisma.projectDependency.create({
    data: {
      id: crypto.randomUUID(),
      sourceProjectId,
      targetProjectId,
      type: type as ProjectLinkType,
      lagDays: lagDays ?? 0,
    },
    include: {
      sourceProject: { select: { id: true, name: true, status: true } },
      targetProject: { select: { id: true, name: true, status: true } },
    },
  })
  return NextResponse.json(dep, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await request.json()
  await prisma.projectDependency.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
