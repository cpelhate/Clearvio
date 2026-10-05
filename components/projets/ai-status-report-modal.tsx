'use client'

import { useState } from 'react'
import { X, Sparkles, Send, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface StatusReport {
  resume: string
  avancement: string
  pointsAttention: string[]
  prochainesEtapes: string[]
  tendance: 'POSITIVE' | 'NEUTRE' | 'ATTENTION' | 'CRITIQUE'
  tendanceRaison: string
  generatedAt: string
  projectName: string
  taskStats: {
    total: number
    aFaire: number
    enCours: number
    enRevue: number
    termine: number
    bloque: number
    enRetard: number
  }
  progressPct: number
}

const TENDANCE_CONFIG = {
  POSITIVE: { label: 'Positive', color: 'var(--color-success-default)', bg: 'var(--color-success-bg)', icon: TrendingUp },
  NEUTRE: { label: 'Neutre', color: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)', icon: Minus },
  ATTENTION: { label: 'Attention', color: 'var(--color-warning-default)', bg: 'var(--color-warning-bg)', icon: AlertTriangle },
  CRITIQUE: { label: 'Critique', color: 'var(--color-danger-default)', bg: 'var(--color-danger-bg)', icon: AlertTriangle },
}

export function AiStatusReportModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<StatusReport | null>(null)
  const [sending, setSending] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const { toast } = useToast()

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-status-report`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur IA', 'error'); return }
      setReport(await res.json())
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = async () => {
    if (!emailTo.trim() || !report) return
    setSending(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-status-report/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo.trim(), report }),
      })
      if (res.ok) {
        toast('Rapport envoyé par email', 'success')
        setShowEmailForm(false)
        setEmailTo('')
      } else {
        const d = await res.json()
        toast(d.error ?? 'Erreur d\'envoi', 'error')
      }
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setSending(false)
    }
  }

  const tc = report ? TENDANCE_CONFIG[report.tendance] : null
  const TcIcon = tc?.icon

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301, width: 620, maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh',
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Sparkles size={18} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Rapport de statut hebdomadaire</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Généré par IA à partir du contexte projet</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex' }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {!report ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 16, textAlign: 'center' }}>
              <Sparkles size={36} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>Générer le rapport de statut</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', maxWidth: 360, lineHeight: 1.6 }}>
                  L'IA analyse le contexte du projet (tâches, jalons, risques, objectifs) et génère un rapport synthétique prêt à partager.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Tendance */}
              {tc && TcIcon && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                  padding: '6px 14px', borderRadius: 'var(--radius-full)',
                  background: tc.bg, border: `1px solid ${tc.color}44`,
                }}>
                  <TcIcon size={14} strokeWidth={1.5} style={{ color: tc.color }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: tc.color }}>{tc.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>— {report.tendanceRaison}</span>
                </div>
              )}

              {/* Barre de progression */}
              <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>Avancement global</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{report.progressPct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: `${report.progressPct}%`, background: 'var(--color-accent-default)', borderRadius: 'var(--radius-full)', transition: 'width 600ms' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Terminées', val: report.taskStats.termine, color: 'var(--color-success-default)' },
                    { label: 'En cours', val: report.taskStats.enCours, color: 'var(--color-accent-default)' },
                    { label: 'Bloquées', val: report.taskStats.bloque, color: 'var(--color-danger-default)' },
                    { label: 'En retard', val: report.taskStats.enRetard, color: 'var(--color-warning-default)' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.val} {s.label.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Résumé exécutif */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Résumé exécutif</p>
                <p style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{report.resume}</p>
              </div>

              {/* Avancement */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Avancement</p>
                <p style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{report.avancement}</p>
              </div>

              {/* Points d'attention */}
              {report.pointsAttention?.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-warning-default)', marginBottom: 8 }}>⚠ Points d&apos;attention</p>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {report.pointsAttention.map((p, i) => (
                      <li key={i} style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prochaines étapes */}
              {report.prochainesEtapes?.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Prochaines étapes</p>
                  <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {report.prochainesEtapes.map((e, i) => (
                      <li key={i} style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{e}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Envoi email */}
              {showEmailForm && (
                <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 10 }}>Envoyer par email</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      type="email"
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      placeholder="destinataire@example.com"
                      onKeyDown={e => e.key === 'Enter' && sendEmail()}
                      style={{
                        flex: 1, height: 34, padding: '0 12px',
                        background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)',
                        outline: 'none', fontFamily: 'var(--font-primary)',
                      }}
                    />
                    <button
                      onClick={sendEmail}
                      disabled={sending || !emailTo.trim()}
                      style={{ height: 34, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: sending || !emailTo.trim() ? 'not-allowed' : 'pointer', color: '#fff', opacity: sending || !emailTo.trim() ? 0.6 : 1, fontFamily: 'var(--font-primary)' }}
                    >
                      {sending ? 'Envoi…' : 'Envoyer'}
                    </button>
                    <button onClick={() => { setShowEmailForm(false); setEmailTo('') }} style={{ height: 34, padding: '0 10px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)', fontSize: 13 }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                Généré le {new Date(report.generatedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ height: 34, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>
            Fermer
          </button>
          {report && !showEmailForm && (
            <button
              onClick={() => setShowEmailForm(true)}
              style={{ height: 34, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-primary)' }}
            >
              <Send size={13} strokeWidth={1.5} /> Envoyer par email
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            style={{ height: 34, padding: '0 16px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-primary)' }}
          >
            {report
              ? <><RefreshCw size={13} strokeWidth={1.5} />{loading ? 'Génération…' : 'Régénérer'}</>
              : <><Sparkles size={13} strokeWidth={1.5} />{loading ? 'Génération…' : 'Générer'}</>
            }
          </button>
        </div>
      </div>
    </>
  )
}
