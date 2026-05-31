import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const projects = await prisma.project.findMany({
    where: {
      organizationId: member.organizationId,
      archivedAt: null,
    },
    include: {
      members: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const body = await request.json()
  const { name, description, status, startDate, endDate, category, color } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const project = await prisma.project.create({
    data: {
      organizationId: member.organizationId,
      name: name.trim(),
      description: description?.trim() || null,
      status: status || 'INITIALISATION',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      category: category?.trim() || null,
      color: color || '#1D3461',
      managerId: user.id,
      createdBy: user.id,
    },
  })

  // Ajouter le créateur comme membre co-responsable
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: user.id,
      role: 'CO_RESPONSABLE',
    },
  })

  return NextResponse.json(project, { status: 201 })
}
