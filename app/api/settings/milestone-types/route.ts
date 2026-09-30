import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getOrgId(userId: string) {
  const member = await prisma.organizationMember.findFirst({ where: { userId } })
  return member?.organizationId ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const types = await prisma.milestoneType.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(types)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  if (member.role !== 'ADMIN') return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const type = await prisma.milestoneType.create({
    data: {
      organizationId: member.organizationId,
      name: body.name.trim(),
      color: body.color ?? '#6366f1',
      icon: body.icon ?? 'milestone',
      description: body.description ?? null,
    },
  })
  return NextResponse.json(type, { status: 201 })
}
