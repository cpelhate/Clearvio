import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { PLAN_LIMITS } from '@/lib/plans'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId } = await params

  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: { select: { plan: true } } },
  })

  const plan = (orgMember?.organization?.plan ?? 'FREE') as keyof typeof PLAN_LIMITS
  const quota = PLAN_LIMITS[plan].documentsQuota

  const usage = await prisma.projectDocument.aggregate({
    where: { projectId },
    _sum: { size: true },
  })

  return NextResponse.json({ used: usage._sum.size ?? 0, quota })
}
