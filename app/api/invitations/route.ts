import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendInviteEmail } from '@/lib/mailer'
import crypto from 'crypto'
import { checkPermission, ACTIONS } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.MEMBER_INVITE)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const body = await req.json()
  const { email, message, orgRole, projectRole, allProjects, projectIds } = body

  if (!email?.trim()) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  // Vérifier que l'email n'est pas déjà membre
  const existingMember = await prisma.organizationMember.findFirst({
    where: { organizationId: member.organizationId },
  })
  // Note: on ne peut pas filtrer par email ici car on n'a que userId — on ignore ce check

  // Annuler les invitations en attente pour cet email
  await prisma.inviteToken.updateMany({
    where: { organizationId: member.organizationId, email: email.trim(), usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.inviteToken.create({
    data: {
      organizationId: member.organizationId,
      email: email.trim(),
      orgRole: orgRole ?? 'MEMBRE',
      projectRole: projectRole ?? 'OBSERVATEUR',
      allProjects: allProjects ?? false,
      projectIds: projectIds ?? [],
      message: message?.trim() || null,
      createdBy: user.id,
      token,
      expiresAt,
    },
  })

  // Construire l'URL d'invitation
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`
  const inviteUrl = `${appUrl}/invitation/${token}`

  // Récupérer le nom de l'expéditeur
  const fromName = user.user_metadata?.full_name ?? user.email ?? 'Un membre'

  const emailResult = await sendInviteEmail({
    organizationId: member.organizationId,
    toEmail: email.trim(),
    fromName,
    orgName: member.organization.name,
    message: message?.trim() || null,
    inviteUrl,
    expiresAt,
  })

  return NextResponse.json({
    ok: true,
    inviteUrl,
    emailSent: emailResult.ok,
    emailError: emailResult.error ?? null,
  })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const member = await prisma.organizationMember.findFirst({ where: { userId: user.id } })
    if (!member || member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const invites = await prisma.inviteToken.findMany({
      where: { organizationId: member.organizationId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invites)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[invitations GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const perm = await checkPermission(user.id, ACTIONS.MEMBER_REMOVE)
  if (!perm) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!perm.allowed) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  const { id } = await req.json()
  await prisma.inviteToken.updateMany({
    where: { id, organizationId: perm.organizationId },
    data: { usedAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
