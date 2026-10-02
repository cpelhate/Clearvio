import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ tasks: [], projects: [], milestones: [], deliverables: [] })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ tasks: [], projects: [], milestones: [], deliverables: [] })

  const projectIds = (await prisma.project.findMany({
    where: { organizationId: member.organizationId, archivedAt: null },
    select: { id: true },
  })).map(p => p.id)

  const milestoneIds = (await prisma.milestone.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true },
  })).map(m => m.id)

  const [tasks, projects, milestones, deliverables] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: { in: projectIds }, title: { contains: q, mode: 'insensitive' } },
      select: { id: true, title: true, status: true, projectId: true, assigneeId: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: { organizationId: member.organizationId, archivedAt: null, name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    prisma.milestone.findMany({
      where: { projectId: { in: projectIds }, title: { contains: q, mode: 'insensitive' } },
      select: { id: true, title: true, status: true, projectId: true, plannedDate: true },
      take: 5,
    }),
    prisma.deliverable.findMany({
      where: { milestoneId: { in: milestoneIds }, title: { contains: q, mode: 'insensitive' } },
      select: { id: true, title: true, status: true, milestoneId: true },
      take: 5,
    }),
  ])

  return NextResponse.json({ tasks, projects, milestones, deliverables })
}
