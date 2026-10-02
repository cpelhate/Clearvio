import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: body.isRead ?? true },
  })
  return NextResponse.json({ success: true })
}
