import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  const [project, tasks, milestones, risks, objectives, deliverables] = await Promise.all([
    prisma.project.findUnique({ where: { id }, include: { members: true } }),
    prisma.task.findMany({ where: { projectId: id }, orderBy: { order: 'asc' } }),
    prisma.milestone.findMany({ where: { projectId: id }, orderBy: { plannedDate: 'asc' } }),
    prisma.projectRisk.findMany({ where: { projectId: id }, orderBy: { order: 'asc' } }),
    prisma.projectObjective.findMany({ where: { projectId: id }, orderBy: { order: 'asc' } }),
    prisma.deliverable.findMany({ where: { projectId: id }, orderBy: { createdAt: 'asc' } }),
  ])

  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

  return NextResponse.json({ project, tasks, milestones, risks, objectives, deliverables })
}
