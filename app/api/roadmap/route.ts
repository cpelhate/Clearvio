import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const projects = await prisma.project.findMany({
    where: {
      organizationId: member.organizationId,
      status: { not: 'ARCHIVE' },
    },
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      category: true,
      startDate: true,
      endDate: true,
    },
    orderBy: { startDate: 'asc' },
  })

  const projectIds = projects.map(p => p.id)

  const milestones = await prisma.milestone.findMany({
    where: { projectId: { in: projectIds } },
    select: {
      id: true,
      projectId: true,
      title: true,
      plannedDate: true,
      status: true,
    },
    orderBy: { plannedDate: 'asc' },
  })

  return NextResponse.json({ projects, milestones })
}
