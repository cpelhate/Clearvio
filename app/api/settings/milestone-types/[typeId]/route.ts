import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
  const { typeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  const type = await prisma.milestoneType.update({
    where: { id: typeId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.description !== undefined && { description: body.description }),
    },
  })
  return NextResponse.json(type)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
  const { typeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  // Dissocier les jalons avant suppression
  await prisma.milestone.updateMany({ where: { typeId }, data: { typeId: null } })
  await prisma.milestoneType.delete({ where: { id: typeId } })
  return NextResponse.json({ success: true })
}
