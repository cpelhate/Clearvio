import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const config = await prisma.smtpConfig.findUnique({ where: { organizationId: member.organizationId } })
  if (!config) return NextResponse.json(null)

  return NextResponse.json({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    password: '',  // ne pas exposer le mot de passe
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    configured: true,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let member: Awaited<ReturnType<typeof prisma.organizationMember.findFirst>>
  try {
    member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[smtp PATCH findFirst]', msg)
    return NextResponse.json({ error: `findFirst: ${msg}` }, { status: 500 })
  }
  if (!member || member.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await req.json()
  const { host, port, secure, user: smtpUser, password, fromEmail, fromName } = body

  if (!host || !smtpUser || !fromEmail || !fromName) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  // Si pas de mot de passe fourni, garder l'ancien
  let finalPassword = password
  if (!password) {
    const existing = await prisma.smtpConfig.findUnique({ where: { organizationId: member.organizationId } })
    finalPassword = existing?.password ?? ''
  }

  try {
    await prisma.smtpConfig.upsert({
      where: { organizationId: member.organizationId },
      create: {
        organizationId: member.organizationId,
        host, port: port ?? 587, secure: secure ?? false,
        user: smtpUser, password: finalPassword,
        fromEmail, fromName,
      },
      update: {
        host, port: port ?? 587, secure: secure ?? false,
        user: smtpUser,
        ...(password ? { password } : {}),
        fromEmail, fromName,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[smtp PATCH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
