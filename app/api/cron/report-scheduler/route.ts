import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

// Called by Vercel Cron every hour
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const dueConfigs = await prisma.reportConfig.findMany({
    where: {
      scheduleEnabled: true,
      nextSendAt: { lte: now },
      scheduleRecipients: { isEmpty: false },
    },
  })

  const results: { projectId: string; status: string }[] = []

  for (const config of dueConfigs) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: config.projectId },
        select: { id: true, name: true, organizationId: true },
      })
      if (!project) continue

      const org = await prisma.organization.findUnique({
        where: { id: project.organizationId },
        select: { plan: true },
      })
      if (!org || (org.plan !== 'PRO' && org.plan !== 'BUSINESS')) continue

      const smtpConfig = await prisma.smtpConfig.findUnique({ where: { organizationId: project.organizationId } })
      if (!smtpConfig) continue

      // Generate AI report
      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/projects/${config.projectId}/ai-status-report`, {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      })
      if (!aiRes.ok) continue
      const report = await aiRes.json()

      const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const introHtml = config.introText
        ? `<div style="background:#f0f4ff;border-left:3px solid #1D3461;border-radius:4px;padding:14px 18px;margin-bottom:24px;font-size:14px;color:#333;line-height:1.7;">${config.introText.replace(/\n/g, '<br>')}</div>`
        : ''

      const TENDANCE_COLORS: Record<string, string> = { POSITIVE: '#16a34a', NEUTRE: '#6b7280', ATTENTION: '#d97706', CRITIQUE: '#dc2626' }
      const TENDANCE_LABELS: Record<string, string> = { POSITIVE: '✅ Positive', NEUTRE: '➡️ Neutre', ATTENTION: '⚠️ Attention', CRITIQUE: '🔴 Critique' }
      const tc = TENDANCE_COLORS[report.tendance] ?? '#6b7280'
      const tl = TENDANCE_LABELS[report.tendance] ?? report.tendance

      const sections = config.sections
      const html = buildEmailHtml({ report, date, introHtml, tc, tl, sections })

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host, port: smtpConfig.port, secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.password },
      })

      const failed: string[] = []
      for (const to of config.scheduleRecipients) {
        try {
          await transporter.sendMail({
            from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
            to,
            subject: `[Clearvio] Rapport de statut — ${project.name} — ${date}`,
            html,
          })
        } catch { failed.push(to) }
      }

      const status = failed.length === 0 ? 'SUCCESS' : failed.length === config.scheduleRecipients.length ? 'FAILED' : 'PARTIAL'

      await prisma.reportSendLog.create({
        data: {
          projectId: config.projectId,
          sentById: 'SYSTEM',
          recipients: config.scheduleRecipients,
          sections: config.sections,
          trigger: 'SCHEDULED',
          status,
          errorMsg: failed.length ? `Échec pour : ${failed.join(', ')}` : null,
        },
      })

      // Compute next send
      const nextSendAt = computeNextSend(config.scheduleFrequency!, config.scheduleDayOfWeek!, config.scheduleHour!)
      await prisma.reportConfig.update({ where: { id: config.id }, data: { nextSendAt } })

      results.push({ projectId: config.projectId, status })
    } catch (err) {
      console.error(`[cron/report-scheduler] project ${config.projectId}`, err)
      results.push({ projectId: config.projectId, status: 'ERROR' })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

function computeNextSend(frequency: string, dayOfWeek: number, hour: number): Date {
  const now = new Date()
  const next = new Date(now)
  next.setHours(hour, 0, 0, 0)

  if (frequency === 'WEEKLY') {
    const currentDay = now.getDay()
    let daysUntil = (dayOfWeek - currentDay + 7) % 7
    if (daysUntil === 0) daysUntil = 7
    next.setDate(now.getDate() + daysUntil)
  } else if (frequency === 'BIMONTHLY') {
    const day15 = new Date(now.getFullYear(), now.getMonth(), 15, hour, 0, 0)
    const nextMonth1 = new Date(now.getFullYear(), now.getMonth() + 1, 1, hour, 0, 0)
    if (now < day15) return day15
    return nextMonth1
  } else if (frequency === 'MONTHLY') {
    next.setDate(dayOfWeek)
    next.setMonth(next.getMonth() + 1)
  }

  return next
}

function buildEmailHtml({ report, date, introHtml, tc, tl, sections }: {
  report: Record<string, unknown>; date: string; introHtml: string; tc: string; tl: string; sections: string[]
}): string {
  const avancement = sections.includes('avancement') ? `
    <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:13px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.06em;">Avancement</span>
        <span style="font-size:20px;font-weight:700;color:#1D3461;">${report.progressPct}%</span>
      </div>
      <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin-bottom:10px;">
        <div style="height:100%;width:${report.progressPct}%;background:#1D3461;border-radius:3px;"></div>
      </div>
    </div>
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 24px;">${report.avancement}</p>` : ''

  const resume = sections.includes('resume') ? `
    <h2 style="font-size:14px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Résumé exécutif</h2>
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 24px;">${report.resume}</p>` : ''

  const points = sections.includes('pointsAttention') && (report.pointsAttention as string[])?.length ? `
    <h2 style="font-size:14px;font-weight:600;color:#d97706;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">⚠️ Points d'attention</h2>
    <ul style="margin:0 0 24px;padding-left:20px;">
      ${(report.pointsAttention as string[]).map(p => `<li style="font-size:14px;color:#444;line-height:1.7;margin-bottom:4px;">${p}</li>`).join('')}
    </ul>` : ''

  const etapes = sections.includes('prochainesEtapes') && (report.prochainesEtapes as string[])?.length ? `
    <h2 style="font-size:14px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Prochaines étapes</h2>
    <ol style="margin:0 0 24px;padding-left:20px;">
      ${(report.prochainesEtapes as string[]).map(e => `<li style="font-size:14px;color:#444;line-height:1.7;margin-bottom:4px;">${e}</li>`).join('')}
    </ol>` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1D3461;padding:28px 32px;">
      <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Rapport de statut automatique</p>
      <h1 style="color:#fff;font-size:20px;font-weight:600;margin:0 0 4px;">${report.projectName}</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">${date}</p>
    </div>
    <div style="padding:28px 32px;">
      <div style="display:inline-block;background:${tc}18;border:1px solid ${tc}44;border-radius:20px;padding:4px 12px;margin-bottom:20px;font-size:13px;color:${tc};font-weight:500;">
        ${tl} — ${report.tendanceRaison}
      </div>
      ${introHtml}${resume}${avancement}${points}${etapes}
    </div>
    <div style="padding:16px 32px;background:#f8f9fa;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">Rapport généré par Clearvio · ${date}</p>
    </div>
  </div>
</body>
</html>`
}
