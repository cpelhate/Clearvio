import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { PLAN_LIMITS } from '@/lib/plans'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId } = await params

  const config = await prisma.reportConfig.findUnique({ where: { projectId } })
  return NextResponse.json(config ?? {
    projectId,
    introText: null,
    sections: ['resume', 'avancement', 'pointsAttention', 'prochainesEtapes', 'risques'],
    scheduleEnabled: false,
    scheduleFrequency: null,
    scheduleDayOfWeek: 1,
    scheduleHour: 8,
    scheduleRecipients: [],
    nextSendAt: null,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id: projectId } = await params

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true, organization: { select: { plan: true } } },
  })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const limits = PLAN_LIMITS[member.organization.plan]
  if (!limits.ai && member.organization.plan !== 'TRIAL') return NextResponse.json({ error: 'Fonctionnalité réservée au plan Pro' }, { status: 403 })

  const body = await req.json()
  const { introText, sections, scheduleEnabled, scheduleFrequency, scheduleDayOfWeek, scheduleHour, scheduleRecipients } = body

  // TRIAL: no recurring
  const plan = member.organization.plan
  const allowSchedule = plan === 'PRO' || plan === 'BUSINESS'
  const finalScheduleEnabled = allowSchedule ? (scheduleEnabled ?? false) : false

  let nextSendAt: Date | null = null
  if (finalScheduleEnabled && scheduleFrequency && scheduleDayOfWeek != null && scheduleHour != null) {
    nextSendAt = computeNextSend(scheduleFrequency, scheduleDayOfWeek, scheduleHour)
  }

  const config = await prisma.reportConfig.upsert({
    where: { projectId },
    create: {
      projectId,
      introText: introText ?? null,
      sections: sections ?? ['resume', 'avancement', 'pointsAttention', 'prochainesEtapes', 'risques'],
      scheduleEnabled: finalScheduleEnabled,
      scheduleFrequency: finalScheduleEnabled ? scheduleFrequency : null,
      scheduleDayOfWeek: finalScheduleEnabled ? scheduleDayOfWeek : null,
      scheduleHour: finalScheduleEnabled ? scheduleHour : null,
      scheduleRecipients: finalScheduleEnabled ? (scheduleRecipients ?? []) : [],
      nextSendAt,
    },
    update: {
      introText: introText ?? null,
      sections: sections ?? ['resume', 'avancement', 'pointsAttention', 'prochainesEtapes', 'risques'],
      scheduleEnabled: finalScheduleEnabled,
      scheduleFrequency: finalScheduleEnabled ? scheduleFrequency : null,
      scheduleDayOfWeek: finalScheduleEnabled ? scheduleDayOfWeek : null,
      scheduleHour: finalScheduleEnabled ? scheduleHour : null,
      scheduleRecipients: finalScheduleEnabled ? (scheduleRecipients ?? []) : [],
      nextSendAt,
    },
  })

  return NextResponse.json(config)
}

function computeNextSend(frequency: string, dayOfWeek: number, hour: number): Date {
  const now = new Date()
  const next = new Date(now)
  next.setHours(hour, 0, 0, 0)

  if (frequency === 'WEEKLY') {
    const currentDay = now.getDay()
    let daysUntil = (dayOfWeek - currentDay + 7) % 7
    if (daysUntil === 0 && now.getHours() >= hour) daysUntil = 7
    next.setDate(now.getDate() + daysUntil)
  } else if (frequency === 'BIMONTHLY') {
    // 1st and 15th of each month
    const day1 = new Date(now.getFullYear(), now.getMonth(), 1, hour, 0, 0)
    const day15 = new Date(now.getFullYear(), now.getMonth(), 15, hour, 0, 0)
    const nextMonth1 = new Date(now.getFullYear(), now.getMonth() + 1, 1, hour, 0, 0)
    if (now < day1) return day1
    if (now < day15) return day15
    return nextMonth1
  } else if (frequency === 'MONTHLY') {
    next.setDate(dayOfWeek) // reuse dayOfWeek as day-of-month for monthly
    if (next <= now) next.setMonth(next.getMonth() + 1)
  }

  return next
}
