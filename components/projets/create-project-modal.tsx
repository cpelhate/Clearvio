'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { PROJECT_COLORS, ProjectStatus } from '@/types/project'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'INITIALISATION', label: 'En initialisation' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EN_ATTENTE', label: 'En attente' },
]

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'INITIALISATION' as ProjectStatus,
    startDate: '',
    endDate: '',
    category: '',
    color: PROJECT_COLORS[0],
  })

  if (!open) return null

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Le nom du projet est requis.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); setLoading(false); return }
      const project = await res.json()
      onClose()
      router.push(`/projets/${project.id}`)
      router.refresh()
    } catch {
      setError('Une erreur est survenue.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      />
      {/* Panel */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 560,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        padding: 32, margin: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Nouveau projet
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Étape {step} sur 2
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4 }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 9999,
              background: s <= step ? 'var(--color-accent-default)' : 'var(--color-border-default)',
              transition: 'background 300ms',
            }} />
          ))}
        </div>

        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Nom */}
            <div>
              <label className="form-label">Nom du projet *</label>
              <input
                type="text" value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="Ex : Refonte site web" className="form-input" autoFocus
              />
            </div>
            {/* Description */}
            <div>
              <label className="form-label">Description</label>
              <textarea
                value={form.description} onChange={e => update('description', e.target.value)}
                placeholder="Décrivez les objectifs du projet..."
                rows={3}
                className="form-textarea"
              />
            </div>
            {/* Statut */}
            <div>
              <label className="form-label">Statut initial</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className="form-input">
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {/* Couleur */}
            <div>
              <label className="form-label">Couleur du projet</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c} onClick={() => update('color', c)}
                    style={{
                      width: 28, height: 28, borderRadius: 'var(--radius-full)',
                      background: c, border: form.color === c ? '3px solid var(--color-text-primary)' : '3px solid transparent',
                      cursor: 'pointer', transition: 'border 150ms',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Dates */}
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
            {/* Catégorie */}
            <div>
              <label className="form-label">Catégorie</label>
              <input
                type="text" value={form.category} onChange={e => update('category', e.target.value)}
                placeholder="Ex : Informatique, Marketing, RH..." className="form-input"
              />
            </div>
            <div style={{
              padding: 16, background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Vous serez automatiquement ajouté comme chef de projet co-responsable.
                Vous pourrez inviter des membres une fois le projet créé.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: 'var(--color-danger-default)', marginTop: 16, padding: '8px 12px', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="btn btn-secondary">
              <ChevronLeft size={16} strokeWidth={1.5} /> Retour
            </button>
          ) : <div />}

          {step === 1 ? (
            <button
              onClick={() => { if (!form.name.trim()) { setError('Le nom est requis.'); return } setError(null); setStep(2) }}
              className="btn btn-primary"
            >
              Continuer <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          ) : (
            <button
              onClick={handleSubmit} disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Création...' : 'Créer le projet'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
