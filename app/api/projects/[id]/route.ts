import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true, customFields: true },
  })
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

  const admin = createAdminClient()
  const enrichedMembers = await Promise.all(
    project.members.map(async m => {
      if (!admin) return { ...m, user: { id: m.userId, name: null, email: m.userId } }
      try {
        const { data } = await admin.auth.admin.getUserById(m.userId)
        return {
          ...m,
          user: {
            id: m.userId,
            name: data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? null,
            email: data.user?.email ?? m.userId,
          },
        }
      } catch {
        return { ...m, user: { id: m.userId, name: null, email: m.userId } }
      }
    })
  )

  return NextResponse.json({ ...project, members: enrichedMembers })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.PROJECT_EDIT, id)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.archivedAt !== undefined && { archivedAt: body.archivedAt ? new Date(body.archivedAt) : null }),
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.PROJECT_DELETE, id)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
