import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  return NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: profile?.fullName ?? null,
    firstName: user.user_metadata?.first_name ?? null,
    lastName: user.user_metadata?.last_name ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { firstName, lastName, password } = body

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || null

  await prisma.profile.upsert({
    where: { id: user.id },
    update: { fullName, email: user.email },
    create: { id: user.id, fullName, email: user.email },
  })

  const updates: Record<string, unknown> = {}
  if (firstName !== undefined || lastName !== undefined) {
    updates.data = { first_name: firstName, last_name: lastName }
  }
  if (password) updates.password = password

  if (Object.keys(updates).length > 0) {
    await supabase.auth.updateUser(updates as Parameters<typeof supabase.auth.updateUser>[0])
  }

  return NextResponse.json({ success: true })
}
