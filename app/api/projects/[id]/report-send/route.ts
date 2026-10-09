import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

const TENDANCE_LABELS: Record<string, string> = {
  POSITIVE: '✅ Positive',
  NEUTRE: '➡️ Neutre',
  ATTENTION: '⚠️ Attention',
  CRITIQUE: '🔴 Critique',
}

const TENDANCE_COLORS: Record<string, string> = {
  POSITIVE: '#16a34a',
  NEUTRE: '#6b7280',
  ATTENTION: '#d97706',
  CRITIQUE: '#dc2626',
}

const SECTION_LABELS: Record<string, string> = {
  resume: 'Résumé exécutif',
  avancement: 'Avancement',
  pointsAttention: "Points d'attention",
  prochainesEtapes: 'Prochaines étapes',
  risques: 'Risques',
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const member = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true, organization: { select: { plan: true } } },
    })
    if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

    const plan = member.organization.plan
    if (plan === 'FREE') return NextResponse.json({ error: 'Fonctionnalité réservée au plan Pro' }, { status: 403 })

    const body = await req.json()
    const { recipients, report, sections, introText, trigger = 'MANUAL' } = body

    if (!recipients?.length || !report) {
      return NextResponse.json({ error: 'Destinataires et rapport requis' }, { status: 400 })
    }

    const smtpConfig = await prisma.smtpConfig.findUnique({ where: { organizationId: member.organizationId } })
    if (!smtpConfig) return NextResponse.json({ error: 'SMTP non configuré — rendez-vous dans Paramètres → Email' }, { status: 400 })

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.user, pass: smtpConfig.password },
    })

    const activeSections: string[] = sections ?? ['resume', 'avancement', 'pointsAttention', 'prochainesEtapes', 'risques']
    const date = new Date(report.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const tendanceCouleur = TENDANCE_COLORS[report.tendance] ?? '#6b7280'
    const tendanceLabel = TENDANCE_LABELS[report.tendance] ?? report.tendance

    const introHtml = introText?.trim()
      ? `<div style="background:#f0f4ff;border-left:3px solid #1D3461;border-radius:4px;padding:14px 18px;margin-bottom:24px;font-size:14px;color:#333;line-height:1.7;">${introText.replace(/\n/g, '<br>')}</div>`
      : ''

    const resumeHtml = activeSections.includes('resume') ? `
      <h2 style="font-size:14px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">${SECTION_LABELS.resume}</h2>
      <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 24px;">${report.resume}</p>` : ''

    const avancementHtml = activeSections.includes('avancement') ? `
      <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:13px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.06em;">${SECTION_LABELS.avancement}</span>
          <span style="font-size:20px;font-weight:700;color:#1D3461;">${report.progressPct}%</span>
        </div>
        <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin-bottom:10px;">
          <div style="height:100%;width:${report.progressPct}%;background:#1D3461;border-radius:3px;"></div>
        </div>
        <div style="font-size:12px;color:#6b7280;">
          ✓ ${report.taskStats.termine} terminées &nbsp;⚡ ${report.taskStats.enCours} en cours &nbsp;🔒 ${report.taskStats.bloque} bloquées &nbsp;⏰ ${report.taskStats.enRetard} en retard
        </div>
      </div>
      <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 24px;">${report.avancement}</p>` : ''

    const pointsHtml = activeSections.includes('pointsAttention') && report.pointsAttention?.length ? `
      <h2 style="font-size:14px;font-weight:600;color:#d97706;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">⚠️ ${SECTION_LABELS.pointsAttention}</h2>
      <ul style="margin:0 0 24px;padding-left:20px;">
        ${report.pointsAttention.map((p: string) => `<li style="font-size:14px;color:#444;line-height:1.7;margin-bottom:4px;">${p}</li>`).join('')}
      </ul>` : ''

    const etapesHtml = activeSections.includes('prochainesEtapes') && report.prochainesEtapes?.length ? `
      <h2 style="font-size:14px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">${SECTION_LABELS.prochainesEtapes}</h2>
      <ol style="margin:0 0 24px;padding-left:20px;">
        ${report.prochainesEtapes.map((e: string) => `<li style="font-size:14px;color:#444;line-height:1.7;margin-bottom:4px;">${e}</li>`).join('')}
      </ol>` : ''

    const risquesHtml = activeSections.includes('risques') && report.risks?.length ? `
      <h2 style="font-size:14px;font-weight:600;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">🔴 ${SECTION_LABELS.risques}</h2>
      <ul style="margin:0 0 24px;padding-left:20px;">
        ${report.risks.map((r: string) => `<li style="font-size:14px;color:#444;line-height:1.7;margin-bottom:4px;">${r}</li>`).join('')}
      </ul>` : ''

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1D3461;padding:28px 32px;">
      <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Rapport de statut</p>
      <h1 style="color:#fff;font-size:20px;font-weight:600;margin:0 0 4px;">${report.projectName}</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">${date}</p>
    </div>
    <div style="padding:28px 32px;">
      <div style="display:inline-block;background:${tendanceCouleur}18;border:1px solid ${tendanceCouleur}44;border-radius:20px;padding:4px 12px;margin-bottom:20px;font-size:13px;color:${tendanceCouleur};font-weight:500;">
        ${tendanceLabel} — ${report.tendanceRaison}
      </div>
      ${introHtml}
      ${resumeHtml}
      ${avancementHtml}
      ${pointsHtml}
      ${etapesHtml}
      ${risquesHtml}
    </div>
    <div style="padding:16px 32px;background:#f8f9fa;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">Rapport généré par Clearvio · ${date}</p>
    </div>
  </div>
</body>
</html>`

    const failedRecipients: string[] = []
    for (const to of recipients) {
      try {
        await transporter.sendMail({
          from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
          to,
          subject: `[Clearvio] Rapport de statut — ${report.projectName} — ${date}`,
          html,
        })
      } catch {
        failedRecipients.push(to)
      }
    }

    const status = failedRecipients.length === 0 ? 'SUCCESS'
      : failedRecipients.length === recipients.length ? 'FAILED'
      : 'PARTIAL'

    await prisma.reportSendLog.create({
      data: {
        projectId,
        sentById: user.id,
        recipients,
        sections: activeSections,
        trigger: trigger as 'MANUAL' | 'SCHEDULED',
        status: status as 'SUCCESS' | 'PARTIAL' | 'FAILED',
        errorMsg: failedRecipients.length ? `Échec pour : ${failedRecipients.join(', ')}` : null,
      },
    })

    if (status === 'FAILED') return NextResponse.json({ error: 'Échec d\'envoi pour tous les destinataires' }, { status: 500 })
    if (status === 'PARTIAL') return NextResponse.json({ ok: true, partial: true, failed: failedRecipients })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[report-send]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
