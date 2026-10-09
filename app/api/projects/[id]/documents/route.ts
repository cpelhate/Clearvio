import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { PLAN_LIMITS } from '@/lib/plans'

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
]
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 Mo

async function getOrgAndPlan(userId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: { select: { id: true, plan: true, name: true } } },
  })
  return member
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId } = await params

  const orgMember = await getOrgAndPlan(user.id)
  const isOrgAdmin = orgMember?.role === 'ADMIN'

  // Vérifier que l'utilisateur est membre du projet
  const projectMember = await prisma.projectMember.findFirst({ where: { projectId, userId: user.id } })
  if (!projectMember && !isOrgAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const documents = await prisma.projectDocument.findMany({
    where: { projectId },
    include: { permissions: { select: { userId: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Filtrer selon la visibilité
  const visible = documents.filter(doc => {
    if (isOrgAdmin) return true
    if (doc.uploadedBy === user.id) return true
    if (doc.visibility === 'PROJECT') return true
    if (doc.visibility === 'SPECIFIC') return doc.permissions.some(p => p.userId === user.id)
    return false // PRIVATE
  })

  return NextResponse.json(visible)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId } = await params

  const orgMember = await getOrgAndPlan(user.id)
  if (!orgMember) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const plan = orgMember.organization.plan as keyof typeof PLAN_LIMITS
  const limits = PLAN_LIMITS[plan]

  if (!limits.documents) {
    return NextResponse.json({ error: 'Fonctionnalité réservée au plan Pro ou Business' }, { status: 403 })
  }

  const { name, storagePath, mimeType, size, visibility = 'PROJECT', permissionUserIds = [] } = await req.json()

  // Validation type MIME
  if (mimeType && !ALLOWED_MIME.includes(mimeType)) {
    return NextResponse.json({ error: 'Type de fichier non autorisé. Formats acceptés : PDF, Word, Excel, images.' }, { status: 400 })
  }

  // Validation taille
  if (size && size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux. Taille maximale : 50 Mo.' }, { status: 400 })
  }

  // Vérification quota par projet
  if (limits.documentsQuota > 0) {
    const usage = await prisma.projectDocument.aggregate({
      where: { projectId },
      _sum: { size: true },
    })
    const usedBytes = usage._sum.size ?? 0
    if (usedBytes + (size ?? 0) > limits.documentsQuota) {
      return NextResponse.json({ error: `Quota de stockage du projet dépassé (${plan === 'BUSINESS' ? '1 Go' : '500 Mo'} maximum).` }, { status: 400 })
    }
  }

  const doc = await prisma.projectDocument.create({
    data: {
      projectId,
      name,
      storagePath,
      mimeType: mimeType || null,
      size: size || null,
      uploadedBy: user.id,
      visibility,
      permissions: visibility === 'SPECIFIC' && permissionUserIds.length > 0
        ? { create: permissionUserIds.map((uid: string) => ({ userId: uid })) }
        : undefined,
    },
    include: { permissions: { select: { userId: true } } },
  })

  return NextResponse.json(doc, { status: 201 })
}
