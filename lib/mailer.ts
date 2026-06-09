import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'

interface SendInviteEmailParams {
  organizationId: string
  toEmail: string
  fromName: string
  orgName: string
  message: string | null
  inviteUrl: string
  expiresAt: Date
}

async function getTransporter(organizationId: string) {
  const config = await prisma.smtpConfig.findUnique({ where: { organizationId } })
  if (!config) return null

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  })
}

export async function sendInviteEmail({
  organizationId,
  toEmail,
  fromName,
  orgName,
  message,
  inviteUrl,
  expiresAt,
}: SendInviteEmailParams): Promise<{ ok: boolean; error?: string }> {
  const transporter = await getTransporter(organizationId)
  if (!transporter) return { ok: false, error: 'SMTP non configuré' }

  const config = await prisma.smtpConfig.findUnique({ where: { organizationId } })
  if (!config) return { ok: false, error: 'SMTP non configuré' }

  const expiryStr = expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #1D3461; padding: 32px; text-align: center;">
      <h1 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0;">Clearvio</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; color: #111; margin: 0 0 16px;">Vous avez été invité à rejoindre ${orgName}</h2>
      <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 16px;">
        <strong>${fromName}</strong> vous invite à collaborer sur <strong>${orgName}</strong> via Clearvio.
      </p>
      ${message ? `<div style="background: #f8f8f8; border-left: 3px solid #1D3461; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 0 0 24px; font-size: 14px; color: #333; font-style: italic;">"${message}"</div>` : ''}
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: #1D3461; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
          Accepter l'invitation
        </a>
      </div>
      <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
        Ce lien expire le ${expiryStr}. Si vous n'attendiez pas cette invitation, ignorez cet email.
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: toEmail,
      subject: `${fromName} vous invite à rejoindre ${orgName} sur Clearvio`,
      html,
    })
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

export async function sendTestEmail(organizationId: string, toEmail: string): Promise<{ ok: boolean; error?: string }> {
  const transporter = await getTransporter(organizationId)
  if (!transporter) return { ok: false, error: 'SMTP non configuré' }

  const config = await prisma.smtpConfig.findUnique({ where: { organizationId } })
  if (!config) return { ok: false, error: 'SMTP non configuré' }

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: toEmail,
      subject: 'Test de configuration SMTP — Clearvio',
      html: '<p>La configuration SMTP de Clearvio fonctionne correctement.</p>',
    })
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}
