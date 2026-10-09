import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { priceId } = await request.json()
    if (!priceId) return NextResponse.json({ error: 'Plan requis' }, { status: 400 })

    const member = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: { select: { id: true, name: true, stripeCustomerId: true } } },
    })
    if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

    const stripe = getStripe()
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://clearvio.vercel.app'

    // Créer ou récupérer le customer Stripe
    let customerId = member.organization.stripeCustomerId
    if (!customerId) {
      const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { email: true, fullName: true } })
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email,
        name: profile?.fullName ?? member.organization.name,
        metadata: { organizationId: member.organization.id },
      })
      customerId = customer.id
      await prisma.organization.update({
        where: { id: member.organization.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',

      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { organizationId: member.organization.id },
      },
      success_url: `${origin}/parametres?tab=facturation&checkout=success`,
      cancel_url: `${origin}/tarifs?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { organizationId: member.organization.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
