import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { PLAN_LIMITS } from '@/lib/plans'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const member = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            plan: true,
            stripeSubscriptionStatus: true,
            trialEndsAt: true,
          },
        },
      },
    })

    if (!member) return NextResponse.json({ plan: 'FREE', limits: PLAN_LIMITS.FREE })

    const { plan, stripeSubscriptionStatus, trialEndsAt } = member.organization

    return NextResponse.json({
      plan,
      limits: PLAN_LIMITS[plan],
      subscriptionStatus: stripeSubscriptionStatus,
      trialEndsAt,
    })
  } catch {
    return NextResponse.json({ plan: 'FREE', limits: PLAN_LIMITS.FREE })
  }
}
