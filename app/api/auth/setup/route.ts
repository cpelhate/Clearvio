import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Vérifier si l'utilisateur a déjà une organisation
  const existing = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
  })
  if (existing) return NextResponse.json({ alreadySetup: true })

  const body = await request.json()
  const orgName = body.orgName?.trim() || user.user_metadata?.org_name?.trim() || 'Mon organisation'

  // Créer le slug depuis le nom
  const slug = orgName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).slice(2, 7)

  // Créer l'organisation
  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug,
    },
  })

  // Ajouter l'utilisateur comme admin
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'ADMIN',
    },
  })

  const metadata = user.user_metadata ?? {}
  await prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      fullName: [metadata.first_name, metadata.last_name].filter(Boolean).join(' ') || null,
      email: user.email,
    },
  })

  return NextResponse.json({ success: true, organizationId: org.id })
}
