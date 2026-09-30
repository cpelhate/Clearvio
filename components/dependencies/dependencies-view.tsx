'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, AlertTriangle, Info, Link2 } from 'lucide-react'
import { InterProjectDepsSection } from './inter-project-deps-section'

// ── Types ──────────────────────────────────────────────────────────────

type DependableType = 'TACHE' | 'JALON' | 'LIVRABLE'
type DependencyType = 'FIN_DEBUT' | 'DEBUT_DEBUT' | 'FIN_FIN' | 'DEBUT_FIN'

interface ElementInfo {
  title: string
  status: string
  date: string | null
}

interface Dependency {
  id: string
  sourceType: DependableType
  sourceId: string
  targetType: DependableType
  targetId: string
  type: DependencyType
  lagDays: number
  createdAt: string
  source: ElementInfo | null
  target: ElementInfo | null
}

interface ProjectElement {
  id: string
  title: string
  status: string
  date: string | null
}

interface ProjectElements {
  tasks: ProjectElement[]
  milestones: ProjectElement[]
  deliverables: ProjectElement[]
}

// ── Constants ──────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DependableType, string> = {
  TACHE: 'Tâche', JALON: 'Jalon', LIVRABLE: 'Livrable',
}

const DEP_TYPE_LABELS: Record<DependencyType, string> = {
  FIN_DEBUT: 'F→D', DEBUT_DEBUT: 'D→D', FIN_FIN: 'F→F', DEBUT_FIN: 'D→F',
}
const DEP_TYPE_FULL: Record<DependencyType, string> = {
  FIN_DEBUT: 'Fin → Début', DEBUT_DEBUT: 'Début → Début',
  FIN_FIN: 'Fin → Fin', DEBUT_FIN: 'Début → Fin',
}

const DONE_STATUSES = new Set(['TERMINE', 'ATTEINT', 'VALIDE', 'LIVRE'])
const LATE_STATUSES = new Set(['BLOQUE', 'MANQUE'])

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getRisk(target: ElementInfo | null): 'late' | 'warn' | 'ok' {
  if (!target) return 'ok'
  if (LATE_STATUSES.has(target.status)) return 'late'
  if (!DONE_STATUSES.has(target.status) && target.date) {
    const daysLeft = (new Date(target.date).getTime() - Date.now()) / 86400000
    if (daysLeft < 0) return 'late'
    if (daysLeft < 7) return 'warn'
  }
  return 'ok'
}

// ── Sub-components ─────────────────────────────────────────────────────

function TypeChip({ type }: { type: DependableType }) {
  const styles: Record<DependableType, { bg: string; color: string }> = {
    TACHE:    { bg: 'var(--color-info-bg)',    color: 'var(--color-info-default)' },
    JALON:    { bg: 'var(--color-accent-bg)',  color: 'var(--color-accent-default)' },
    LIVRABLE: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-default)' },
  }
  const s = styles[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 500,
      background: s.bg, color: s.color,
    }}>
      {TYPE_LABELS[type]}
    </span>
  )
}

function DepTypeBadge({ type }: { type: DependencyType }) {
  const isHighlighted = type !== 'FIN_DEBUT'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      border: `1px solid ${isHighlighted ? 'var(--color-accent-subtle)' : 'var(--color-border-default)'}`,
      borderRadius: 'var(--radius-full)',
      fontSize: 11, fontFamily: 'var(--font-mono)',
      background: isHighlighted ? 'var(--color-accent-bg)' : 'transparent',
      color: isHighlighted ? 'var(--color-accent-default)' : 'var(--color-text-tertiary)',
    }}>
      {DEP_TYPE_LABELS[type]}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    TERMINE:   { bg: 'var(--color-success-bg)', color: 'var(--color-success-default)', label: 'Terminé' },
    EN_COURS:  { bg: 'var(--color-accent-bg)',  color: 'var(--color-accent-default)',  label: 'En cours' },
    A_FAIRE:   { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)', label: 'À faire' },
    BLOQUE:    { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger-default)',  label: 'Bloqué' },
    EN_REVUE:  { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-default)', label: 'En revue' },
    ATTEINT:   { bg: 'var(--color-success-bg)', color: 'var(--color-success-default)', label: 'Atteint' },
    A_VENIR:   { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)', label: 'À venir' },
    MANQUE:    { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger-default)',  label: 'Manqué' },
    REPORTE:   { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-default)', label: 'Reporté' },
    LIVRE:     { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-default)', label: 'Livré' },
    VALIDE:    { bg: 'var(--color-success-bg)', color: 'var(--color-success-default)', label: 'Validé' },
    REJETE:    { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger-default)',  label: 'Rejeté' },
  }
  const s = map[status] ?? { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)', label: status }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 500,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

