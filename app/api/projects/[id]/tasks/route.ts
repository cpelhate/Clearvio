import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'
import { createNotification } from '@/lib/notifications'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ level: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.TASK_CREATE, projectId)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  const { title, parentId, milestoneId, status, priority, dueDate, assigneeId } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })

  let level = 0
  if (parentId) {
    const parent = await prisma.task.findUnique({ where: { id: parentId } })
    level = Math.min((parent?.level ?? 0) + 1, 2)
  }

  const count = await prisma.task.count({ where: { projectId, parentId: parentId || null } })

  const task = await prisma.task.create({
    data: {
      projectId,
      parentId: parentId || null,
      milestoneId: milestoneId || null,
      title: title.trim(),
      status: status || 'A_FAIRE',
      priority: priority || 'NORMALE',
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId || user.id,
      level,
      order: count,
    },
  })

  if (task.assigneeId && task.assigneeId !== user.id) {
    await createNotification({
      userId: task.assigneeId,
      type: 'TASK_ASSIGNED',
      title: 'Tâche assignée',
      message: `Vous avez été assigné à "${task.title}"`,
      projectId,
      taskId: task.id,
    })
  }

  return NextResponse.json(task, { status: 201 })
}
