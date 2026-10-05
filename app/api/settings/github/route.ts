import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

async function getOrgId(userId: string): Promise<string | null> {
  const member = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true, role: true },
  })
  if (!member || member.role !== 'ADMIN') return null
  return member.organizationId
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const connection = await prisma.githubConnection.findUnique({
    where: { organizationId: member.organizationId },
    select: { id: true, repoOwner: true, repoName: true, webhookSecret: true, createdAt: true },
  })

  return NextResponse.json(connection ?? null)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'Permission refusée — Admin requis' }, { status: 403 })

  const { repoOwner, repoName } = await request.json()
  if (!repoOwner?.trim() || !repoName?.trim()) {
    return NextResponse.json({ error: 'Propriétaire et nom du dépôt requis' }, { status: 400 })
  }

  const webhookSecret = crypto.randomBytes(32).toString('hex')

  const existing = await prisma.githubConnection.findUnique({ where: { organizationId: orgId } })
  let connection
  if (existing) {
    connection = await prisma.githubConnection.update({
      where: { organizationId: orgId },
      data: { repoOwner: repoOwner.trim(), repoName: repoName.trim(), webhookSecret },
    })
  } else {
    connection = await prisma.githubConnection.create({
      data: { organizationId: orgId, repoOwner: repoOwner.trim(), repoName: repoName.trim(), webhookSecret },
    })
  }

  return NextResponse.json(connection)
}

export async function DELETE(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const orgId = await getOrgId(user.id)
  if (!orgId) return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

  await prisma.githubConnection.deleteMany({ where: { organizationId: orgId } })
  return NextResponse.json({ ok: true })
}
