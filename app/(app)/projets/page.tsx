'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderKanban, Plus, Search, Calendar, Users, MoreHorizontal,
  LayoutGrid, List, Layers, AlertTriangle, Clock, TrendingUp,
  ShieldAlert, Milestone,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { CreateProjectModal } from '@/components/projets/create-project-modal'
import { EditProjectModal } from '@/components/projets/edit-project-modal'
import { StatusBadge } from '@/components/projets/status-badge'
import { useBreakpoint } from '@/lib/hooks/use-breakpoint'

type ProjectStatus = 'INITIALISATION' | 'EN_COURS' | 'EN_ATTENTE' | 'CRITIQUE' | 'TERMINE' | 'ARCHIVE'
type Health = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL'

interface ProjectStats {
  total: number; termine: number; enCours: number; bloque: number; enRetard: number
}

interface Project {
  id: string
  name: string
  description?: string | null
  status: ProjectStatus
  color: string
  endDate?: string | null
  category?: string | null
  managerId: string
  members: { userId: string; role: string }[]
  taskStats: ProjectStats
  progressPct: number
  risquesOuverts: number
  jalonsProchains: number
  health: Health
}

type ViewMode = 'cards' | 'list' | 'status'
type StatusFilter = 'ALL' | ProjectStatus

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'Tous',
  EN_COURS: 'En cours',
  CRITIQUE: 'Critique',
  EN_ATTENTE: 'En attente',
  TERMINE: 'Terminé',
  INITIALISATION: 'Initialisation',
  ARCHIVE: 'Archivé',
}

const HEALTH_CONFIG = {
  ON_TRACK: { label: 'En bonne voie', color: 'var(--color-success-default)', bg: 'var(--color-success-bg)', icon: '✓' },
  AT_RISK: { label: 'À surveiller', color: 'var(--color-warning-default)', bg: 'var(--color-warning-bg)', icon: '⚠' },
  CRITICAL: { label: 'Critique', color: 'var(--color-danger-default)', bg: 'var(--color-danger-bg)', icon: '●' },
}

const HEALTH_GROUP_ORDER: Health[] = ['CRITICAL', 'AT_RISK', 'ON_TRACK']

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(d: string | null | undefined, status: ProjectStatus): boolean {
  if (!d || status === 'TERMINE') return false
  return new Date(d) < new Date()
}

// ── Sub-components ──────────────────────────────────────────────

function HealthBadge({ health }: { health: Health }) {
  const c = HEALTH_CONFIG[health]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 600,
      color: c.color, background: c.bg,
    }}>
      {c.icon} {c.label}
    </span>
  )
}

function ProgressBar({ pct, health }: { pct: number; health: Health }) {
  const fill = health === 'CRITICAL' ? 'var(--color-danger-default)'
    : health === 'AT_RISK' ? 'var(--color-warning-default)'
    : 'var(--color-accent-default)'
  return (
    <div style={{ height: 5, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: fill, borderRadius: 'var(--radius-full)', transition: 'width 500ms' }} />
    </div>
  )
}

function MemberAvatars({ count }: { count: number }) {
  const shown = Math.min(count, 3)
  const avatarColors = [
    'var(--color-avatar-1)', 'var(--color-avatar-2)',
    'var(--color-avatar-3)', 'var(--color-avatar-4)', 'var(--color-avatar-5)',
  ]
  return (
    <div style={{ display: 'flex' }}>
      {Array.from({ length: shown }, (_, i) => (
        <div key={i} style={{
          width: 22, height: 22, borderRadius: '50%',
          background: avatarColors[i % avatarColors.length], color: 'var(--color-accent-text)',
          fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--color-bg-secondary)',
          marginLeft: i === 0 ? 0 : -6,
        }}>
          {String.fromCharCode(65 + i)}
        </div>
      ))}
      {count > 3 && (
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)',
          fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--color-bg-secondary)', marginLeft: -6,
        }}>
          +{count - 3}
        </div>
      )}
    </div>
  )
}

// ── KPI Row ─────────────────────────────────────────────────────

