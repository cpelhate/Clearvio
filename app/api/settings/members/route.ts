import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

  // Récupérer les emails via Supabase Admin API n'est pas disponible côté client
  // On retourne les données disponibles
  return NextResponse.json(members.map(m => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    isCurrentUser: m.userId === user.id,
  })))
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { memberId, role } = await req.json()

  await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role },
  })

  return NextResponse.json({ ok: true })
}
