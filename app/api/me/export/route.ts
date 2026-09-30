import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const userId = user.id

  const [
    orgMember,
    projectMembers,
    projectsCreated,
    projectsManaged,
    tasksAssigned,
    comments,
    deliverables,
    documents,
    invitations,
  ] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId },
      include: { organization: { select: { name: true, slug: true, createdAt: true } } },
    }),
    prisma.projectMember.findMany({
      where: { userId },
      include: { project: { select: { name: true, status: true, startDate: true, endDate: true } } },
    }),
    prisma.project.findMany({
      where: { createdBy: userId },
      select: { id: true, name: true, status: true, startDate: true, endDate: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: { managerId: userId, createdBy: { not: userId } },
      select: { id: true, name: true, status: true, startDate: true, endDate: true },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId },
      select: { id: true, title: true, status: true, priority: true, startDate: true, dueDate: true, createdAt: true },
    }),
    prisma.taskComment.findMany({
      where: { userId },
      select: { id: true, taskId: true, content: true, createdAt: true, updatedAt: true },
    }),
    prisma.deliverable.findMany({
      where: { responsibleId: userId },
      select: { id: true, title: true, status: true, plannedDate: true, createdAt: true },
    }),
    prisma.projectDocument.findMany({
      where: { uploadedBy: userId },
      select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
    }),
    prisma.inviteToken.findMany({
      where: { createdBy: userId },
      select: { id: true, email: true, createdAt: true, expiresAt: true, usedAt: true },
    }),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    profil: {
      userId: user.id,
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    },
    organisation: orgMember ? {
      nom: orgMember.organization.name,
      slug: orgMember.organization.slug,
      role: orgMember.role,
      dateAdhesion: orgMember.joinedAt,
      organisationCreeLe: orgMember.organization.createdAt,
    } : null,
    projetsMembre: projectMembers.map(pm => ({
      projetId: pm.projectId,
      projetNom: pm.project.name,
      statut: pm.project.status,
      role: pm.role,
      dateDebut: pm.project.startDate,
      dateFin: pm.project.endDate,
      dateAdhesion: pm.joinedAt,
    })),
    projetsCreés: projectsCreated.map(p => ({
      id: p.id,
      nom: p.name,
      statut: p.status,
      dateDebut: p.startDate,
      dateFin: p.endDate,
      créeLe: p.createdAt,
    })),
    projetsManagés: projectsManaged.map(p => ({
      id: p.id,
      nom: p.name,
      statut: p.status,
      dateDebut: p.startDate,
      dateFin: p.endDate,
    })),
    tachesAssignées: tasksAssigned.map(t => ({
      id: t.id,
      titre: t.title,
      statut: t.status,
      priorité: t.priority,
      dateDebut: t.startDate,
      dateEcheance: t.dueDate,
      créeLe: t.createdAt,
    })),
    commentaires: comments.map(c => ({
      id: c.id,
      tacheId: c.taskId,
      contenu: c.content,
      créeLe: c.createdAt,
      modifiéLe: c.updatedAt,
    })),
    livrables: deliverables.map(d => ({
      id: d.id,
      titre: d.title,
      statut: d.status,
      datePrévue: d.plannedDate,
      créeLe: d.createdAt,
    })),
    documentsUploadés: documents.map(d => ({
      id: d.id,
      nom: d.name,
      typeMedia: d.mimeType,
      tailleOctets: d.size,
      uploadéLe: d.createdAt,
    })),
    invitationsEnvoyées: invitations.map(i => ({
      id: i.id,
      emailInvité: i.email,
      envoyéeLe: i.createdAt,
      expireLe: i.expiresAt,
      utiliséeLe: i.usedAt,
    })),
  }

  const filename = `clearvio-export-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[export] Error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur', detail: message }, { status: 500 })
  }
}