function KpiRow({ projects }: { projects: Project[] }) {
  const active = projects.filter(p => p.status !== 'TERMINE' && p.status !== 'ARCHIVE')
  const critical = active.filter(p => p.health === 'CRITICAL').length
  const totalRetard = active.reduce((s, p) => s + p.taskStats.enRetard, 0)
  const totalBloque = active.reduce((s, p) => s + p.taskStats.bloque, 0)
  const avgProgress = active.length > 0
    ? Math.round(active.reduce((s, p) => s + p.progressPct, 0) / active.length)
    : 0
  const jalons = active.reduce((s, p) => s + p.jalonsProchains, 0)
  const members = new Set(projects.flatMap(p => p.members.map(m => m.userId))).size

  const kpis = [
    { label: 'Projets actifs', value: active.length, sub: critical > 0 ? `${critical} critique${critical > 1 ? 's' : ''}` : 'Aucun critique', subColor: critical > 0 ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)' },
    { label: 'Tâches en retard', value: totalRetard, sub: `sur ${active.length} projet${active.length > 1 ? 's' : ''}`, valueColor: totalRetard > 0 ? 'var(--color-danger-default)' : undefined },
    { label: 'Tâches bloquées', value: totalBloque, sub: totalBloque > 0 ? 'À débloquer' : 'Aucun blocage', valueColor: totalBloque > 0 ? 'var(--color-warning-default)' : undefined },
    { label: 'Progression moy.', value: `${avgProgress}%`, sub: 'Tous projets actifs' },
    { label: 'Jalons à venir', value: jalons, sub: 'Dans les 30 jours' },
    { label: 'Membres actifs', value: members, sub: 'Dans l\'organisation' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
      {kpis.map(k => (
        <div key={k.label} style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: '12px 14px',
        }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
            {k.label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: (k as { valueColor?: string }).valueColor ?? 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {k.value}
          </div>
          <div style={{ fontSize: 11, color: (k as { subColor?: string }).subColor ?? 'var(--color-text-tertiary)', marginTop: 5 }}>
            {k.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Card view ───────────────────────────────────────────────────

function ProjectCard({ project, onEdit, onNavigate }: { project: Project; onEdit: () => void; onNavigate: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const overdue = isOverdue(project.endDate, project.status)

  return (
    <div
      onClick={onNavigate}
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'box-shadow 150ms, border-color 150ms',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-default)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-subtle)'
      }}
    >
      {/* Color stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: project.color }} />

      {/* Header */}
      <div style={{ padding: '14px 14px 0 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, letterSpacing: '-.01em' }}>
            {project.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            <StatusBadge status={project.status} />
            {project.category && (
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{project.category}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <HealthBadge health={project.health} />
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', borderRadius: 'var(--radius-sm)' }}
            >
              <MoreHorizontal size={13} strokeWidth={1.5} />
            </button>
            {menuOpen && (
              <>
                <div onClick={e => { e.stopPropagation(); setMenuOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div style={{ position: 'absolute', right: 0, top: 28, zIndex: 50, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 140, overflow: 'hidden' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit() }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-secondary)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                  >
                    Modifier
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: '12px 14px 0 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <ProgressBar pct={project.progressPct} health={project.health} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>
            {project.progressPct}%
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {project.taskStats.enRetard > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-danger-default)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger-default)', display: 'inline-block' }} />
              {project.taskStats.enRetard} en retard
            </div>
          )}
          {project.taskStats.bloque > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-warning-default)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning-default)', display: 'inline-block' }} />
              {project.taskStats.bloque} bloquée{project.taskStats.bloque > 1 ? 's' : ''}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-success-default)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success-default)', display: 'inline-block' }} />
            {project.taskStats.termine} terminée{project.taskStats.termine > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Extra metrics */}
      {(project.risquesOuverts > 0 || project.jalonsProchains > 0) && (
        <div style={{ padding: '10px 14px 0 18px', display: 'flex', gap: 12 }}>
          {project.risquesOuverts > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <ShieldAlert size={11} strokeWidth={1.5} />
              {project.risquesOuverts} risque{project.risquesOuverts > 1 ? 's' : ''}
            </div>
          )}
          {project.jalonsProchains > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <Milestone size={11} strokeWidth={1.5} />
              {project.jalonsProchains} jalon{project.jalonsProchains > 1 ? 's' : ''} à venir
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: '10px 14px 12px 18px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <MemberAvatars count={project.members.length} />
        <div style={{ textAlign: 'right' }}>
          {project.endDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: overdue ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)', justifyContent: 'flex-end' }}>
              <Calendar size={11} strokeWidth={1.5} />
              {overdue ? '⚠ ' : ''}{formatDate(project.endDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── List view ───────────────────────────────────────────────────

function ListView({ projects, onEdit, onNavigate }: { projects: Project[]; onEdit: (p: Project) => void; onNavigate: (p: Project) => void }) {
  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Head */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 110px 90px 140px 100px 80px 80px', gap: 0, padding: '9px 16px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
        {['Projet', 'Statut', 'Santé', 'Progression', 'Échéance', 'Membres', 'Risques'].map(h => (
          <span key={h} style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{h}</span>
        ))}
      </div>
      {projects.map((p, i) => {
        const overdue = isOverdue(p.endDate, p.status)
        return (
          <div
            key={p.id}
            onClick={() => onNavigate(p)}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 110px 90px 140px 100px 80px 80px',
              gap: 0, padding: '11px 16px',
              borderBottom: i < projects.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              alignItems: 'center', cursor: 'pointer',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-tertiary)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
            </div>
            <div><StatusBadge status={p.status} /></div>
            <div><HealthBadge health={p.health} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>{p.progressPct}%</span>
              <div style={{ flex: 1 }}><ProgressBar pct={p.progressPct} health={p.health} /></div>
            </div>
            <div style={{ fontSize: 12, color: overdue ? 'var(--color-danger-default)' : 'var(--color-text-secondary)' }}>
              {overdue ? '⚠ ' : ''}{formatDate(p.endDate)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <Users size={11} strokeWidth={1.5} /> {p.members.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: p.risquesOuverts > 0 ? 'var(--color-warning-default)' : 'var(--color-text-tertiary)' }}>
              {p.risquesOuverts > 0 && <ShieldAlert size={11} strokeWidth={1.5} />}
              {p.risquesOuverts > 0 ? p.risquesOuverts : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Status group view ───────────────────────────────────────────

function StatusView({ projects, onEdit, onNavigate }: { projects: Project[]; onEdit: (p: Project) => void; onNavigate: (p: Project) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<Health, Project[]>()
    for (const h of HEALTH_GROUP_ORDER) map.set(h, [])
    for (const p of projects) map.get(p.health)!.push(p)
    return map
  }, [projects])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {HEALTH_GROUP_ORDER.map(health => {
        const group = grouped.get(health) ?? []
        if (group.length === 0) return null
        const c = HEALTH_CONFIG[health]
        const totalRetard = group.reduce((s, p) => s + p.taskStats.enRetard, 0)
        const totalBloque = group.reduce((s, p) => s + p.taskStats.bloque, 0)

        return (
          <div key={health}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: c.bg, color: c.color, fontSize: 12, fontWeight: 600 }}>
                {c.icon} {c.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {group.length} projet{group.length > 1 ? 's' : ''}
                {health !== 'ON_TRACK' && totalRetard > 0 ? ` · ${totalRetard} tâche${totalRetard > 1 ? 's' : ''} en retard` : ''}
                {health !== 'ON_TRACK' && totalBloque > 0 ? ` · ${totalBloque} bloquée${totalBloque > 1 ? 's' : ''}` : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {group.map(p => (
                <div
                  key={p.id}
                  onClick={() => onNavigate(p)}
                  style={{
                    background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-lg)', padding: '12px 14px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden',
                    transition: 'box-shadow 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
                >
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: p.color }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, paddingLeft: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{p.progressPct}%</span>
                  </div>
                  <div style={{ paddingLeft: 6 }}>
                    <ProgressBar pct={p.progressPct} health={p.health} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 6 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {p.taskStats.enRetard > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--color-danger-default)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} strokeWidth={1.5} />{p.taskStats.enRetard} retard
                        </span>
                      )}
                      {p.taskStats.bloque > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--color-warning-default)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <AlertTriangle size={10} strokeWidth={1.5} />{p.taskStats.bloque} bloquée{p.taskStats.bloque > 1 ? 's' : ''}
                        </span>
                      )}
                      {p.taskStats.enRetard === 0 && p.taskStats.bloque === 0 && (
                        <span style={{ fontSize: 11, color: 'var(--color-success-default)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <TrendingUp size={10} strokeWidth={1.5} />{p.taskStats.termine} terminées
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: isOverdue(p.endDate, p.status) ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)' }}>
                      {p.endDate ? formatDate(p.endDate) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────

export default function ProjetsPage() {
  const router = useRouter()
  const bp = useBreakpoint()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/projects')
    if (res.ok) setProjects(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = projects
    if (statusFilter !== 'ALL') list = list.filter(p => p.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
    }
    return list
  }, [projects, statusFilter, search])

  // Status filter options — only show statuses present in data
  const availableStatuses = useMemo(() => {
    const counts = new Map<ProjectStatus, number>()
    for (const p of projects) counts.set(p.status, (counts.get(p.status) ?? 0) + 1)
    return (['ALL', ...Array.from(counts.keys())] as StatusFilter[])
  }, [projects])

  const viewBtnStyle = (v: ViewMode): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
    border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    fontSize: 12, fontFamily: 'var(--font-primary)',
    background: viewMode === v ? 'var(--color-bg-elevated)' : 'none',
    color: viewMode === v ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
    fontWeight: viewMode === v ? 500 : 400,
    boxShadow: viewMode === v ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
    transition: 'all 120ms',
  })

  return (
    <>
      <Header title="Projets" />
      <div style={{ padding: bp === 'mobile' ? '16px' : 'var(--space-10)' }}>

        {/* Top toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: 200, maxWidth: 280 }}>
              <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                style={{ width: '100%', height: 34, padding: '0 12px 0 32px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-primary)' }}
              />
            </div>
            {/* View switcher */}
            <div style={{ display: 'flex', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-sm)', padding: 3, gap: 2 }}>
              <button style={viewBtnStyle('cards')} onClick={() => setViewMode('cards')}><LayoutGrid size={12} strokeWidth={1.5} /> Cartes</button>
              <button style={viewBtnStyle('list')} onClick={() => setViewMode('list')}><List size={12} strokeWidth={1.5} /> Liste</button>
              <button style={viewBtnStyle('status')} onClick={() => setViewMode('status')}><Layers size={12} strokeWidth={1.5} /> Par statut</button>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}
          >
            <Plus size={15} strokeWidth={1.5} /> Nouveau projet
          </button>
        </div>

        {/* KPI row */}
        {!loading && projects.length > 0 && <KpiRow projects={projects} />}

        {/* Status filters */}
        {!loading && projects.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {availableStatuses.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12,
                  border: statusFilter === s ? '1px solid var(--color-accent-default)' : '1px solid var(--color-border-default)',
                  background: statusFilter === s ? 'color-mix(in srgb, var(--color-accent-default) 10%, var(--color-bg-primary))' : 'var(--color-bg-primary)',
                  color: statusFilter === s ? 'var(--color-accent-default)' : 'var(--color-text-secondary)',
                  fontWeight: statusFilter === s ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'var(--font-primary)', transition: 'all 120ms',
                }}
              >
                {STATUS_FILTER_LABELS[s]}
                {s !== 'ALL' && <span style={{ marginLeft: 5, fontSize: 11, opacity: .7 }}>
                  {projects.filter(p => p.status === s).length}
                </span>}
                {s === 'ALL' && <span style={{ marginLeft: 5, fontSize: 11, opacity: .7 }}>{projects.length}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 14 }}>
            <FolderKanban size={48} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Aucun projet</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 300 }}>Créez votre premier projet pour commencer.</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
              <Plus size={15} strokeWidth={1.5} /> Créer un projet
            </button>
          </div>
        )}

        {/* Empty filter result */}
        {!loading && projects.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            Aucun projet ne correspond à votre filtre.
          </div>
        )}

        {/* Views */}
        {!loading && filtered.length > 0 && (
          <>
            {viewMode === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {filtered.map(p => (
                  <ProjectCard
                    key={p.id} project={p}
                    onEdit={() => setEditProject(p)}
                    onNavigate={() => router.push(`/projets/${p.id}`)}
                  />
                ))}
              </div>
            )}
            {viewMode === 'list' && (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 700 }}>
                  <ListView projects={filtered} onEdit={setEditProject} onNavigate={p => router.push(`/projets/${p.id}`)} />
                </div>
              </div>
            )}
            {viewMode === 'status' && (
              <StatusView projects={filtered} onEdit={setEditProject} onNavigate={p => router.push(`/projets/${p.id}`)} />
            )}
          </>
        )}
      </div>

      <CreateProjectModal open={showModal} onClose={() => { setShowModal(false); load() }} />
      {editProject && (
        <EditProjectModal
          project={editProject as unknown as Parameters<typeof EditProjectModal>[0]['project']}
          open={true}
          onClose={() => setEditProject(null)}
          onSaved={load}
          onDeleted={() => { setEditProject(null); load() }}
        />
      )}
    </>
  )
}
