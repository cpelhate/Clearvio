import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendDocumentDeletedEmail } from '@/lib/mailer'

const BUCKET = 'project-documents'

type Params = { params: Promise<{ id: string; documentId: string }> }

async function canDelete(userId: string, projectId: string, doc: { uploadedBy: string }): Promise<boolean> {
  if (doc.uploadedBy === userId) return true
  // Admin projet
  const pm = await prisma.projectMember.findFirst({ where: { projectId, userId } })
  if (pm?.role === 'CO_RESPONSABLE') return true
  // Admin org
  const om = await prisma.organizationMember.findFirst({ where: { userId, role: 'ADMIN' } })
  return !!om
}

export async function DELETE(_req: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId, documentId } = await params

  const doc = await prisma.projectDocument.findUnique({ where: { id: documentId } })
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  if (!(await canDelete(user.id, projectId, doc))) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  // Supprimer du storage
  await supabase.storage.from(BUCKET).remove([doc.storagePath])

  // Supprimer de la DB
  await prisma.projectDocument.delete({ where: { id: documentId } })

  // Email si supprimé par quelqu'un d'autre que l'auteur
  if (doc.uploadedBy !== user.id) {
    try {
      const [uploaderProfile, deleterProfile, orgMember, project] = await Promise.all([
        prisma.profile.findUnique({ where: { id: doc.uploadedBy }, select: { email: true } }),
        prisma.profile.findUnique({ where: { id: user.id }, select: { fullName: true } }),
        prisma.organizationMember.findFirst({ where: { userId: user.id }, select: { organizationId: true } }),
        prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
      ])
      if (uploaderProfile?.email && orgMember) {
        await sendDocumentDeletedEmail({
          organizationId: orgMember.organizationId,
          toEmail: uploaderProfile.email,
          fileName: doc.name,
          projectName: project?.name ?? projectId,
          deletedByName: deleterProfile?.fullName ?? 'Un administrateur',
        })
      }
    } catch {
      // L'email est best-effort, ne pas bloquer la suppression
    }
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId, documentId } = await params

  const doc = await prisma.projectDocument.findUnique({ where: { id: documentId } })
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  if (!(await canDelete(user.id, projectId, doc))) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const { visibility, permissionUserIds = [] } = await req.json()

  // Mettre à jour la visibilité et les permissions
  await prisma.documentPermission.deleteMany({ where: { documentId } })

  const updated = await prisma.projectDocument.update({
    where: { id: documentId },
    data: {
      visibility,
      permissions: visibility === 'SPECIFIC' && permissionUserIds.length > 0
        ? { create: permissionUserIds.map((uid: string) => ({ userId: uid })) }
        : undefined,
    },
    include: { permissions: { select: { userId: true } } },
  })

  return NextResponse.json(updated)
}
