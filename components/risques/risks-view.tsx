'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ShieldAlert, Pencil, Trash2, X, Grid3x3, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import {
  ProjectRisk,
  RiskProbability,
  RiskImpact,
  RiskStatus,
  RiskLevel,
  RISK_PROBABILITY_LABELS,
  RISK_IMPACT_LABELS,
  RISK_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_BG,
  getRiskLevel,
} from '@/types/risk'

const PROBABILITY_OPTIONS: RiskProbability[] = ['FAIBLE', 'MOYEN', 'ELEVE']
const IMPACT_OPTIONS: RiskImpact[] = ['FAIBLE', 'MOYEN', 'ELEVE']
const STATUS_OPTIONS: RiskStatus[] = ['OUVERT', 'EN_COURS', 'RESOLU', 'ACCEPTE']

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  background: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  fontFamily: 'var(--font-primary)',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 72,
  padding: '8px 12px',
  resize: 'vertical',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

interface RiskLevelBadgeProps {
  probability: RiskProbability
  impact: RiskImpact
}

function RiskLevelBadge({ probability, impact }: RiskLevelBadgeProps) {
  const level = getRiskLevel(probability, impact)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: 12, fontWeight: 500,
      color: RISK_LEVEL_COLORS[level],
      background: RISK_LEVEL_BG[level],
    }}>
      {RISK_LEVEL_LABELS[level]}
    </span>
  )
}

function EnumBadge({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: 12, fontWeight: 500,
      color: 'var(--color-text-secondary)',
      background: 'var(--color-bg-tertiary)',
    }}>
      {label}
    </span>
  )
}

// Matrice 3x3 probabilité × impact
const MATRIX_LEVELS: RiskLevel[][] = [
  // impact: FAIBLE, MOYEN, ELEVE (colonnes)
  ['FAIBLE', 'MOYEN', 'ELEVE'],   // proba FAIBLE
  ['MOYEN',  'ELEVE', 'ELEVE'],   // proba MOYEN
  ['ELEVE',  'ELEVE', 'CRITIQUE'],// proba ELEVE
]

