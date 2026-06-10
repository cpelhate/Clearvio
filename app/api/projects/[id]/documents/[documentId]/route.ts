import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

const BUCKET = 'documents-clearvio'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId, documentId } = await params

  const perm = await checkPermission(user.id, ACTIONS.DOCUMENT_DELETE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const doc = await prisma.projectDocument.findUnique({ where: { id: documentId } })
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  // Supprimer de Supabase Storage
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.storagePath])
  if (storageError) {
    console.error('Storage delete error:', storageError)
    // On continue quand même pour nettoyer la base
  }

  // Supprimer de la base Prisma
  await prisma.projectDocument.delete({ where: { id: documentId } })

  return NextResponse.json({ success: true })
}
