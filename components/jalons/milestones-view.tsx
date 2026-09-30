'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Diamond, Trash2, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react'
import { Milestone, MilestoneStatus, MILESTONE_STATUS_LABELS, MILESTONE_STATUS_COLORS, MILESTONE_STATUS_BG } from '@/types/milestone'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_OPTIONS: MilestoneStatus[] = ['A_VENIR', 'ATTEINT', 'MANQUE', 'REPORTE']

interface MilestonesViewProps { projectId: string }

export function MilestonesView({ projectId }: MilestonesViewProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', plannedDate: '', status: 'A_VENIR' as MilestoneStatus })
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ title: string; plannedDate: string }>({ title: '', plannedDate: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/milestones`)
    if (res.ok) setMilestones(await res.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.plannedDate) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { await load(); setShowForm(false); setForm({ title: '', plannedDate: '', status: 'A_VENIR' }) }
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: MilestoneStatus) => {
    await fetch(`/api/projects/${projectId}/milestones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await fetch(`/api/projects/${projectId}/milestones/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await load()
  }

  const startEdit = (m: Milestone) => {
    setEditingId(m.id)
    setEditValues({ title: m.title, plannedDate: m.plannedDate ? m.plannedDate.split('T')[0] : '' })
  }

  const saveEdit = async (id: string) => {
    if (!editValues.title.trim()) { setEditingId(null); return }
    await fetch(`/api/projects/${projectId}/milestones/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editValues.title, plannedDate: editValues.plannedDate || undefined }),
    })
    setEditingId(null)
    await load()
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>Jalons</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Événements clés du projet sans durée
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
            background: 'var(--color-accent-default)', border: 'none',
            borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', color: '#fff',
          }}
        >
          <Plus size={14} strokeWidth={1.5} /> Nouveau jalon
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div style={{
          background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Intitulé *</label>
              <input
                autoFocus value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex : Validation maquettes" style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Date prévue *</label>
              <input type="date" value={form.plannedDate}
                onChange={e => setForm(p => ({ ...p, plannedDate: e.target.value }))}
                style={{ ...inputStyle, width: 160 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Statut</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as MilestoneStatus }))}
                style={{ ...inputStyle, width: 140 }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{MILESTONE_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleCreate} disabled={saving}
              style={{ height: 32, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ height: 32, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste jalons */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2].map(i => <div key={i} style={{ height: 56, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : milestones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Diamond size={32} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucun jalon</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Créez votre premier jalon pour structurer le calendrier du projet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {milestones.map(m => (
            <div key={m.id} style={{
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                {/* Losange jalon */}
                <div style={{
                  width: 14, height: 14, background: MILESTONE_STATUS_COLORS[m.status],
                  transform: 'rotate(45deg)', flexShrink: 0,
                }} />

                {/* Titre / Date — éditables inline */}
                {editingId === m.id ? (
                  <>
                    <input
                      autoFocus
                      value={editValues.title}
                      onChange={e => setEditValues(p => ({ ...p, title: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(m.id); if (e.key === 'Escape') setEditingId(null) }}
                      style={{ flex: 1, height: 28, padding: '0 8px', fontSize: 14, border: '1px solid var(--color-accent-default)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-primary)' }}
                    />
                    <input
                      type="date"
                      value={editValues.plannedDate}
                      onChange={e => setEditValues(p => ({ ...p, plannedDate: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(m.id); if (e.key === 'Escape') setEditingId(null) }}
                      style={{ height: 28, padding: '0 8px', fontSize: 13, border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-primary)', width: 150 }}
                    />
                    <button onClick={() => saveEdit(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--color-accent-default)', display: 'flex', alignItems: 'center' }}>
                      <Check size={14} strokeWidth={1.5} />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {m.title}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {formatDate(m.plannedDate)}
                    </span>
                    <button onClick={() => startEdit(m)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                  </>
                )}

                {/* Statut */}
                <select
                  value={m.status}
                  onChange={e => handleStatusChange(m.id, e.target.value as MilestoneStatus)}
                  style={{
                    height: 28, padding: '0 8px', fontSize: 12, fontWeight: 500,
                    border: `1px solid ${MILESTONE_STATUS_COLORS[m.status]}33`,
                    borderRadius: 'var(--radius-full)',
                    background: MILESTONE_STATUS_BG[m.status],
                    color: MILESTONE_STATUS_COLORS[m.status],
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{MILESTONE_STATUS_LABELS[s]}</option>)}
                </select>

                {/* Livrables toggle */}
                {(m.deliverables?.length ?? 0) > 0 && (
                  <button onClick={() => toggleExpand(m.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    {expanded.has(m.id) ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
                    {m.deliverables?.length} livrable{(m.deliverables?.length ?? 0) > 1 ? 's' : ''}
                  </button>
                )}

                {/* Supprimer */}
                <button
                  onClick={() => handleDelete(m.id)}
                  style={{
                    background: confirmDelete === m.id ? 'var(--color-danger-bg)' : 'none',
                    border: 'none', cursor: 'pointer', padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    color: confirmDelete === m.id ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)',
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>

              {/* Livrables liés */}
              {expanded.has(m.id) && m.deliverables && m.deliverables.length > 0 && (
                <div style={{ borderTop: '1px solid var(--color-border-subtle)', padding: '8px 16px 12px 44px' }}>
                  {m.deliverables.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-border-default)', flexShrink: 0 }} />
                      {d.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
