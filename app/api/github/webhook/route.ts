import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// Extract task shortName references like #WIRE-1 or WIRE-1 from text
function extractShortNames(text: string): string[] {
  const matches = text.match(/#?([A-Z]{2,6}-\d+)/g) ?? []
  return matches.map(m => m.replace('#', ''))
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  const event = request.headers.get('x-github-event')

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Identify repo from payload
  const repoOwner = (payload.repository as Record<string, unknown>)?.owner as Record<string, string> | undefined
  const repoName = (payload.repository as Record<string, unknown>)?.name as string | undefined

  if (!repoOwner?.login || !repoName) {
    return NextResponse.json({ ok: true })
  }

  const connection = await prisma.githubConnection.findFirst({
    where: { repoOwner: repoOwner.login, repoName },
  })

  if (!connection) return NextResponse.json({ ok: true })

  if (!verifySignature(rawBody, signature, connection.webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // ── Pull Request events ──────────────────────────────────────────────────────
  if (event === 'pull_request') {
    const pr = payload.pull_request as Record<string, unknown>
    const action = payload.action as string
    const prTitle = (pr?.title as string) ?? ''
    const prBody = (pr?.body as string) ?? ''
    const prNumber = pr?.number as number
    const prUrl = (pr?.html_url as string) ?? ''

    const shortNames = extractShortNames(prTitle + ' ' + prBody)

    for (const shortName of shortNames) {
      const task = await prisma.task.findFirst({
        where: { shortName },
      })
      if (!task) continue

      if (action === 'opened' || action === 'reopened') {
        // PR opened → set status EN_REVUE
        if (task.status === 'A_FAIRE' || task.status === 'EN_COURS') {
          await prisma.task.update({ where: { id: task.id }, data: { status: 'EN_REVUE' } })
          await prisma.taskComment.create({
            data: {
              taskId: task.id,
              userId: 'github-bot',
              content: `🔗 Pull Request #${prNumber} ouverte : [${prTitle}](${prUrl})`,
            },
          })
        }
      } else if (action === 'closed') {
        const merged = pr?.merged as boolean
        if (merged) {
          // PR merged → set status TERMINE
          await prisma.task.update({ where: { id: task.id }, data: { status: 'TERMINE' } })
          await prisma.taskComment.create({
            data: {
              taskId: task.id,
              userId: 'github-bot',
              content: `✅ Pull Request #${prNumber} fusionnée : [${prTitle}](${prUrl})`,
            },
          })
        }
      }
    }
  }

  // ── Issues events ────────────────────────────────────────────────────────────
  if (event === 'issues') {
    const issue = payload.issue as Record<string, unknown>
    const action = payload.action as string
    const issueNumber = issue?.number as number
    const issueTitle = (issue?.title as string) ?? ''
    const issueUrl = (issue?.html_url as string) ?? ''

    if (action === 'closed') {
      const task = await prisma.task.findFirst({
        where: { githubIssueNumber: issueNumber },
      })
      if (task && task.status !== 'TERMINE') {
        await prisma.task.update({ where: { id: task.id }, data: { status: 'TERMINE' } })
        await prisma.taskComment.create({
          data: {
            taskId: task.id,
            userId: 'github-bot',
            content: `✅ Issue GitHub #${issueNumber} fermée : [${issueTitle}](${issueUrl})`,
          },
        })
      }
    }

    if (action === 'reopened') {
      const task = await prisma.task.findFirst({
        where: { githubIssueNumber: issueNumber },
      })
      if (task && task.status === 'TERMINE') {
        await prisma.task.update({ where: { id: task.id }, data: { status: 'EN_COURS' } })
        await prisma.taskComment.create({
          data: {
            taskId: task.id,
            userId: 'github-bot',
            content: `🔄 Issue GitHub #${issueNumber} réouverte : [${issueTitle}](${issueUrl})`,
          },
        })
      }
    }
  }

  // ── Push / commit events ─────────────────────────────────────────────────────
  if (event === 'push') {
    const commits = (payload.commits as Record<string, unknown>[]) ?? []
    for (const commit of commits) {
      const message = (commit.message as string) ?? ''
      const commitUrl = (commit.url as string) ?? ''
      const commitId = ((commit.id as string) ?? '').slice(0, 7)
      const shortNames = extractShortNames(message)

      for (const shortName of shortNames) {
        const task = await prisma.task.findFirst({ where: { shortName } })
        if (!task) continue

        await prisma.taskComment.create({
          data: {
            taskId: task.id,
            userId: 'github-bot',
            content: `💻 Commit [\`${commitId}\`](${commitUrl}) : ${message.split('\n')[0]}`,
          },
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