// ── Creation Modal ─────────────────────────────────────────────────────

function CreateModal({
  projectId, elements, onClose, onCreated,
}: {
  projectId: string
  elements: ProjectElements
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [sourceType, setSourceType] = useState<DependableType>('TACHE')
  const [sourceId, setSourceId] = useState('')
  const [targetType, setTargetType] = useState<DependableType>('TACHE')
  const [targetId, setTargetId] = useState('')
  const [depType, setDepType] = useState<DependencyType>('FIN_DEBUT')
  const [lagDays, setLagDays] = useState(0)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const sourceList = elements[sourceType === 'TACHE' ? 'tasks' : sourceType === 'JALON' ? 'milestones' : 'deliverables']
  const targetList = elements[targetType === 'TACHE' ? 'tasks' : targetType === 'JALON' ? 'milestones' : 'deliverables']

  const filteredSource = sourceList.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase())
  )
  const selectedSource = sourceList.find(e => e.id === sourceId)

  const handleSave = async () => {
    if (!sourceId || !targetId) return
    setSaving(true)
    await fetch(`/api/projects/${projectId}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType, sourceId, targetType, targetId, type: depType, lagDays }),
    })
    setSaving(false)
    onCreated()
    onClose()
  }

  const btnStyle = (active: boolean): import('react').CSSProperties => ({
    flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-md)',
    border: `1px solid ${active ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
    background: active ? 'var(--color-accent-bg)' : 'var(--color-bg-primary)',
    color: active ? 'var(--color-accent-default)' : 'var(--color-text-secondary)',
    cursor: 'pointer', textAlign: 'center' as const, fontSize: 13, fontWeight: 500,
    fontFamily: 'var(--font-primary)',
  })

  const inputStyle: import('react').CSSProperties = {
    width: '100%', height: 36, padding: '0 10px',
    border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
    fontSize: 13, outline: 'none', fontFamily: 'var(--font-primary)',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520,
        boxShadow: '0 16px 48px rgba(0,0,0,.18)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Nouvelle dépendance</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-subtle)' }}>
          {([1, 2] as const).map(n => (
            <div key={n} style={{
              flex: 1, padding: '10px 16px', textAlign: 'center', fontSize: 12,
              borderBottom: `2px solid ${step === n ? 'var(--color-accent-default)' : step > n ? 'var(--color-success-default)' : 'transparent'}`,
              color: step === n ? 'var(--color-accent-default)' : step > n ? 'var(--color-success-default)' : 'var(--color-text-tertiary)',
              fontWeight: step === n ? 600 : 400,
            }}>
              {n === 1 ? 'Élément source' : 'Lien & cible'}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {step === 1 && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Type d'élément source</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['TACHE', 'JALON', 'LIVRABLE'] as DependableType[]).map(t => (
                    <button key={t} style={btnStyle(sourceType === t)} onClick={() => { setSourceType(t); setSourceId(''); setSearch('') }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Rechercher</label>
                <input style={inputStyle} placeholder={`Nom de la ${TYPE_LABELS[sourceType].toLowerCase()}…`} value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              </div>
              <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                {filteredSource.length === 0 ? (
                  <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Aucun résultat</div>
                ) : filteredSource.map(el => (
                  <div key={el.id} onClick={() => setSourceId(el.id)} style={{
                    padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle)',
                    background: sourceId === el.id ? 'var(--color-accent-bg)' : 'var(--color-bg-primary)',
                    borderLeft: sourceId === el.id ? '3px solid var(--color-accent-default)' : '3px solid transparent',
                  }}>
                    <StatusChip status={el.status} />
                    <span style={{ flex: 1, fontWeight: 500, color: sourceId === el.id ? 'var(--color-accent-default)' : 'var(--color-text-primary)' }}>{el.title}</span>
                    {el.date && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatDate(el.date)}</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Source recap */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: 'var(--color-accent-bg)',
                border: '1px solid var(--color-accent-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 16,
              }}>
                <TypeChip type={sourceType} />
                <span style={{ fontWeight: 500, color: 'var(--color-accent-default)', fontSize: 13 }}>{selectedSource?.title}</span>
              </div>

              {/* Dep type */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Type de lien</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['FIN_DEBUT', 'DEBUT_DEBUT', 'FIN_FIN', 'DEBUT_FIN'] as DependencyType[]).map(t => (
                    <button key={t} onClick={() => setDepType(t)} style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: `1px solid ${depType === t ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
                      background: depType === t ? 'var(--color-accent-bg)' : 'var(--color-bg-primary)',
                      color: depType === t ? 'var(--color-accent-default)' : 'var(--color-text-secondary)',
                      textAlign: 'left', fontFamily: 'var(--font-primary)',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{DEP_TYPE_LABELS[t]}</div>
                      <div style={{ fontSize: 11, marginTop: 2, opacity: .8 }}>{DEP_TYPE_FULL[t]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lag + target */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 100 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Décalage (j)</label>
                  <input type="number" min={0} value={lagDays} onChange={e => setLagDays(+e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Type d'élément cible</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['TACHE', 'JALON', 'LIVRABLE'] as DependableType[]).map(t => (
                      <button key={t} style={{ ...btnStyle(targetType === t), padding: '6px 10px', fontSize: 12 }} onClick={() => { setTargetType(t); setTargetId('') }}>
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Élément cible</label>
                <select value={targetId} onChange={e => setTargetId(e.target.value)} style={inputStyle}>
                  <option value="">Choisir…</option>
                  {targetList.filter(e => !(e.id === sourceId && targetType === sourceType)).map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
        }}>
          {step === 1 ? (
            <>
              <button onClick={onClose} style={{ height: 32, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>Annuler</button>
              <button onClick={() => setStep(2)} disabled={!sourceId} style={{ height: 32, padding: '0 14px', background: sourceId ? 'var(--color-accent-default)' : 'var(--color-text-disabled)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: sourceId ? 'pointer' : 'default', color: '#fff', fontFamily: 'var(--font-primary)' }}>
                Suivant →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} style={{ height: 32, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>← Retour</button>
              <button onClick={handleSave} disabled={!targetId || saving} style={{ height: 32, padding: '0 14px', background: targetId ? 'var(--color-accent-default)' : 'var(--color-text-disabled)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: targetId ? 'pointer' : 'default', color: '#fff', fontFamily: 'var(--font-primary)' }}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────

export function DependenciesView({ projectId }: { projectId: string }) {
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [elements, setElements] = useState<ProjectElements>({ tasks: [], milestones: [], deliverables: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'risk' | DependencyType>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [depsRes, tasksRes, milestonesRes, delivRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/dependencies`),
      fetch(`/api/projects/${projectId}/tasks`),
      fetch(`/api/projects/${projectId}/milestones`),
      fetch(`/api/projects/${projectId}/deliverables`),
    ])
    if (depsRes.ok) setDependencies(await depsRes.json())
    const tasks = tasksRes.ok ? await tasksRes.json() : []
    const milestones = milestonesRes.ok ? await milestonesRes.json() : []
    const deliverables = delivRes.ok ? await delivRes.json() : []
    setElements({
      tasks: tasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status, date: t.dueDate ?? null })),
      milestones: milestones.map((m: any) => ({ id: m.id, title: m.title, status: m.status, date: m.plannedDate ?? null })),
      deliverables: deliverables.map((d: any) => ({ id: d.id, title: d.title, status: d.status, date: d.plannedDate ?? null })),
    })
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await fetch(`/api/projects/${projectId}/dependencies/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await load()
  }

  // ── Stats ──
  const lateCount = dependencies.filter(d => getRisk(d.target) === 'late').length
  const warnCount = dependencies.filter(d => getRisk(d.target) === 'warn').length
  const okCount   = dependencies.filter(d => getRisk(d.target) === 'ok').length

  // ── Filter ──
  const filtered = dependencies.filter(d => {
    if (filter === 'risk' && getRisk(d.target) === 'ok') return false
    if (filter !== 'all' && filter !== 'risk' && d.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return d.source?.title.toLowerCase().includes(q) || d.target?.title.toLowerCase().includes(q)
    }
    return true
  })

  const lateAlerts = dependencies.filter(d => getRisk(d.target) === 'late')

  // ── Styles ──
  const segBtn = (active: boolean): React.CSSProperties => ({
    padding: '3px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12,
    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-primary)',
    background: active ? 'var(--color-bg-primary)' : 'none',
    color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>Dépendances</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Liens entre tâches, jalons et livrables du projet
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff' }}
        >
          <Plus size={14} strokeWidth={1.5} /> Ajouter une dépendance
        </button>
      </div>

      {/* Alerts */}
      {!loading && lateAlerts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 10,
          background: 'var(--color-danger-bg)', border: '1px solid rgba(220,38,38,.2)',
          color: 'var(--color-danger-default)', fontSize: 13,
        }}>
          <AlertTriangle size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>{lateAlerts.length} élément{lateAlerts.length > 1 ? 's' : ''} bloqué{lateAlerts.length > 1 ? 's' : ''} ou en retard :</strong>{' '}
            {lateAlerts.map(d => d.target?.title).filter(Boolean).join(', ')}.
          </span>
        </div>
      )}

      {/* Stats */}
      {!loading && dependencies.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { val: dependencies.length, label: 'Dépendances', color: 'var(--color-text-primary)', bg: 'var(--color-bg-secondary)', border: 'var(--color-border-subtle)' },
            { val: lateCount, label: 'Bloqués / en retard', color: 'var(--color-danger-default)', bg: 'var(--color-danger-bg)', border: 'rgba(220,38,38,.15)' },
            { val: warnCount, label: 'À surveiller', color: 'var(--color-warning-default)', bg: 'var(--color-warning-bg)', border: 'rgba(217,119,6,.15)' },
            { val: okCount, label: 'Sans problème', color: 'var(--color-success-default)', bg: 'var(--color-success-bg)', border: 'rgba(22,163,74,.15)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, minWidth: 110, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 52, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : dependencies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Link2 size={32} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucune dépendance</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Créez des liens entre les tâches, jalons et livrables de ce projet.</p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un élément…"
              style={{ flex: 1, minWidth: 160, maxWidth: 220, height: 32, padding: '0 10px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-primary)' }}
            />
            <div style={{ display: 'flex', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 3, gap: 2 }}>
              <button style={segBtn(filter === 'all')} onClick={() => setFilter('all')}>Tous</button>
              <button style={segBtn(filter === 'risk')} onClick={() => setFilter('risk')}>À risque</button>
              <button style={segBtn(filter === 'FIN_DEBUT')} onClick={() => setFilter('FIN_DEBUT')}>F→D</button>
              <button style={segBtn(filter === 'DEBUT_DEBUT')} onClick={() => setFilter('DEBUT_DEBUT')}>D→D</button>
            </div>
          </div>

          {/* Table */}
          <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* Head */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 72px 64px 52px 1fr 72px 90px 100px 40px',
              background: 'var(--color-bg-secondary)', padding: '8px 12px',
              borderBottom: '1px solid var(--color-border-subtle)',
              fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
            }}>
              <span>Source</span>
              <span>Type</span>
              <span>Lien</span>
              <span style={{ textAlign: 'center' }}>Écart</span>
              <span>Cible</span>
              <span>Type</span>
              <span>Statut</span>
              <span>Date prévue</span>
              <span></span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                Aucune dépendance pour ces filtres
              </div>
            ) : filtered.map(dep => {
              const risk = getRisk(dep.target)
              const isLate = risk === 'late'
              const isWarn = risk === 'warn'
              return (
                <div key={dep.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 72px 64px 52px 1fr 72px 90px 100px 40px',
                  alignItems: 'center', padding: '9px 12px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  borderLeft: `3px solid ${isLate ? 'var(--color-danger-default)' : isWarn ? 'var(--color-warning-default)' : 'transparent'}`,
                  background: isLate ? 'rgba(220,38,38,.03)' : isWarn ? 'rgba(217,119,6,.03)' : 'var(--color-bg-primary)',
                }}>
                  {/* Source */}
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dep.source?.title ?? '—'}
                    </div>
                    {dep.source && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                        <StatusChip status={dep.source.status} />
                      </div>
                    )}
                  </div>
                  <div><TypeChip type={dep.sourceType} /></div>
                  <div><DepTypeBadge type={dep.type} /></div>
                  <div style={{ textAlign: 'center', fontSize: 12, fontFamily: 'var(--font-mono)', color: dep.lagDays > 0 ? 'var(--color-warning-default)' : 'var(--color-text-tertiary)' }}>
                    {dep.lagDays > 0 ? `+${dep.lagDays} j` : '0 j'}
                  </div>
                  {/* Target */}
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: isLate ? 'var(--color-danger-default)' : isWarn ? 'var(--color-warning-default)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dep.target?.title ?? '—'}
                    </div>
                  </div>
                  <div><TypeChip type={dep.targetType} /></div>
                  <div>{dep.target ? <StatusChip status={dep.target.status} /> : '—'}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: isLate ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)' }}>
                    {formatDate(dep.target?.date ?? null)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleDelete(dep.id)}
                      title={confirmDelete === dep.id ? 'Cliquer pour confirmer' : 'Supprimer'}
                      style={{
                        background: confirmDelete === dep.id ? 'var(--color-danger-bg)' : 'none',
                        border: 'none', cursor: 'pointer', padding: '4px 6px',
                        borderRadius: 'var(--radius-sm)',
                        color: confirmDelete === dep.id ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)',
                      }}
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
            F→D Fin→Début · D→D Début→Début · F→F Fin→Fin · D→F Début→Fin · La barre à gauche indique un risque (orange) ou un blocage (rouge)
          </p>
        </>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border-subtle)', margin: '28px 0 24px' }} />

      {/* Inter-project dependencies */}
      <InterProjectDepsSection currentProjectId={projectId} defaultCollapsed={false} />

      {showModal && (
        <CreateModal
          projectId={projectId}
          elements={elements}
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
