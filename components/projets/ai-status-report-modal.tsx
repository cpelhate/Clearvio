'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Sparkles, Send, TrendingUp, TrendingDown, Minus, AlertTriangle,
  RefreshCw, Calendar, Clock, Users, History, ChevronDown, Plus, Trash2,
  CheckSquare, Square,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { usePlan } from '@/hooks/use-plan'

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
    total: number; aFaire: number; enCours: number; enRevue: number
    termine: number; bloque: number; enRetard: number
  }
  progressPct: number
}

interface ReportConfig {
  introText: string | null
  sections: string[]
  scheduleEnabled: boolean
  scheduleFrequency: 'WEEKLY' | 'BIMONTHLY' | 'MONTHLY' | null
  scheduleDayOfWeek: number
  scheduleHour: number
  scheduleRecipients: string[]
  nextSendAt: string | null
}

interface SendLog {
  id: string
  sentAt: string
  sentByName: string
  recipients: string[]
  sections: string[]
  trigger: 'MANUAL' | 'SCHEDULED'
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  errorMsg: string | null
}

interface Member { userId: string; name: string; email: string }

const TENDANCE_CONFIG = {
  POSITIVE: { label: 'Positive', color: 'var(--color-success-default)', bg: 'var(--color-success-bg)', icon: TrendingUp },
  NEUTRE: { label: 'Neutre', color: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)', icon: Minus },
  ATTENTION: { label: 'Attention', color: 'var(--color-warning-default)', bg: 'var(--color-warning-bg)', icon: AlertTriangle },
  CRITIQUE: { label: 'Critique', color: 'var(--color-danger-default)', bg: 'var(--color-danger-bg)', icon: AlertTriangle },
}

const ALL_SECTIONS = [
  { key: 'resume', label: 'Résumé exécutif' },
  { key: 'avancement', label: 'Avancement' },
  { key: 'pointsAttention', label: "Points d'attention" },
  { key: 'prochainesEtapes', label: 'Prochaines étapes' },
  { key: 'risques', label: 'Risques' },
]

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const FREQ_LABELS: Record<string, string> = {
  WEEKLY: 'Chaque semaine',
  BIMONTHLY: 'Deux fois par mois',
  MONTHLY: 'Chaque mois',
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'var(--color-success-default)',
  PARTIAL: 'var(--color-warning-default)',
  FAILED: 'var(--color-danger-default)',
}
const STATUS_LABELS: Record<string, string> = { SUCCESS: 'Envoyé', PARTIAL: 'Partiel', FAILED: 'Échec' }

type Tab = 'rapport' | 'envoi' | 'historique'

