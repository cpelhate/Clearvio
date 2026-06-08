'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { PROJECT_COLORS, ProjectStatus, Project } from '@/types/project'

interface EditProjectModalProps {
  project: Project
  open: boolean
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'INITIALISATION', label: 'En initialisation' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'CRITIQUE', label: 'Critique' },
  { value: 'TERMINE', label: 'Terminé' },
  { value: 'ARCHIVE', label: 'Archivé' },
]

export function EditProjectModal({ project, open, onClose, onSaved, onDeleted }: EditProjectModalProps) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || '',
    status: project.status as ProjectStatus,
    startDate: project.startDate ? project.startDate.split('T')[0] : '',
    endDate: project.endDate ? project.endDate.split('T')[0] : '',
    category: project.category || '',
    color: project.color,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!open) return null

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  async function handleSave() {
    if (!form.name.trim()) { setError('Le nom est requis.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); setLoading(false); return }
      onSaved()
      onClose()
    } catch {
      setError('Une erreur est survenue.')
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading(true)
    try {
      await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      onClose()
      onDeleted?.()
    } catch {
      setError('Erreur lors de la suppression.')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', height: 36, padding: '0 12px',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)', fontSize: 14,
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)', outline: 'none',
    fontFamily: 'var(--font-primary)',
  }

  const labelStyle = {
    display: 'block' as const, fontSize: 13, fontWeight: 500,
    color: 'var(--color-text-secondary)', marginBottom: 6,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 560,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        padding: 32, margin: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            Paramètres du projet
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4 }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>Nom du projet *</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3}
              style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Statut</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} style={inputStyle}>
                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Catégorie</label>
              <input type="text" value={form.category} onChange={e => update('category', e.target.value)}
                placeholder="Ex : Informatique, RH..." style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date de début</label>
              <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date de fin prévue</label>
              <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Couleur</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => update('color', c)} style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-full)',
                  background: c, border: form.color === c ? '3px solid var(--color-text-primary)' : '3px solid transparent',
                  cursor: 'pointer', transition: 'border 150ms',
                }} />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: 'var(--color-danger-default)', marginTop: 16, padding: '8px 12px', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
              background: confirmDelete ? 'var(--color-danger-default)' : 'transparent',
              border: `1px solid ${confirmDelete ? 'var(--color-danger-default)' : 'var(--color-border-default)'}`,
              borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer',
              color: confirmDelete ? '#fff' : 'var(--color-danger-default)',
            }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
            {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              height: 36, padding: '0 16px', background: 'transparent',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)', fontSize: 14, cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={loading} style={{
              height: 36, padding: '0 20px',
              background: loading ? 'var(--color-accent-subtle)' : 'var(--color-accent-default)',
              border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', color: '#fff',
            }}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
