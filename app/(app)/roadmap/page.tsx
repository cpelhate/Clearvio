'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/projets/status-badge'
import { ChevronLeft, ChevronRight, Diamond } from 'lucide-react'
import type { ProjectStatus } from '@/types/project'
import { PROJECT_STATUS_LABELS } from '@/types/project'
import type { MilestoneStatus } from '@/types/milestone'
import { MILESTONE_STATUS_COLORS } from '@/types/milestone'

interface RoadmapProject {
  id: string
  name: string
  color: string
  status: ProjectStatus
  category: string | null
  startDate: string | null
  endDate: string | null
}

interface RoadmapMilestone {
  id: string
  projectId: string
  title: string
  plannedDate: string
  status: MilestoneStatus
}

type ZoomLevel = 'month' | 'quarter' | 'year'

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  month: 'Mois',
  quarter: 'Trimestre',
  year: 'Année',
}

const ROW_HEIGHT = 52
const LABEL_WIDTH = 220
const HEADER_HEIGHT = 48

function getMonthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= last) {
    months.push(new Date(cur))
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

function getQuartersBetween(start: Date, end: Date): { label: string; start: Date; end: Date }[] {
  const quarters: { label: string; start: Date; end: Date }[] = []
  let y = start.getFullYear()
  let q = Math.floor(start.getMonth() / 3)
  const endY = end.getFullYear()
  const endQ = Math.floor(end.getMonth() / 3)
  while (y < endY || (y === endY && q <= endQ)) {
    const qStart = new Date(y, q * 3, 1)
    const qEnd = new Date(y, q * 3 + 3, 0)
    quarters.push({ label: `T${q + 1} ${y}`, start: qStart, end: qEnd })
    q++
    if (q > 3) { q = 0; y++ }
  }
  return quarters
}

function getYearsBetween(start: Date, end: Date): number[] {
  const years: number[] = []
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) years.push(y)
  return years
}

function dateToX(date: Date, timelineStart: Date, totalMs: number, totalWidth: number): number {
  return ((date.getTime() - timelineStart.getTime()) / totalMs) * totalWidth
}

