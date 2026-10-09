import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { resolvePlan } from '@/lib/plans'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe/webhook] signature invalide', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.organizationId
        if (!orgId || session.mode !== 'subscription') break

        const subscriptionId = session.subscription as string
        const stripe = getStripe()
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id ?? null
        const plan = resolvePlan(subscription.status, priceId)

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            plan,
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionStatus: subscription.status,
            trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          },
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.organizationId
        if (!orgId) {
          // Fallback : chercher par customerId
          const org = await prisma.organization.findFirst({
            where: { stripeCustomerId: subscription.customer as string },
          })
          if (!org) break
          const priceId = subscription.items.data[0]?.price.id ?? null
          const plan = resolvePlan(subscription.status, priceId)
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              plan,
              stripeSubscriptionStatus: subscription.status,
              trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            },
          })
          break
        }
        const priceId = subscription.items.data[0]?.price.id ?? null
        const plan = resolvePlan(subscription.status, priceId)
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            plan,
            stripeSubscriptionStatus: subscription.status,
            trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const org = await prisma.organization.findFirst({
          where: { stripeCustomerId: subscription.customer as string },
        })
        if (!org) break
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            plan: 'FREE',
            stripeSubscriptionId: null,
            stripeSubscriptionStatus: 'canceled',
            trialEndsAt: null,
          },
        })
        break
      }
    }
  } catch (err) {
    console.error('[stripe/webhook] traitement événement', event.type, err)
    return NextResponse.json({ error: 'Erreur traitement' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
