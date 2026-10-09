import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId } = await params

  const logs = await prisma.reportSendLog.findMany({
    where: { projectId },
    orderBy: { sentAt: 'desc' },
    take: 50,
  })

  // Enrich with sender names
  const senderIds = [...new Set(logs.map(l => l.sentById))]
  const profiles = await prisma.profile.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, fullName: true, email: true },
  })
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.fullName ?? p.email ?? p.id]))

  return NextResponse.json(logs.map(l => ({
    ...l,
    sentByName: profileMap[l.sentById] ?? l.sentById,
  })))
}