export default function RoadmapPage() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<{ projects: RoadmapProject[]; milestones: RoadmapMilestone[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState<ZoomLevel>('quarter')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null)
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('')

  useEffect(() => {
    fetch('/api/roadmap')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const projects = (data?.projects ?? []).filter(p => !filterStatus || p.status === filterStatus)
  const milestones = data?.milestones ?? []

  // Timeline bounds
  const today = new Date()
  let timelineStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  let timelineEnd = new Date(today.getFullYear(), today.getMonth() + 12, 0)

  for (const p of projects) {
    if (p.startDate) {
      const d = new Date(p.startDate)
      if (d < timelineStart) timelineStart = new Date(d.getFullYear(), d.getMonth(), 1)
    }
    if (p.endDate) {
      const d = new Date(p.endDate)
      if (d > timelineEnd) timelineEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    }
  }
  for (const m of milestones) {
    const d = new Date(m.plannedDate)
    if (d < timelineStart) timelineStart = new Date(d.getFullYear(), d.getMonth(), 1)
    if (d > timelineEnd) timelineEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  }

  // Column width based on zoom
  const colWidths: Record<ZoomLevel, number> = { month: 100, quarter: 120, year: 160 }
  const colWidth = colWidths[zoom]

  const months = getMonthsBetween(timelineStart, timelineEnd)
  const quarters = getQuartersBetween(timelineStart, timelineEnd)
  const years = getYearsBetween(timelineStart, timelineEnd)

  const totalCols = zoom === 'month' ? months.length : zoom === 'quarter' ? quarters.length : years.length
  const totalWidth = totalCols * colWidth
  const totalMs = timelineEnd.getTime() - timelineStart.getTime()

  const todayX = dateToX(today, timelineStart, totalMs, totalWidth)

  const scrollToToday = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayX - 200)
    }
  }

  useEffect(() => {
    if (!loading) setTimeout(scrollToToday, 100)
  }, [loading, zoom])

  const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const statusOptions: ProjectStatus[] = ['INITIALISATION', 'EN_COURS', 'EN_ATTENTE', 'CRITIQUE', 'TERMINE']

  return (
    <>
      <Header title="Roadmap" />
      <div style={{ padding: 'var(--space-10)' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Zoom */}
            <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {(['month', 'quarter', 'year'] as ZoomLevel[]).map(z => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  style={{
                    height: 32, padding: '0 14px', fontSize: 13,
                    background: zoom === z ? 'var(--color-accent-default)' : 'transparent',
                    color: zoom === z ? '#fff' : 'var(--color-text-secondary)',
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-primary)',
                    fontWeight: zoom === z ? 500 : 400,
                    transition: 'all 150ms',
                  }}
                >
                  {ZOOM_LABELS[z]}
                </button>
              ))}
            </div>

            {/* Filter statut */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as ProjectStatus | '')}
              style={{
                height: 32, padding: '0 10px', fontSize: 13,
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer', outline: 'none',
                fontFamily: 'var(--font-primary)',
              }}
            >
              <option value="">Tous les statuts</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Scroll to today */}
          <button
            onClick={scrollToToday}
            style={{
              height: 32, padding: '0 14px', fontSize: 13,
              background: 'transparent',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            Aujourd&apos;hui
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <div style={{ width: 16, height: 6, borderRadius: 3, background: 'var(--color-accent-default)' }} />
            Durée du projet
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <Diamond size={12} strokeWidth={1.5} style={{ color: 'var(--color-text-secondary)' }} />
            Jalon
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <div style={{ width: 2, height: 14, background: 'var(--color-danger-default)', borderRadius: 1 }} />
            Aujourd&apos;hui
          </div>
        </div>

        {/* Timeline container */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              Chargement de la roadmap...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>Aucun projet à afficher</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                {filterStatus ? 'Essayez un autre filtre de statut.' : 'Créez des projets avec des dates de début et de fin pour les voir ici.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex' }}>
              {/* Left: project labels */}
              <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: '1px solid var(--color-border-subtle)', zIndex: 2, background: 'var(--color-bg-secondary)' }}>
                {/* Header spacer */}
                <div style={{ height: HEADER_HEIGHT, borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>Projet</span>
                </div>
                {/* Rows */}
                {projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/projets/${p.id}`)}
                    style={{
                      height: ROW_HEIGHT, display: 'flex', alignItems: 'center',
                      padding: '0 12px 0 16px', gap: 8,
                      borderBottom: '1px solid var(--color-border-subtle)',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 4, height: 24, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: scrollable timeline */}
              <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
                <div style={{ width: totalWidth, minWidth: '100%', position: 'relative' }}>

                  {/* Header */}
                  <div style={{ height: HEADER_HEIGHT, borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', position: 'sticky', top: 0, background: 'var(--color-bg-secondary)', zIndex: 3 }}>
                    {zoom === 'month' && months.map((m, i) => (
                      <div key={i} style={{ width: colWidth, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--color-border-subtle)', fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {MONTH_LABELS[m.getMonth()]} {m.getFullYear()}
                      </div>
                    ))}
                    {zoom === 'quarter' && quarters.map((q, i) => (
                      <div key={i} style={{ width: colWidth, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--color-border-subtle)', fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {q.label}
                      </div>
                    ))}
                    {zoom === 'year' && years.map((y, i) => (
                      <div key={i} style={{ width: colWidth, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--color-border-subtle)', fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {y}
                      </div>
                    ))}
                  </div>

                  {/* Grid + bars */}
                  <div style={{ position: 'relative' }}>
                    {/* Today line */}
                    {todayX >= 0 && todayX <= totalWidth && (
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: todayX, width: 2,
                        background: 'var(--color-danger-default)',
                        opacity: 0.7, zIndex: 2, pointerEvents: 'none',
                      }} />
                    )}

                    {/* Column separators */}
                    {zoom === 'month' && months.map((_, i) => (
                      <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * colWidth, width: 1, background: 'var(--color-border-subtle)', zIndex: 1 }} />
                    ))}
                    {zoom === 'quarter' && quarters.map((_, i) => (
                      <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * colWidth, width: 1, background: 'var(--color-border-subtle)', zIndex: 1 }} />
                    ))}
                    {zoom === 'year' && years.map((_, i) => (
                      <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * colWidth, width: 1, background: 'var(--color-border-subtle)', zIndex: 1 }} />
                    ))}

                    {/* Project rows */}
                    {projects.map(p => {
                      const pMilestones = milestones.filter(m => m.projectId === p.id)
                      const start = p.startDate ? new Date(p.startDate) : null
                      const end = p.endDate ? new Date(p.endDate) : null

                      let barLeft = 0
                      let barWidth = 0
                      if (start && end) {
                        barLeft = Math.max(0, dateToX(start, timelineStart, totalMs, totalWidth))
                        const barRight = Math.min(totalWidth, dateToX(end, timelineStart, totalMs, totalWidth))
                        barWidth = Math.max(4, barRight - barLeft)
                      }

                      return (
                        <div
                          key={p.id}
                          style={{ height: ROW_HEIGHT, position: 'relative', borderBottom: '1px solid var(--color-border-subtle)' }}
                        >
                          {/* Alternating row background */}
                          <div style={{ position: 'absolute', inset: 0, background: 'transparent' }} />

                          {/* Project bar */}
                          {start && end && barWidth > 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                left: barLeft,
                                width: barWidth,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: 20,
                                borderRadius: 4,
                                background: p.color,
                                opacity: 0.85,
                                cursor: 'pointer',
                                zIndex: 2,
                                transition: 'opacity 0.15s',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.opacity = '1'
                                const rect = e.currentTarget.getBoundingClientRect()
                                const containerRect = e.currentTarget.closest('[data-roadmap]')?.getBoundingClientRect()
                                setTooltip({
                                  x: rect.left - (containerRect?.left ?? 0) + barWidth / 2,
                                  y: rect.top - (containerRect?.top ?? 0),
                                  content: (
                                    <div>
                                      <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{p.name}</p>
                                      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                        {start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        {' → '}
                                        {end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </p>
                                      {p.category && <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{p.category}</p>}
                                    </div>
                                  ),
                                })
                              }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; setTooltip(null) }}
                              onClick={() => router.push(`/projets/${p.id}`)}
                            />
                          )}

                          {/* Milestones */}
                          {pMilestones.map(m => {
                            const mDate = new Date(m.plannedDate)
                            const mX = dateToX(mDate, timelineStart, totalMs, totalWidth)
                            if (mX < 0 || mX > totalWidth) return null
                            const color = MILESTONE_STATUS_COLORS[m.status]
                            return (
                              <div
                                key={m.id}
                                style={{
                                  position: 'absolute',
                                  left: mX,
                                  top: '50%',
                                  transform: 'translate(-50%, -50%) rotate(45deg)',
                                  width: 10,
                                  height: 10,
                                  background: color,
                                  border: `2px solid var(--color-bg-secondary)`,
                                  zIndex: 3,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }}
                                onMouseEnter={e => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  const containerRect = e.currentTarget.closest('[data-roadmap]')?.getBoundingClientRect()
                                  setTooltip({
                                    x: rect.left - (containerRect?.left ?? 0) + 5,
                                    y: rect.top - (containerRect?.top ?? 0),
                                    content: (
                                      <div>
                                        <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>◆ {m.title}</p>
                                        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                          {mDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                      </div>
                                    ),
                                  })
                                }}
                                onMouseLeave={() => setTooltip(null)}
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Tooltip */}
                {tooltip && (
                  <div
                    style={{
                      position: 'fixed',
                      pointerEvents: 'none',
                      zIndex: 50,
                      left: tooltip.x + LABEL_WIDTH + 16,
                      top: tooltip.y - 8,
                      transform: 'translate(-50%, -100%)',
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      minWidth: 180,
                      maxWidth: 280,
                    }}
                  >
                    {tooltip.content}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
