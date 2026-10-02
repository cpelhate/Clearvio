import { prisma } from '@/lib/prisma'

export async function createNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  projectId?: string
  taskId?: string
}) {
  await prisma.notification.create({ data: params })
}