function RiskMatrix() {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Matrice de criticité (Probabilité × Impact)</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 4, maxWidth: 340 }}>
        {/* Header row */}
        <div />
        {(['FAIBLE', 'MOYEN', 'ELEVE'] as RiskImpact[]).map(imp => (
          <div key={imp} style={{ textAlign: 'center', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', paddingBottom: 4 }}>
            {RISK_IMPACT_LABELS[imp]}
          </div>
        ))}
        {/* Data rows — probability rows reversed so ELEVE is on top */}
        {(['ELEVE', 'MOYEN', 'FAIBLE'] as RiskProbability[]).map((prob, ri) => {
          const rowIdx = 2 - ri // ELEVE=2, MOYEN=1, FAIBLE=0
          return [
            <div key={`label-${prob}`} style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', paddingRight: 8 }}>
              {RISK_PROBABILITY_LABELS[prob]}
            </div>,
            ...(['FAIBLE', 'MOYEN', 'ELEVE'] as RiskImpact[]).map((_, ci) => {
              const level = MATRIX_LEVELS[rowIdx][ci]
              return (
                <div key={`${prob}-${ci}`} style={{
                  height: 32, borderRadius: 'var(--radius-sm)',
                  background: RISK_LEVEL_BG[level],
                  border: `1px solid ${RISK_LEVEL_COLORS[level]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500,
                  color: RISK_LEVEL_COLORS[level],
                }}>
                  {RISK_LEVEL_LABELS[level]}
                </div>
              )
            })
          ]
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Lignes : Probabilité · Colonnes : Impact</span>
      </div>
    </div>
  )
}

interface EditModalProps {
  risk: ProjectRisk
  projectId: string
  onClose: () => void
  onSaved: () => void
}

function EditModal({ risk, projectId, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    title: risk.title,
    description: risk.description || '',
    probability: risk.probability,
    impact: risk.impact,
    status: risk.status,
    mitigation: risk.mitigation || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await fetch(`/api/projects/${projectId}/risks/${risk.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        probability: form.probability,
        impact: form.impact,
        status: form.status,
        mitigation: form.mitigation.trim() || null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-default)',
        padding: 24,
        width: 480,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Modifier le risque</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Titre *</label>
            <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Probabilité</label>
              <select style={selectStyle} value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value as RiskProbability }))}>
                {PROBABILITY_OPTIONS.map(p => <option key={p} value={p}>{RISK_PROBABILITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Impact</label>
              <select style={selectStyle} value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value as RiskImpact }))}>
                {IMPACT_OPTIONS.map(p => <option key={p} value={p}>{RISK_IMPACT_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Statut</label>
            <select style={selectStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RiskStatus }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{RISK_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Description</label>
            <textarea style={textareaStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du risque..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Plan de mitigation</label>
            <textarea style={textareaStyle} value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} placeholder="Actions pour réduire ou éliminer le risque..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ height: 36, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{ height: 36, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff', opacity: saving || !form.title.trim() ? 0.6 : 1 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AiSuggestedRisk {
  title: string
  description: string
  probability: RiskProbability
  impact: RiskImpact
  mitigation: string
}

interface AiRisksPanelProps {
  projectId: string
  onImported: () => void
}

function AiRisksPanel({ projectId, onImported }: AiRisksPanelProps) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AiSuggestedRisk[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const { toast } = useToast()

  const generate = async () => {
    setLoading(true)
    setSuggestions([])
    setSelected(new Set())
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-risks`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur IA', 'error'); return }
      setSuggestions(data.risks ?? [])
      setSelected(new Set((data.risks ?? []).map((_: AiSuggestedRisk, i: number) => i)))
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const toggleExpand = (i: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const importSelected = async () => {
    if (selected.size === 0) return
    setImporting(true)
    try {
      const toImport = suggestions.filter((_, i) => selected.has(i))
      await Promise.all(toImport.map(r =>
        fetch(`/api/projects/${projectId}/risks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: r.title, description: r.description, probability: r.probability, impact: r.impact, mitigation: r.mitigation }),
        })
      ))
      toast(`${toImport.length} risque${toImport.length > 1 ? 's' : ''} ajouté${toImport.length > 1 ? 's' : ''}`, 'success')
      setSuggestions([])
      setSelected(new Set())
      onImported()
    } catch {
      toast('Erreur lors de l\'import', 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 20, background: 'var(--color-bg-secondary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: suggestions.length > 0 ? 16 : 0 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Analyse IA des risques</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>L'IA identifie les risques potentiels à partir du contexte projet</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', opacity: loading ? 0.6 : 1, flexShrink: 0 }}
        >
          <Sparkles size={13} strokeWidth={1.5} />
          {loading ? 'Analyse…' : suggestions.length > 0 ? 'Relancer' : 'Analyser'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((risk, i) => {
              const level = getRiskLevel(risk.probability, risk.impact)
              const isExpanded = expanded.has(i)
              return (
                <div
                  key={i}
                  style={{
                    background: 'var(--color-bg-primary)', border: `1px solid ${selected.has(i) ? 'var(--color-accent-default)' : 'var(--color-border-subtle)'}`,
                    borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }} onClick={() => toggleSelect(i)}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${selected.has(i) ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
                      background: selected.has(i) ? 'var(--color-accent-default)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {selected.has(i) && <Check size={11} strokeWidth={2.5} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{risk.title}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: RISK_LEVEL_BG[level], color: RISK_LEVEL_COLORS[level], fontWeight: 500 }}>{RISK_LEVEL_LABELS[level]}</span>
                      <button
                        onClick={e => { e.stopPropagation(); toggleExpand(i) }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
                      >
                        {isExpanded ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 12px 12px 40px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {risk.description && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{risk.description}</p>}
                      {risk.mitigation && (
                        <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Mitigation</p>
                          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{risk.mitigation}</p>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Probabilité : <strong>{RISK_PROBABILITY_LABELS[risk.probability]}</strong></span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Impact : <strong>{RISK_IMPACT_LABELS[risk.impact]}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', alignSelf: 'center', flex: 1 }}>{selected.size} / {suggestions.length} sélectionné{selected.size > 1 ? 's' : ''}</p>
            <button
              onClick={() => setSelected(selected.size === suggestions.length ? new Set() : new Set(suggestions.map((_, i) => i)))}
              style={{ height: 32, padding: '0 12px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            >
              {selected.size === suggestions.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </button>
            <button
              onClick={importSelected}
              disabled={importing || selected.size === 0}
              style={{ height: 32, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500, cursor: importing || selected.size === 0 ? 'not-allowed' : 'pointer', color: '#fff', opacity: importing || selected.size === 0 ? 0.6 : 1 }}
            >
              {importing ? 'Import…' : `Importer (${selected.size})`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface RisksViewProps {
  projectId: string
}

export function RisksView({ projectId }: RisksViewProps) {
  const { toast } = useToast()
  const [risks, setRisks] = useState<ProjectRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMatrix, setShowMatrix] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    probability: 'MOYEN' as RiskProbability,
    impact: 'MOYEN' as RiskImpact,
    mitigation: '',
  })
  const [saving, setSaving] = useState(false)
  const [editingRisk, setEditingRisk] = useState<ProjectRisk | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/risks`)
    if (res.ok) setRisks(await res.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        probability: form.probability,
        impact: form.impact,
        mitigation: form.mitigation.trim() || null,
      }),
    })
    if (res.ok) {
      await load()
      setShowForm(false)
      setForm({ title: '', description: '', probability: 'MOYEN', impact: 'MOYEN', mitigation: '' })
      toast('Risque ajouté avec succès')
    }
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: RiskStatus) => {
    await fetch(`/api/projects/${projectId}/risks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await fetch(`/api/projects/${projectId}/risks/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await load()
    toast('Risque supprimé', 'error')
  }

  const openCount = risks.filter(r => r.status === 'OUVERT' || r.status === 'EN_COURS').length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
      Chargement…
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>Registre des risques</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Identification et suivi des risques projet
            {risks.length > 0 && ` · ${risks.length} risque${risks.length > 1 ? 's' : ''} (${openCount} ouvert${openCount > 1 ? 's' : ''})`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowMatrix(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <Grid3x3 size={14} strokeWidth={1.5} />
            {showMatrix ? 'Masquer matrice' : 'Matrice'}
          </button>
          <button onClick={() => setShowAiPanel(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: showAiPanel ? 'var(--color-accent-subtle)' : 'none', border: `1px solid ${showAiPanel ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`, borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: showAiPanel ? 'var(--color-accent-default)' : 'var(--color-text-secondary)' }}>
            <Sparkles size={14} strokeWidth={1.5} /> IA
          </button>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff' }}>
            <Plus size={14} strokeWidth={1.5} /> Nouveau risque
          </button>
        </div>
      </div>

      {/* Matrice de criticité */}
      {showMatrix && <RiskMatrix />}

      {/* Panneau IA */}
      {showAiPanel && (
        <AiRisksPanel projectId={projectId} onImported={load} />
      )}

      {/* Formulaire de création */}
      {showForm && (
        <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20, background: 'var(--color-bg-secondary)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>Nouveau risque</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Titre *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nom du risque identifié…" autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Probabilité</label>
                <select style={selectStyle} value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value as RiskProbability }))}>
                  {PROBABILITY_OPTIONS.map(p => <option key={p} value={p}>{RISK_PROBABILITY_LABELS[p]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Impact</label>
                <select style={selectStyle} value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value as RiskImpact }))}>
                  {IMPACT_OPTIONS.map(p => <option key={p} value={p}>{RISK_IMPACT_LABELS[p]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Description</label>
              <textarea style={textareaStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du risque…" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Plan de mitigation</label>
              <textarea style={textareaStyle} value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} placeholder="Actions pour réduire ou éliminer le risque…" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleCreate} disabled={saving || !form.title.trim()} style={{ height: 36, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff', opacity: saving || !form.title.trim() ? 0.6 : 1 }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => { setShowForm(false); setForm({ title: '', description: '', probability: 'MOYEN', impact: 'MOYEN', mitigation: '' }) }} style={{ height: 36, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* État vide */}
      {risks.length === 0 && !showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
          <ShieldAlert size={40} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', marginBottom: 16 }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>Aucun risque identifié</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>Documentez les risques potentiels et leur plan de mitigation</p>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff' }}>
            <Plus size={14} strokeWidth={1.5} /> Identifier un risque
          </button>
        </div>
      )}

      {/* Tableau des risques */}
      {risks.length > 0 && (
        <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-default)' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Risque</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Probabilité</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Impact</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Niveau</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Statut</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk, idx) => (
                <tr key={risk.id} style={{ borderBottom: idx < risks.length - 1 ? '1px solid var(--color-border-subtle)' : 'none', background: 'var(--color-bg-primary)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: risk.description ? 2 : 0 }}>{risk.title}</div>
                    {risk.description && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{risk.description}</div>}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <EnumBadge label={RISK_PROBABILITY_LABELS[risk.probability]} />
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <EnumBadge label={RISK_IMPACT_LABELS[risk.impact]} />
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <RiskLevelBadge probability={risk.probability} impact={risk.impact} />
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <select
                      value={risk.status}
                      onChange={e => handleStatusChange(risk.id, e.target.value as RiskStatus)}
                      style={{ ...selectStyle, width: 'auto', height: 30, fontSize: 12, padding: '0 8px' }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{RISK_STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => setEditingRisk(risk)}
                        title="Modifier"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                      >
                        <Pencil size={13} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDelete(risk.id)}
                        title={confirmDelete === risk.id ? 'Cliquer pour confirmer' : 'Supprimer'}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: confirmDelete === risk.id ? 'var(--color-danger-bg)' : 'none', border: `1px solid ${confirmDelete === risk.id ? 'var(--color-danger-default)' : 'var(--color-border-default)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', color: confirmDelete === risk.id ? 'var(--color-danger-default)' : 'var(--color-text-secondary)' }}
                        onBlur={() => setConfirmDelete(null)}
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal d'édition */}
      {editingRisk && (
        <EditModal
          risk={editingRisk}
          projectId={projectId}
          onClose={() => setEditingRisk(null)}
          onSaved={async () => { setEditingRisk(null); await load() }}
        />
      )}
    </div>
  )
}
