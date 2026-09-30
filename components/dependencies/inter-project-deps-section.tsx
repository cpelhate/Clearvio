'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Link } from 'lucide-react'

type ProjectLinkType = 'SUCCESSION' | 'BLOQUE' | 'LIE'

interface ProjectInfo {
  id: string
  name: string
  status: string
  color: string
}

interface ProjectDep {
  id: string
  sourceProjectId: string
  targetProjectId: string
  type: ProjectLinkType
  lagDays: number
  createdAt: string
  sourceProject: ProjectInfo
  targetProject: ProjectInfo
}

interface OrgProject {
  id: string
  name: string
  status: string
  color: string
}

const LINK_TYPE_CONFIG: Record<ProjectLinkType, { label: string; shortLabel: string; bg: string; color: string; border: string }> = {
  SUCCESSION: {
    label: 'Succession', shortLabel: 'Succession →',
    bg: 'var(--color-success-bg)', color: 'var(--color-success-default)',
    border: 'rgba(22,163,74,.2)',
  },
  BLOQUE: {
    label: 'Bloque', shortLabel: 'Bloque ✕',
    bg: 'var(--color-danger-bg)', color: 'var(--color-danger-default)',
    border: 'rgba(220,38,38,.2)',
  },
  LIE: {
    label: 'Lié', shortLabel: 'Lié ↔',
    bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)',
    border: 'var(--color-border-default)',
  },
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  INITIALISATION: { label: 'Init.',       bg: 'var(--color-bg-tertiary)',  color: 'var(--color-text-tertiary)' },
  EN_COURS:       { label: 'En cours',    bg: 'var(--color-accent-bg)',    color: 'var(--color-accent-default)' },
  EN_ATTENTE:     { label: 'En attente',  bg: 'var(--color-bg-tertiary)',  color: 'var(--color-text-tertiary)' },
  CRITIQUE:       { label: 'Critique',    bg: 'var(--color-danger-bg)',    color: 'var(--color-danger-default)' },
  TERMINE:        { label: 'Terminé',     bg: 'var(--color-success-bg)',   color: 'var(--color-success-default)' },
}

