import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'
import { createNotification } from '@/lib/notifications'
import { updateGithubIssue, closeGithubIssue } from '@/lib/github'

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
      ...(body.estimatedTime !== undefined && { estimatedTime: body.estimatedTime != null ? Math.max(0, Math.round(body.estimatedTime)) : null }),
      ...(body.timeSpent !== undefined && { timeSpent: body.timeSpent != null ? Math.max(0, Math.round(body.timeSpent)) : null }),
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

  // Sync to GitHub if issue is linked
  if (task.githubIssueNumber) {
    const orgMember = await prisma.organizationMember.findFirst({ where: { userId: user.id }, select: { organizationId: true } })
    if (orgMember) {
      const gh = await prisma.githubConnection.findUnique({ where: { organizationId: orgMember.organizationId } })
      if (gh?.accessToken) {
        const conn = { repoOwner: gh.repoOwner, repoName: gh.repoName, accessToken: gh.accessToken }
        const updates: Parameters<typeof updateGithubIssue>[2] = {}
        if (body.title !== undefined) updates.title = body.title
        if (body.description !== undefined) updates.body = body.description ? `${body.description}\n\n---\n*Créé depuis Clearvio*` : '*Créé depuis Clearvio*'
        if (body.status === 'TERMINE') updates.state = 'closed'
        else if (body.status !== undefined) updates.state = 'open'
        if (Object.keys(updates).length > 0) {
          await updateGithubIssue(conn, task.githubIssueNumber, updates)
        }
      }
    }
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

  const taskToDelete = await prisma.task.findUnique({ where: { id: taskId }, select: { githubIssueNumber: true } })
  await prisma.task.delete({ where: { id: taskId } })

  // Close GitHub issue on delete
  if (taskToDelete?.githubIssueNumber) {
    const orgMember = await prisma.organizationMember.findFirst({ where: { userId: user.id }, select: { organizationId: true } })
    if (orgMember) {
      const gh = await prisma.githubConnection.findUnique({ where: { organizationId: orgMember.organizationId } })
      if (gh?.accessToken) {
        await closeGithubIssue(
          { repoOwner: gh.repoOwner, repoName: gh.repoName, accessToken: gh.accessToken },
          taskToDelete.githubIssueNumber
        )
      }
    }
  }

  return NextResponse.json({ success: true })
}
