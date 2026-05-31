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

  const inputStyle = {
    width: '100%', height: 36, padding: '0 12px',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)', fontSize: 14,
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)', outline: 'none',
    fontFamily: 'var(--font-primary)',
  }

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 500,
    color: 'var(--color-text-secondary)', marginBottom: 6,
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
              <label style={labelStyle}>Nom du projet *</label>
              <input
                type="text" value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="Ex : Refonte site web" style={inputStyle} autoFocus
              />
            </div>
            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description} onChange={e => update('description', e.target.value)}
                placeholder="Décrivez les objectifs du projet..."
                rows={3}
                style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
              />
            </div>
            {/* Statut */}
            <div>
              <label style={labelStyle}>Statut initial</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} style={inputStyle}>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {/* Couleur */}
            <div>
              <label style={labelStyle}>Couleur du projet</label>
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
                <label style={labelStyle}>Date de début</label>
                <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Date de fin prévue</label>
                <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={inputStyle} />
              </div>
            </div>
            {/* Catégorie */}
            <div>
              <label style={labelStyle}>Catégorie</label>
              <input
                type="text" value={form.category} onChange={e => update('category', e.target.value)}
                placeholder="Ex : Informatique, Marketing, RH..." style={inputStyle}
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
            <button onClick={() => setStep(1)} style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px',
              background: 'transparent', border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)', fontSize: 14, cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}>
              <ChevronLeft size={16} strokeWidth={1.5} /> Retour
            </button>
          ) : <div />}

          {step === 1 ? (
            <button
              onClick={() => { if (!form.name.trim()) { setError('Le nom est requis.'); return } setError(null); setStep(2) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px',
                background: 'var(--color-accent-default)', border: 'none',
                borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', color: '#fff',
              }}
            >
              Continuer <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          ) : (
            <button
              onClick={handleSubmit} disabled={loading}
              style={{
                height: 36, padding: '0 20px',
                background: loading ? 'var(--color-accent-subtle)' : 'var(--color-accent-default)',
                border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer', color: '#fff',
              }}
            >
              {loading ? 'Création...' : 'Créer le projet'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
