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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const { to, report } = body

  if (!to || !report) return NextResponse.json({ error: 'Destinataire et rapport requis' }, { status: 400 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

  const smtpConfig = await prisma.smtpConfig.findUnique({ where: { organizationId: member.organizationId } })
  if (!smtpConfig) return NextResponse.json({ error: 'SMTP non configuré — rendez-vous dans Paramètres → Email' }, { status: 400 })

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: { user: smtpConfig.user, pass: smtpConfig.password },
  })

  const date = new Date(report.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const tendanceCouleur = TENDANCE_COLORS[report.tendance] ?? '#6b7280'
  const tendanceLabel = TENDANCE_LABELS[report.tendance] ?? report.tendance

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #1D3461; padding: 28px 32px;">
      <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.08em;">Rapport de statut hebdomadaire</p>
      <h1 style="color: #fff; font-size: 20px; font-weight: 600; margin: 0 0 4px;">${report.projectName}</h1>
      <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 0;">${date}</p>
    </div>

    <div style="padding: 28px 32px;">
      <!-- Tendance -->
      <div style="display: inline-block; background: ${tendanceCouleur}18; border: 1px solid ${tendanceCouleur}44; border-radius: 20px; padding: 4px 12px; margin-bottom: 20px; font-size: 13px; color: ${tendanceCouleur}; font-weight: 500;">
        ${tendanceLabel} — ${report.tendanceRaison}
      </div>

      <!-- Avancement -->
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 13px; font-weight: 600; color: #111; text-transform: uppercase; letter-spacing: 0.06em;">Avancement global</span>
          <span style="font-size: 20px; font-weight: 700; color: #1D3461;">${report.progressPct}%</span>
        </div>
        <div style="height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 10px;">
          <div style="height: 100%; width: ${report.progressPct}%; background: #1D3461; border-radius: 3px;"></div>
        </div>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #6b7280;">
          <span>✓ ${report.taskStats.termine} terminées</span>
          <span>⚡ ${report.taskStats.enCours} en cours</span>
          <span>🔒 ${report.taskStats.bloque} bloquées</span>
          <span>⏰ ${report.taskStats.enRetard} en retard</span>
        </div>
      </div>

      <!-- Résumé -->
      <h2 style="font-size: 14px; font-weight: 600; color: #111; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px;">Résumé exécutif</h2>
      <p style="font-size: 14px; color: #444; line-height: 1.7; margin: 0 0 24px;">${report.resume}</p>

      <!-- Avancement détaillé -->
      <h2 style="font-size: 14px; font-weight: 600; color: #111; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px;">Avancement</h2>
      <p style="font-size: 14px; color: #444; line-height: 1.7; margin: 0 0 24px;">${report.avancement}</p>

      <!-- Points d'attention -->
      ${report.pointsAttention?.length ? `
      <h2 style="font-size: 14px; font-weight: 600; color: #d97706; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px;">⚠️ Points d'attention</h2>
      <ul style="margin: 0 0 24px; padding-left: 20px;">
        ${report.pointsAttention.map((p: string) => `<li style="font-size: 14px; color: #444; line-height: 1.7; margin-bottom: 4px;">${p}</li>`).join('')}
      </ul>` : ''}

      <!-- Prochaines étapes -->
      ${report.prochainesEtapes?.length ? `
      <h2 style="font-size: 14px; font-weight: 600; color: #111; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px;">Prochaines étapes</h2>
      <ol style="margin: 0 0 24px; padding-left: 20px;">
        ${report.prochainesEtapes.map((e: string) => `<li style="font-size: 14px; color: #444; line-height: 1.7; margin-bottom: 4px;">${e}</li>`).join('')}
      </ol>` : ''}
    </div>

    <div style="padding: 16px 32px; background: #f8f9fa; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
        Rapport généré par Clearvio · ${date}
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to,
      subject: `[Clearvio] Rapport de statut — ${report.projectName} — ${date}`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur d\'envoi' }, { status: 500 })
  }
  } catch (err: unknown) {
    console.error('[ai-status-report/send]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur inattendue' }, { status: 500 })
  }
}
