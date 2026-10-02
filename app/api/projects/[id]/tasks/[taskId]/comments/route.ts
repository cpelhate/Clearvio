import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'
import { createNotification } from '@/lib/notifications'

export async function GET(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { taskId } = await params

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId, taskId } = await params

  const perm = await checkPermission(user.id, ACTIONS.COMMENT_CREATE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })

  const comment = await prisma.taskComment.create({
    data: { taskId, userId: user.id, content: content.trim() },
  })

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { assigneeId: true, title: true } })
  if (task?.assigneeId && task.assigneeId !== user.id) {
    await createNotification({
      userId: task.assigneeId,
      type: 'COMMENT_POSTED',
      title: 'Nouveau commentaire',
      message: `Nouveau commentaire sur "${task.title}"`,
      projectId,
      taskId,
    })
  }

  return NextResponse.json(comment, { status: 201 })
}
