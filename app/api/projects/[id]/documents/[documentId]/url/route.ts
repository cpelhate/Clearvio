import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const BUCKET = 'project-documents'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { documentId } = await params

  const doc = await prisma.projectDocument.findUnique({
    where: { id: documentId },
    include: { permissions: { select: { userId: true } } },
  })
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  // Vérifier l'accès
  const isOrgAdmin = !!(await prisma.organizationMember.findFirst({ where: { userId: user.id, role: 'ADMIN' } }))
  const hasAccess =
    isOrgAdmin ||
    doc.uploadedBy === user.id ||
    doc.visibility === 'PROJECT' ||
    (doc.visibility === 'SPECIFIC' && doc.permissions.some(p => p.userId === user.id))

  if (!hasAccess) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storagePath, 120)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Impossible de générer le lien de téléchargement' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
