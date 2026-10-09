'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { PROJECT_COLORS, ProjectStatus, Project } from '@/types/project'
import { useToast } from '@/components/ui/toast'

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
  const { toast } = useToast()
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
      toast('Projet mis à jour avec succès')
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
      toast('Projet supprimé', 'error')
      onClose()
      onDeleted?.()
    } catch {
      setError('Erreur lors de la suppression.')
      setLoading(false)
    }
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
            <label className="form-label">Nom du projet *</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="form-input" autoFocus />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3}
              className="form-textarea" />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Statut</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className="form-input">
                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Catégorie</label>
              <input type="text" value={form.category} onChange={e => update('category', e.target.value)}
                placeholder="Ex : Informatique, RH..." className="form-input" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Date de début</label>
              <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className="form-input" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Date de fin prévue</label>
              <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">Couleur</label>
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
            className={confirmDelete ? 'btn btn-danger' : 'btn btn-secondary'}
            style={{ color: confirmDelete ? undefined : 'var(--color-danger-default)', borderColor: confirmDelete ? undefined : 'var(--color-danger-subtle)' }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
            {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={handleSave} disabled={loading} className="btn btn-primary">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
