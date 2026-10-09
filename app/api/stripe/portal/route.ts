import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const member = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: { select: { stripeCustomerId: true } } },
    })
    if (!member?.organization.stripeCustomerId) {
      return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 400 })
    }

    const stripe = getStripe()
    const origin = request.headers.get('origin') ?? 'https://clearvio.vercel.app'

    const session = await stripe.billingPortal.sessions.create({
      customer: member.organization.stripeCustomerId,
      return_url: `${origin}/parametres?tab=facturation`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('[stripe/portal]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
