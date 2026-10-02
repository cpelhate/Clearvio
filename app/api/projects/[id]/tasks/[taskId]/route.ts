import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'
import { createNotification } from '@/lib/notifications'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id: projectId, taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.TASK_EDIT, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.shortName !== undefined && { shortName: body.shortName ? body.shortName.slice(0, 6) : null }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(body.milestoneId !== undefined && { milestoneId: body.milestoneId || null }),
      ...(body.order !== undefined && { order: body.order }),
    },
  })

  if (body.assigneeId && body.assigneeId !== user.id) {
    await createNotification({
      userId: body.assigneeId,
      type: 'TASK_ASSIGNED',
      title: 'Tâche assignée',
      message: `Vous avez été assigné à "${task.title}"`,
      projectId,
      taskId: taskId,
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id: projectId, taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.TASK_DELETE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  await prisma.task.delete({ where: { id: taskId } })
  return NextResponse.json({ success: true })
}
