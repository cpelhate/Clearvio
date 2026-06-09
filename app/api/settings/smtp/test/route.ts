import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendTestEmail } from '@/lib/mailer'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  try {
    const result = await sendTestEmail(member.organizationId, user.email!)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[smtp test]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
