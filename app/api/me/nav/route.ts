import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_PERMISSIONS, NAV_ACTIONS } from '@/lib/permissions'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  // ADMIN sees everything
  if (member.role === 'ADMIN') {
    const result: Record<string, boolean> = {}
    for (const action of NAV_ACTIONS) result[action] = true
    return NextResponse.json(result)
  }

  const customRules = await prisma.permissionRule.findMany({
    where: {
      organizationId: member.organizationId,
      role: member.role,
      action: { in: [...NAV_ACTIONS] },
    },
  })

  const baseDefaults: Record<string, boolean> = { ...DEFAULT_PERMISSIONS[member.role] }
  for (const rule of customRules) baseDefaults[rule.action] = rule.allowed

  const result: Record<string, boolean> = {}
  for (const action of NAV_ACTIONS) {
    result[action] = baseDefaults[action] ?? true
  }

  return NextResponse.json(result)
}