export function AiStatusReportModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('rapport')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<StatusReport | null>(null)
  const { toast } = useToast()
  const { plan, limits } = usePlan()

  // Send tab state
  const [config, setConfig] = useState<ReportConfig>({
    introText: null, sections: ALL_SECTIONS.map(s => s.key),
    scheduleEnabled: false, scheduleFrequency: 'WEEKLY',
    scheduleDayOfWeek: 1, scheduleHour: 8, scheduleRecipients: [], nextSendAt: null,
  })
  const [members, setMembers] = useState<Member[]>([])
  const [recipients, setRecipients] = useState<string[]>([])
  const [externalInput, setExternalInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)

  // History tab
  const [logs, setLogs] = useState<SendLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const canSchedule = plan === 'PRO' || plan === 'BUSINESS'
  const canSend = plan !== 'FREE'

  const loadConfig = useCallback(async () => {
    try {
      const [cfgRes, membRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/report-config`),
        fetch(`/api/projects/${projectId}/members`),
      ])
      if (cfgRes.ok) {
        const cfg = await cfgRes.json()
        setConfig({
          introText: cfg.introText ?? null,
          sections: cfg.sections ?? ALL_SECTIONS.map(s => s.key),
          scheduleEnabled: cfg.scheduleEnabled ?? false,
          scheduleFrequency: cfg.scheduleFrequency ?? 'WEEKLY',
          scheduleDayOfWeek: cfg.scheduleDayOfWeek ?? 1,
          scheduleHour: cfg.scheduleHour ?? 8,
          scheduleRecipients: cfg.scheduleRecipients ?? [],
          nextSendAt: cfg.nextSendAt ?? null,
        })
        setRecipients(cfg.scheduleRecipients ?? [])
      }
      if (membRes.ok) setMembers(await membRes.json())
      setConfigLoaded(true)
    } catch { setConfigLoaded(true) }
  }, [projectId])

  useEffect(() => { loadConfig() }, [loadConfig])

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/report-logs`)
      if (res.ok) setLogs(await res.json())
    } finally { setLogsLoading(false) }
  }, [projectId])

  useEffect(() => {
    if (activeTab === 'historique') loadLogs()
  }, [activeTab, loadLogs])

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-status-report`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur IA', 'error'); return }
      setReport(await res.json())
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoading(false) }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/report-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, scheduleRecipients: recipients }),
      })
      if (res.ok) {
        const updated = await res.json()
        setConfig(prev => ({ ...prev, nextSendAt: updated.nextSendAt }))
        toast('Configuration sauvegardée', 'success')
      } else {
        const d = await res.json()
        toast(d.error ?? 'Erreur de sauvegarde', 'error')
      }
    } catch { toast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  const sendNow = async () => {
    if (!report) { toast('Générez d\'abord un rapport', 'info'); return }
    if (recipients.length === 0) { toast('Ajoutez au moins un destinataire', 'info'); return }
    setSending(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/report-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          report,
          sections: config.sections,
          introText: config.introText,
          trigger: 'MANUAL',
        }),
      })
      const d = await res.json()
      if (res.ok) {
        toast(d.partial ? `Envoyé (${d.failed?.length} échec(s))` : 'Rapport envoyé avec succès', d.partial ? 'info' : 'success')
        if (activeTab === 'historique') loadLogs()
      } else {
        toast(d.error ?? 'Erreur d\'envoi', 'error')
      }
    } catch { toast('Erreur réseau', 'error') }
    finally { setSending(false) }
  }

  const addExternal = () => {
    const email = externalInput.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Adresse email invalide', 'error'); return
    }
    if (recipients.includes(email)) { toast('Destinataire déjà ajouté', 'info'); return }
    setRecipients(prev => [...prev, email])
    setExternalInput('')
  }

  const toggleRecipient = (email: string) => {
    setRecipients(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email])
  }

  const toggleSection = (key: string) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.includes(key) ? prev.sections.filter(s => s !== key) : [...prev.sections, key],
    }))
  }

  const tc = report ? TENDANCE_CONFIG[report.tendance] : null
  const TcIcon = tc?.icon

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1, height: 36, background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, fontFamily: 'var(--font-primary)',
    color: activeTab === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
    fontWeight: activeTab === t ? 600 : 400,
    borderBottom: activeTab === t ? '2px solid var(--color-accent-default)' : '2px solid transparent',
    transition: 'color 150ms, border-color 150ms',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  })

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301, width: 660, maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh',
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Sparkles size={18} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Rapport de statut</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Généré par IA · partageable par email</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex' }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-subtle)', padding: '0 20px' }}>
          <button style={tabStyle('rapport')} onClick={() => setActiveTab('rapport')}>
            <Sparkles size={13} strokeWidth={1.5} /> Rapport
          </button>
          <button style={tabStyle('envoi')} onClick={() => setActiveTab('envoi')}>
            <Send size={13} strokeWidth={1.5} /> Envoi
          </button>
          <button style={tabStyle('historique')} onClick={() => setActiveTab('historique')}>
            <History size={13} strokeWidth={1.5} /> Historique
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

          {/* ── TAB: RAPPORT ── */}
          {activeTab === 'rapport' && (
            !report ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 16, textAlign: 'center' }}>
                <Sparkles size={36} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>Générer le rapport de statut</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', maxWidth: 360, lineHeight: 1.6 }}>
                    L&apos;IA analyse le contexte du projet et génère un rapport synthétique prêt à partager.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {tc && TcIcon && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 'var(--radius-full)', background: tc.bg, border: `1px solid ${tc.color}44` }}>
                    <TcIcon size={14} strokeWidth={1.5} style={{ color: tc.color }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: tc.color }}>{tc.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>— {report.tendanceRaison}</span>
                  </div>
                )}
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
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Résumé exécutif</p>
                  <p style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{report.resume}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Avancement</p>
                  <p style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{report.avancement}</p>
                </div>
                {report.pointsAttention?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-warning-default)', marginBottom: 8 }}>⚠ Points d&apos;attention</p>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {report.pointsAttention.map((p, i) => <li key={i} style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {report.prochainesEtapes?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Prochaines étapes</p>
                    <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {report.prochainesEtapes.map((e, i) => <li key={i} style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{e}</li>)}
                    </ol>
                  </div>
                )}
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  Généré le {new Date(report.generatedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )
          )}

          {/* ── TAB: ENVOI ── */}
          {activeTab === 'envoi' && (
            !canSend ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12, textAlign: 'center' }}>
                <Send size={32} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 320, lineHeight: 1.6 }}>
                  L&apos;envoi de rapports par email est disponible à partir du plan Pro.
                </p>
              </div>
            ) : !configLoaded ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement…</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Intro text */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 8 }}>
                    Message d&apos;introduction (persistant)
                  </label>
                  <textarea
                    value={config.introText ?? ''}
                    onChange={e => setConfig(prev => ({ ...prev, introText: e.target.value || null }))}
                    placeholder="Présentation du projet, rappel des dates clés, contexte…"
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)',
                      outline: 'none', fontFamily: 'var(--font-primary)', resize: 'vertical', lineHeight: 1.6,
                    }}
                  />
                </div>

                {/* Sections */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 10 }}>
                    Sections à inclure
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ALL_SECTIONS.map(s => (
                      <button key={s.key} onClick={() => toggleSection(s.key)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, background: 'none',
                        border: 'none', cursor: 'pointer', padding: '6px 0', textAlign: 'left', fontFamily: 'var(--font-primary)',
                      }}>
                        {config.sections.includes(s.key)
                          ? <CheckSquare size={15} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)', flexShrink: 0 }} />
                          : <Square size={15} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                        }
                        <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 10 }}>
                    <Users size={11} strokeWidth={1.5} style={{ display: 'inline', marginRight: 4 }} />
                    Destinataires
                  </label>
                  {members.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Membres du projet</p>
                      {members.map(m => (
                        <button key={m.userId} onClick={() => toggleRecipient(m.email ?? '')} style={{
                          display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
                          cursor: 'pointer', padding: '5px 0', textAlign: 'left', fontFamily: 'var(--font-primary)',
                        }}>
                          {recipients.includes(m.email ?? '')
                            ? <CheckSquare size={15} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)', flexShrink: 0 }} />
                            : <Square size={15} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                          }
                          <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{m.name ?? m.email}</span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{m.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Adresse externe</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      type="email"
                      value={externalInput}
                      onChange={e => setExternalInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExternal()}
                      placeholder="contact@example.com"
                      style={{
                        flex: 1, height: 34, padding: '0 12px',
                        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)',
                        outline: 'none', fontFamily: 'var(--font-primary)',
                      }}
                    />
                    <button onClick={addExternal} style={{ height: 34, padding: '0 12px', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontFamily: 'var(--font-primary)' }}>
                      <Plus size={13} strokeWidth={1.5} /> Ajouter
                    </button>
                  </div>
                  {recipients.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {recipients.map(r => (
                        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-full)', padding: '3px 10px 3px 10px', fontSize: 12, color: 'var(--color-text-primary)' }}>
                          {r}
                          <button onClick={() => setRecipients(prev => prev.filter(x => x !== r))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-text-tertiary)' }}>
                            <X size={11} strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Schedule (PRO/BUSINESS only) */}
                {canSchedule && (
                  <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: config.scheduleEnabled ? 16 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Envoi automatique</span>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, scheduleEnabled: !prev.scheduleEnabled }))}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: config.scheduleEnabled ? 'var(--color-accent-default)' : 'var(--color-bg-tertiary)',
                          border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 150ms',
                        }}
                      >
                        <div style={{ position: 'absolute', top: 3, left: config.scheduleEnabled ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 150ms' }} />
                      </button>
                    </div>

                    {config.scheduleEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>Fréquence</label>
                            <div style={{ position: 'relative' }}>
                              <select
                                value={config.scheduleFrequency ?? 'WEEKLY'}
                                onChange={e => setConfig(prev => ({ ...prev, scheduleFrequency: e.target.value as ReportConfig['scheduleFrequency'] }))}
                                style={{ width: '100%', height: 34, padding: '0 30px 0 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-primary)', appearance: 'none', cursor: 'pointer' }}
                              >
                                {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                              <ChevronDown size={12} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
                            </div>
                          </div>

                          {config.scheduleFrequency === 'WEEKLY' && (
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>Jour</label>
                              <div style={{ position: 'relative' }}>
                                <select
                                  value={config.scheduleDayOfWeek}
                                  onChange={e => setConfig(prev => ({ ...prev, scheduleDayOfWeek: Number(e.target.value) }))}
                                  style={{ width: '100%', height: 34, padding: '0 30px 0 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-primary)', appearance: 'none', cursor: 'pointer' }}
                                >
                                  {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                </select>
                                <ChevronDown size={12} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
                              </div>
                            </div>
                          )}

                          {config.scheduleFrequency === 'MONTHLY' && (
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>Jour du mois</label>
                              <div style={{ position: 'relative' }}>
                                <select
                                  value={config.scheduleDayOfWeek}
                                  onChange={e => setConfig(prev => ({ ...prev, scheduleDayOfWeek: Number(e.target.value) }))}
                                  style={{ width: '100%', height: 34, padding: '0 30px 0 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-primary)', appearance: 'none', cursor: 'pointer' }}
                                >
                                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <ChevronDown size={12} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
                              </div>
                            </div>
                          )}

                          <div style={{ flex: 0, minWidth: 90 }}>
                            <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
                              <Clock size={10} strokeWidth={1.5} style={{ display: 'inline', marginRight: 3 }} /> Heure
                            </label>
                            <div style={{ position: 'relative' }}>
                              <select
                                value={config.scheduleHour}
                                onChange={e => setConfig(prev => ({ ...prev, scheduleHour: Number(e.target.value) }))}
                                style={{ width: '100%', height: 34, padding: '0 30px 0 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-primary)', appearance: 'none', cursor: 'pointer' }}
                              >
                                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}h00</option>)}
                              </select>
                              <ChevronDown size={12} strokeWidth={1.5} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
                            </div>
                          </div>
                        </div>

                        {config.nextSendAt && (
                          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                            Prochain envoi : {new Date(config.nextSendAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}

                        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}>
                          Les destinataires configurés ci-dessus recevront le rapport automatiquement.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── TAB: HISTORIQUE ── */}
          {activeTab === 'historique' && (
            logsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement…</p>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10 }}>
                <History size={32} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Aucun envoi effectué</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {logs.map(log => (
                  <div key={log.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {new Date(log.sentAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                          {log.trigger === 'SCHEDULED' ? 'Auto' : 'Manuel'}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-full)', color: STATUS_COLORS[log.status], background: `${STATUS_COLORS[log.status]}18` }}>
                        {STATUS_LABELS[log.status]}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                      Par {log.sentByName === 'SYSTEM' ? 'Planification automatique' : log.sentByName}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {log.recipients.map(r => (
                        <span key={r} style={{ fontSize: 11, padding: '1px 7px', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-full)', color: 'var(--color-text-secondary)' }}>{r}</span>
                      ))}
                    </div>
                    {log.errorMsg && (
                      <p style={{ fontSize: 11, color: 'var(--color-danger-default)', marginTop: 6 }}>{log.errorMsg}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ height: 34, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>
            Fermer
          </button>

          {activeTab === 'envoi' && canSend && (
            <>
              <button onClick={saveConfig} disabled={saving} style={{ height: 34, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--color-text-secondary)', opacity: saving ? 0.6 : 1, fontFamily: 'var(--font-primary)' }}>
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              <button onClick={sendNow} disabled={sending || !report || recipients.length === 0} style={{ height: 34, padding: '0 16px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: (sending || !report || recipients.length === 0) ? 'not-allowed' : 'pointer', color: '#fff', opacity: (sending || !report || recipients.length === 0) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-primary)' }}>
                <Send size={13} strokeWidth={1.5} /> {sending ? 'Envoi…' : 'Envoyer maintenant'}
              </button>
            </>
          )}

          {activeTab === 'rapport' && (
            <>
              {report && (
                <button onClick={() => setActiveTab('envoi')} style={{ height: 34, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-primary)' }}>
                  <Send size={13} strokeWidth={1.5} /> Envoyer
                </button>
              )}
              <button onClick={generate} disabled={loading || !limits.ai} style={{ height: 34, padding: '0 16px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: (loading || !limits.ai) ? 'not-allowed' : 'pointer', color: '#fff', opacity: (loading || !limits.ai) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-primary)' }}>
                {report
                  ? <><RefreshCw size={13} strokeWidth={1.5} />{loading ? 'Génération…' : 'Régénérer'}</>
                  : <><Sparkles size={13} strokeWidth={1.5} />{loading ? 'Génération…' : 'Générer'}</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
