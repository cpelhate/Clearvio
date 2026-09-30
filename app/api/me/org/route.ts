import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  })

  if (!membership) return NextResponse.json({ orgName: null })

  return NextResponse.json({ orgName: membership.organization.name, role: membership.role })
}
