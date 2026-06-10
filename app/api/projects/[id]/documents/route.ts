import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  const documents = await prisma.projectDocument.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(documents)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  const perm = await checkPermission(user.id, ACTIONS.DOCUMENT_UPLOAD, id)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const { name, storagePath, mimeType, size } = await req.json()

  const doc = await prisma.projectDocument.create({
    data: { projectId: id, name, storagePath, mimeType, size, uploadedBy: user.id },
  })
  return NextResponse.json(doc, { status: 201 })
}
