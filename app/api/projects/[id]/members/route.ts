import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId } = await params

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  })

  const userIds = projectMembers.map(m => m.userId)
  const profiles = await prisma.profile.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, email: true },
  })

  const members = profiles.map(p => ({
    userId: p.id,
    name: p.fullName,
    email: p.email,
  }))

  return NextResponse.json(members)
}