function StatusChip({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }
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

function LinkTypeBadge({ type }: { type: ProjectLinkType }) {
  const c = LINK_TYPE_CONFIG[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 500,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {c.label}
    </span>
  )
}

interface Props {
  /** When set, this is the project page context — highlights current project and shows alert */
  currentProjectId?: string
  /** When true, section starts collapsed */
  defaultCollapsed?: boolean
}

export function InterProjectDepsSection({ currentProjectId, defaultCollapsed = false }: Props) {
  const [deps, setDeps] = useState<ProjectDep[]>([])
  const [projects, setProjects] = useState<OrgProject[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(!defaultCollapsed)
  const [showAddForm, setShowAddForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Add form state
  const [addSource, setAddSource] = useState('')
  const [addTarget, setAddTarget] = useState('')
  const [addType, setAddType] = useState<ProjectLinkType>('SUCCESSION')
  const [addLag, setAddLag] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [depsRes, projRes] = await Promise.all([
      fetch('/api/project-dependencies'),
      fetch('/api/projects'),
    ])
    if (depsRes.ok) setDeps(await depsRes.json())
    if (projRes.ok) {
      const raw = await projRes.json()
      setProjects(raw.map((p: any) => ({ id: p.id, name: p.name, status: p.status, color: p.color ?? '#6366f1' })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Pre-fill source when in project page context
  useEffect(() => {
    if (currentProjectId && !addSource) setAddSource(currentProjectId)
  }, [currentProjectId, addSource])

  const handleAdd = async () => {
    if (!addSource || !addTarget) return
    setSaving(true)
    await fetch('/api/project-dependencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceProjectId: addSource, targetProjectId: addTarget, type: addType, lagDays: addLag }),
    })
    setSaving(false)
    setShowAddForm(false)
    setAddSource(currentProjectId ?? '')
    setAddTarget('')
    setAddType('SUCCESSION')
    setAddLag(0)
    await load()
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await fetch('/api/project-dependencies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setConfirmDelete(null)
    await load()
  }

  // Filter deps for current project context
  const displayDeps = currentProjectId
    ? deps.filter(d => d.sourceProjectId === currentProjectId || d.targetProjectId === currentProjectId)
    : deps

  // Alert: deps where current project blocks another project
  const blockerDeps = currentProjectId
    ? deps.filter(d => d.sourceProjectId === currentProjectId && d.type === 'BLOQUE')
    : []

  const inpStyle: import('react').CSSProperties = {
    height: 32, padding: '0 8px',
    border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)',
    background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
    fontSize: 12, outline: 'none', fontFamily: 'var(--font-primary)',
    width: '100%',
  }

  return (
    <div style={{
      background: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--color-border-subtle)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {currentProjectId ? 'Liens inter-projets' : 'Liens entre projets'}
          </span>
          {!loading && displayDeps.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '1px 7px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent-bg)', color: 'var(--color-accent-default)',
            }}>
              {displayDeps.length} lien{displayDeps.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowAddForm(true); setOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 30, padding: '0 12px',
              background: 'var(--color-accent-default)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-primary)',
            }}
          >
            <Plus size={12} strokeWidth={2} /> Ajouter
          </button>
          {open
            ? <ChevronDown size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            : <ChevronRight size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          }
        </div>
      </div>

      {open && (
        <div style={{ padding: '16px 18px' }}>
          {/* Alert banner (project page only) */}
          {blockerDeps.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 13px', marginBottom: 14,
              background: 'var(--color-warning-bg)',
              border: '1px solid rgba(217,119,6,.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, color: 'var(--color-warning-default)',
            }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <span>
                <strong>Ce projet bloque {blockerDeps.length} autre{blockerDeps.length > 1 ? 's' : ''} : </strong>
                {blockerDeps.map(d => d.targetProject.name).join(', ')}.
              </span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 44, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }} />)}
            </div>
          ) : displayDeps.length === 0 && !showAddForm ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              <p style={{ marginBottom: 8 }}>Aucun lien entre projets</p>
              <button onClick={() => setShowAddForm(true)} style={{ background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>
                Créer le premier lien
              </button>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 48px 1fr 88px 32px',
                padding: '7px 12px',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: displayDeps.length > 0 ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
                borderBottom: displayDeps.length > 0 ? '1px solid var(--color-border-subtle)' : undefined,
                fontSize: 11, fontWeight: 600, letterSpacing: '.05em',
                textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
              }}>
                <span>Projet source</span>
                <span>Type</span>
                <span style={{ textAlign: 'center' }}>Écart</span>
                <span>Projet cible</span>
                <span>Statut cible</span>
                <span />
              </div>

              {/* Rows */}
              {displayDeps.length > 0 && (
                <div style={{ border: '1px solid var(--color-border-subtle)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', overflow: 'hidden' }}>
                  {displayDeps.map((dep, i) => {
                    const isCurrent = (id: string) => id === currentProjectId
                    return (
                      <div key={dep.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px 48px 1fr 88px 32px',
                        alignItems: 'center', padding: '9px 12px',
                        borderBottom: i < displayDeps.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                        background: 'var(--color-bg-primary)',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-primary)')}
                      >
                        {/* Source */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dep.sourceProject.color, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: isCurrent(dep.sourceProjectId) ? 'var(--color-accent-default)' : 'var(--color-text-primary)',
                            }}>
                              {dep.sourceProject.name}
                            </div>
                            {isCurrent(dep.sourceProjectId) && (
                              <div style={{ fontSize: 10, color: 'var(--color-accent-default)', opacity: .7 }}>Ce projet</div>
                            )}
                          </div>
                        </div>

                        <LinkTypeBadge type={dep.type} />

                        <div style={{ textAlign: 'center', fontSize: 12, fontFamily: 'var(--font-mono)', color: dep.lagDays > 0 ? 'var(--color-warning-default)' : 'var(--color-text-tertiary)' }}>
                          {dep.lagDays > 0 ? `+${dep.lagDays} j` : '0 j'}
                        </div>

                        {/* Target */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dep.targetProject.color, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: isCurrent(dep.targetProjectId) ? 'var(--color-accent-default)' : 'var(--color-text-primary)',
                            }}>
                              {dep.targetProject.name}
                            </div>
                            {isCurrent(dep.targetProjectId) && (
                              <div style={{ fontSize: 10, color: 'var(--color-accent-default)', opacity: .7 }}>Ce projet</div>
                            )}
                          </div>
                        </div>

                        <StatusChip status={dep.targetProject.status} />

                        <button
                          onClick={() => handleDelete(dep.id)}
                          title={confirmDelete === dep.id ? 'Confirmer la suppression' : 'Supprimer'}
                          style={{
                            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            background: confirmDelete === dep.id ? 'var(--color-danger-bg)' : 'none',
                            color: confirmDelete === dep.id ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)',
                          }}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Inline add form */}
          {showAddForm && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 56px 1fr auto',
              gap: 8, alignItems: 'flex-end',
              padding: '12px 14px', marginTop: 10,
              background: 'var(--color-accent-bg)',
              border: '1px solid var(--color-accent-subtle)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Projet source</div>
                <select value={addSource} onChange={e => setAddSource(e.target.value)} style={inpStyle}>
                  <option value="">Choisir…</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.id === currentProjectId ? ' (ce projet)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Type de lien</div>
                <select value={addType} onChange={e => setAddType(e.target.value as ProjectLinkType)} style={inpStyle}>
                  <option value="SUCCESSION">Succession →</option>
                  <option value="BLOQUE">Bloque ✕</option>
                  <option value="LIE">Lié ↔</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Écart (j)</div>
                <input type="number" min={0} value={addLag} onChange={e => setAddLag(+e.target.value)} style={inpStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Projet cible</div>
                <select value={addTarget} onChange={e => setAddTarget(e.target.value)} style={inpStyle}>
                  <option value="">Choisir…</option>
                  {projects.filter(p => p.id !== addSource).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.id === currentProjectId ? ' (ce projet)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, paddingBottom: 1 }}>
                <button
                  onClick={handleAdd}
                  disabled={!addSource || !addTarget || saving}
                  style={{
                    height: 32, padding: '0 12px',
                    background: addSource && addTarget ? 'var(--color-accent-default)' : 'var(--color-text-disabled)',
                    color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                    fontSize: 12, fontWeight: 500,
                    cursor: addSource && addTarget ? 'pointer' : 'default',
                    fontFamily: 'var(--font-primary)',
                  }}
                >
                  {saving ? '…' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    height: 32, padding: '0 10px',
                    background: 'none', border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-md)', fontSize: 12, cursor: 'pointer',
                    color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)',
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {!showAddForm && displayDeps.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
              <strong>Succession</strong> = B démarre après A · <strong>Bloque</strong> = A empêche B de démarrer · <strong>Lié</strong> = relation informelle
            </p>
          )}
        </div>
      )}
    </div>
  )
}
