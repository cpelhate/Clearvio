import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_PERMISSIONS, CONFIGURABLE_ROLES } from '@/lib/permissions'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
    if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const customRules = await prisma.permissionRule.findMany({ where: { organizationId: member.organizationId } })
    const rulesMap: Record<string, Record<string, boolean>> = {}
    for (const role of CONFIGURABLE_ROLES) {
      rulesMap[role] = { ...DEFAULT_PERMISSIONS[role] }
    }
    for (const rule of customRules) {
      if (rulesMap[rule.role]) rulesMap[rule.role][rule.action] = rule.allowed
    }
    return NextResponse.json(rulesMap)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[permissions GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { role, action, allowed } = await req.json()
  if (!role || !action || typeof allowed !== 'boolean') return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  if (role === 'ADMIN') return NextResponse.json({ error: 'Le rôle Admin ne peut pas être modifié' }, { status: 400 })

  await prisma.permissionRule.upsert({
    where: { organizationId_role_action: { organizationId: member.organizationId, role, action } },
    create: { organizationId: member.organizationId, role, action, allowed },
    update: { allowed },
  })
  return NextResponse.json({ ok: true })
}
