import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  })

  if (!invite) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
  if (invite.usedAt) return NextResponse.json({ error: 'Invitation déjà utilisée' }, { status: 410 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invitation expirée' }, { status: 410 })

  // Compter les projets sélectionnés
  let projectCount = 0
  if (invite.allProjects) {
    projectCount = await prisma.project.count({
      where: { organizationId: invite.organizationId, status: { not: 'ARCHIVE' } },
    })
  } else {
    projectCount = invite.projectIds.length
  }

  return NextResponse.json({
    email: invite.email,
    orgName: invite.organization.name,
    orgRole: invite.orgRole,
    projectRole: invite.projectRole,
    allProjects: invite.allProjects,
    projectCount,
    message: invite.message,
    expiresAt: invite.expiresAt,
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const invite = await prisma.inviteToken.findUnique({ where: { token } })
  if (!invite) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
  if (invite.usedAt) return NextResponse.json({ error: 'Invitation déjà utilisée' }, { status: 410 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invitation expirée' }, { status: 410 })

  // Vérifier si déjà membre
  const existing = await prisma.organizationMember.findFirst({
    where: { organizationId: invite.organizationId, userId: user.id },
  })

  if (!existing) {
    // Ajouter à l'organisation
    await prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.orgRole,
      },
    })
  }

  // Ajouter aux projets
  let projectIds: string[] = []
  if (invite.allProjects) {
    const projects = await prisma.project.findMany({
      where: { organizationId: invite.organizationId, status: { not: 'ARCHIVE' } },
      select: { id: true },
    })
    projectIds = projects.map(p => p.id)
  } else {
    projectIds = invite.projectIds
  }

  for (const projectId of projectIds) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      create: { projectId, userId: user.id, role: invite.projectRole },
      update: {},
    })
  }

  // Marquer comme utilisé
  await prisma.inviteToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  return NextResponse.json({ ok: true, organizationId: invite.organizationId })
}
