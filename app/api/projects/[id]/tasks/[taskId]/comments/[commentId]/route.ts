import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; taskId: string; commentId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { commentId } = await params

  const existing = await prisma.taskComment.findUnique({ where: { id: commentId } })
  if (!existing) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 })
  if (existing.userId !== user.id) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })

  const updated = await prisma.taskComment.update({
    where: { id: commentId },
    data: { content: content.trim() },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; taskId: string; commentId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { commentId } = await params

  const existing = await prisma.taskComment.findUnique({ where: { id: commentId } })
  if (!existing) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 })
  if (existing.userId !== user.id) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  await prisma.taskComment.delete({ where: { id: commentId } })
  return NextResponse.json({ success: true })
}
