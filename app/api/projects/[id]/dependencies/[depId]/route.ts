import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; depId: string }> }) {
  const { depId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await prisma.dependency.delete({ where: { id: depId } })
  return NextResponse.json({ success: true })
}
