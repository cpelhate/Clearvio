'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Package, Trash2 } from 'lucide-react'
import { Deliverable, DeliverableStatus, DELIVERABLE_STATUS_LABELS, DELIVERABLE_STATUS_COLORS, DELIVERABLE_STATUS_BG, Milestone } from '@/types/milestone'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_OPTIONS: DeliverableStatus[] = ['A_FAIRE', 'EN_COURS', 'LIVRE', 'VALIDE', 'REJETE']

interface DeliverablesViewProps { projectId: string }

export function DeliverablesView({ projectId }: DeliverablesViewProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', milestoneId: '', plannedDate: '', status: 'A_FAIRE' as DeliverableStatus })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [dRes, mRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/deliverables`),
      fetch(`/api/projects/${projectId}/milestones`),
    ])
    if (dRes.ok) setDeliverables(await dRes.json())
    if (mRes.ok) setMilestones(await mRes.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, milestoneId: form.milestoneId || null }),
    })
    if (res.ok) { await load(); setShowForm(false); setForm({ title: '', description: '', milestoneId: '', plannedDate: '', status: 'A_FAIRE' }) }
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: DeliverableStatus) => {
    await fetch(`/api/projects/${projectId}/deliverables/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await fetch(`/api/projects/${projectId}/deliverables/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await load()
  }

  const inputStyle = {
    width: '100%', height: 36, padding: '0 12px',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)', fontSize: 14,
    background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
    outline: 'none', fontFamily: 'var(--font-primary)',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>Livrables</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Résultats concrets attendus du projet</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff' }}>
          <Plus size={14} strokeWidth={1.5} /> Nouveau livrable
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Intitulé *</label>
              <input autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex : Cahier des charges validé" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Date de livraison prévue</label>
              <input type="date" value={form.plannedDate} onChange={e => setForm(p => ({ ...p, plannedDate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Jalon associé</label>
              <select value={form.milestoneId} onChange={e => setForm(p => ({ ...p, milestoneId: e.target.value }))} style={inputStyle}>
                <option value="">Aucun</option>
                {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={saving} style={{ height: 32, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ height: 32, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 52, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : deliverables.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Package size={32} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucun livrable</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Définissez les résultats concrets attendus de ce projet.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 160px 36px', gap: 16, padding: '8px 16px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-default)' }}>
            {['Livrable', 'Statut', 'Date prévue', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'var(--color-text-tertiary)' }}>{h}</span>
            ))}
          </div>
          {deliverables.map((d, idx) => (
            <div key={d.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 140px 160px 36px',
              gap: 16, padding: '10px 16px', alignItems: 'center',
              borderBottom: idx < deliverables.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
            }}>
              <span style={{ fontSize: 14, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
              <select
                value={d.status}
                onChange={e => handleStatusChange(d.id, e.target.value as DeliverableStatus)}
                style={{
                  height: 26, padding: '0 8px', fontSize: 11, fontWeight: 500,
                  border: `1px solid ${DELIVERABLE_STATUS_COLORS[d.status]}33`,
                  borderRadius: 'var(--radius-full)',
                  background: DELIVERABLE_STATUS_BG[d.status],
                  color: DELIVERABLE_STATUS_COLORS[d.status],
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{DELIVERABLE_STATUS_LABELS[s]}</option>)}
              </select>
              <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatDate(d.plannedDate)}</span>
              <button onClick={() => handleDelete(d.id)}
                style={{ background: confirmDelete === d.id ? 'var(--color-danger-bg)' : 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)', color: confirmDelete === d.id ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)' }}>
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
