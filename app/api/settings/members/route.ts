import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: member.organizationId },
    orderBy: { joinedAt: 'asc' },
  })

  const userIds = members.map(m => m.userId)
  const profiles = await prisma.profile.findMany({ where: { id: { in: userIds } } })
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

  return NextResponse.json(members.map(m => {
    const profile = profileMap[m.userId]
    return {
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      isCurrentUser: m.userId === user.id,
      name: profile?.fullName ?? null,
      email: profile?.email ?? null,
    }
  }))
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.MEMBER_CHANGE_ROLE)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const { memberId, role } = await req.json()

  await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role },
  })

  return NextResponse.json({ ok: true })
}
