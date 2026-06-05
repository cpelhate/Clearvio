'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Target, Trash2, CheckCircle2 } from 'lucide-react'
import { ProjectObjective, ObjectiveStatus, OBJECTIVE_STATUS_LABELS, OBJECTIVE_STATUS_COLORS, OBJECTIVE_STATUS_BG } from '@/types/milestone'

const STATUS_OPTIONS: ObjectiveStatus[] = ['PREVU', 'EN_COURS', 'ATTEINT', 'ABANDONNE']

interface ObjectivesViewProps { projectId: string }

export function ObjectivesView({ projectId }: ObjectivesViewProps) {
  const [objectives, setObjectives] = useState<ProjectObjective[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', successIndicator: '' })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/objectives`)
    if (res.ok) setObjectives(await res.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/objectives`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { await load(); setShowForm(false); setForm({ title: '', successIndicator: '' }) }
    else {
      const d = await res.json()
      alert(d.error || 'Erreur')
    }
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: ObjectiveStatus) => {
    await fetch(`/api/projects/${projectId}/objectives/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await fetch(`/api/projects/${projectId}/objectives/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await load()
  }

  const atteints = objectives.filter(o => o.status === 'ATTEINT').length
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
          <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>Objectifs</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {objectives.length}/10 objectifs
            {objectives.length > 0 && ` · ${atteints} atteint${atteints > 1 ? 's' : ''}`}
          </p>
        </div>
        {objectives.length < 10 && (
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff' }}>
            <Plus size={14} strokeWidth={1.5} /> Nouvel objectif
          </button>
        )}
      </div>

      {/* Barre de progression */}
      {objectives.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 'var(--radius-full)',
              background: 'var(--color-success-default)',
              width: `${(atteints / objectives.length) * 100}%`,
              transition: 'width 400ms var(--ease-default)',
            }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            {Math.round((atteints / objectives.length) * 100)}% des objectifs atteints
          </p>
        </div>
      )}

      {showForm && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Intitulé de l&apos;objectif *</label>
              <input autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex : Réduire le temps de traitement de 30%" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Indicateur de succès</label>
              <input value={form.successIndicator} onChange={e => setForm(p => ({ ...p, successIndicator: e.target.value }))} placeholder="Ex : Mesure via rapport mensuel" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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
          {[1,2].map(i => <div key={i} style={{ height: 60, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : objectives.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Target size={32} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucun objectif</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Définissez jusqu&apos;à 10 objectifs pour ce projet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {objectives.map(obj => (
            <div key={obj.id} style={{
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)', padding: '14px 16px',
              borderLeft: `3px solid ${OBJECTIVE_STATUS_COLORS[obj.status]}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <CheckCircle2 size={18} strokeWidth={1.5} style={{ color: OBJECTIVE_STATUS_COLORS[obj.status], flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: obj.successIndicator ? 4 : 0, textDecoration: obj.status === 'ABANDONNE' ? 'line-through' : 'none', opacity: obj.status === 'ABANDONNE' ? 0.6 : 1 }}>
                    {obj.title}
                  </p>
                  {obj.successIndicator && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                      Indicateur : {obj.successIndicator}
                    </p>
                  )}
                </div>
                <select
                  value={obj.status}
                  onChange={e => handleStatusChange(obj.id, e.target.value as ObjectiveStatus)}
                  style={{
                    height: 26, padding: '0 8px', fontSize: 11, fontWeight: 500,
                    border: `1px solid ${OBJECTIVE_STATUS_COLORS[obj.status]}33`,
                    borderRadius: 'var(--radius-full)',
                    background: OBJECTIVE_STATUS_BG[obj.status],
                    color: OBJECTIVE_STATUS_COLORS[obj.status],
                    cursor: 'pointer', outline: 'none', flexShrink: 0,
                  }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{OBJECTIVE_STATUS_LABELS[s]}</option>)}
                </select>
                <button onClick={() => handleDelete(obj.id)}
                  style={{ background: confirmDelete === obj.id ? 'var(--color-danger-bg)' : 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)', color: confirmDelete === obj.id ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)', flexShrink: 0 }}>
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
