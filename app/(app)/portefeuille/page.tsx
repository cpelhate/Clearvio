'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { useBreakpoint } from '@/lib/hooks/use-breakpoint'
import { StatusBadge } from '@/components/projets/status-badge'
import {
  FolderKanban, TrendingUp, AlertTriangle, Clock, BarChart3,
  Users, AlertCircle, Briefcase,
} from 'lucide-react'
import { InterProjectDepsSection } from '@/components/dependencies/inter-project-deps-section'
import type { ProjectStatus } from '@/types/project'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project'
import type { RiskLevel } from '@/types/risk'
import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, RISK_LEVEL_BG } from '@/types/risk'

interface ProjectMetric {
  id: string
  name: string
  status: ProjectStatus
  color: string
  category: string | null
  startDate: string | null
  endDate: string | null
  membersCount: number
  taskTotal: number
  taskDone: number
  taskProgress: number
  nextMilestone: { plannedDate: string } | null
  openRisksCount: number
  maxRiskLevel: RiskLevel | null
  isLate: boolean | null
}

interface PortfolioData {
  summary: {
    total: number
    byStatus: {
      INITIALISATION: number
      EN_COURS: number
      EN_ATTENTE: number
      CRITIQUE: number
      TERMINE: number
    }
    lateCount: number
    criticalRiskCount: number
    avgProgress: number
  }
  projects: ProjectMetric[]
}

function SkeletonRect({ width, height, style }: { width?: number | string; height?: number | string; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: width ?? '100%',
      height: height ?? 16,
      borderRadius: 'var(--radius-sm)',
      background: 'var(--color-bg-tertiary)',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  )
}

function KpiCardSkeleton() {
  return (
    <div style={{
      background: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonRect width={100} height={13} />
          <SkeletonRect width={60} height={32} />
        </div>
        <SkeletonRect width={40} height={40} style={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
      </div>
    </div>
  )
}

const STATUS_ORDER: Array<keyof PortfolioData['summary']['byStatus']> = [
  'INITIALISATION', 'EN_COURS', 'EN_ATTENTE', 'CRITIQUE', 'TERMINE',
]

export default function PortefeuillePage() {
  const router = useRouter()
  const bp = useBreakpoint()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portfolio')
      .then(res => res.json())
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const kpis = [
    {
      label: 'Total projets',
      value: data?.summary.total ?? 0,
      icon: <FolderKanban size={20} strokeWidth={1.5} />,
      iconColor: 'var(--color-accent-default)',
      iconBg: 'var(--color-accent-bg)',
    },
    {
      label: 'En cours',
      value: data?.summary.byStatus.EN_COURS ?? 0,
      icon: <TrendingUp size={20} strokeWidth={1.5} />,
      iconColor: 'var(--color-success-default)',
      iconBg: 'var(--color-success-bg)',
    },
    {
      label: 'Critiques',
      value: data?.summary.criticalRiskCount ?? 0,
      icon: <AlertTriangle size={20} strokeWidth={1.5} />,
      iconColor: 'var(--color-danger-default)',
      iconBg: 'var(--color-danger-bg)',
    },
    {
      label: 'En retard',
      value: data?.summary.lateCount ?? 0,
      icon: <Clock size={20} strokeWidth={1.5} />,
      iconColor: 'var(--color-warning-default)',
      iconBg: 'var(--color-warning-bg)',
    },
    {
      label: 'Avancement moyen',
      value: data ? `${data.summary.avgProgress}%` : '0%',
      icon: <BarChart3 size={20} strokeWidth={1.5} />,
      iconColor: 'var(--color-accent-default)',
      iconBg: 'var(--color-accent-bg)',
    },
  ]

  const totalByStatus = data
    ? STATUS_ORDER.reduce((s, k) => s + data.summary.byStatus[k], 0)
    : 0

  const kpiCols = bp === 'mobile' ? 'repeat(2, 1fr)' : bp === 'tablet' ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)'
  const pagePadding = bp === 'mobile' ? '16px' : 'var(--space-10)'

  return (
    <>
      <Header title="Portefeuille" />
      <div style={{ padding: pagePadding }}>

        {/* Section 1 — Bannière KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: kpiCols, gap: 16, marginBottom: 24 }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)
            : kpis.map(kpi => (
              <div key={kpi.label} style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 24,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '0 0 8px 0' }}>
                      {kpi.label}
                    </p>
                    <p style={{ fontSize: 32, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                      {kpi.value}
                    </p>
                  </div>
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: kpi.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    color: kpi.iconColor,
                  }}>
                    {kpi.icon}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Section 2 — Répartition par statut */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 20px 0' }}>
            Répartition par statut
          </p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRect key={i} height={18} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STATUS_ORDER.map(statusKey => {
                const count = data?.summary.byStatus[statusKey] ?? 0
                const pct = totalByStatus > 0 ? (count / totalByStatus) * 100 : 0
                const color = PROJECT_STATUS_COLORS[statusKey as ProjectStatus]
                return (
                  <div key={statusKey} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 130, fontSize: 13, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                      {PROJECT_STATUS_LABELS[statusKey as ProjectStatus]}
                    </span>
                    <div style={{
                      flex: 1,
                      height: 8,
                      background: 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: color,
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{ width: 24, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', textAlign: 'right', flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Section 3 — Tableau des projets */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Projets
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRect key={i} height={20} />)}
            </div>
          ) : !data || data.projects.length === 0 ? (
            <div style={{
              padding: '64px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 56, height: 56,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-bg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Briefcase size={28} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
                  Aucun projet dans le portefeuille
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '0 0 16px 0' }}>
                  Créez votre premier projet pour commencer à suivre votre portefeuille.
                </p>
                <button
                  onClick={() => router.push('/projets')}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--color-accent-default)',
                    color: 'var(--color-text-on-accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Aller aux projets
                </button>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Projet', 'Statut', 'Avancement', 'Risques', 'Prochain jalon', 'Fin prévue', 'Membres', 'Alertes'].map(col => (
                      <th key={col} style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-tertiary)',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        whiteSpace: 'nowrap',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((project, idx) => {
                    const now = new Date()
                    const isEndPast = project.endDate && new Date(project.endDate) < now && project.status !== 'TERMINE'
                    return (
                      <tr
                        key={project.id}
                        onClick={() => router.push(`/projets/${project.id}`)}
                        style={{
                          cursor: 'pointer',
                          borderBottom: idx < data.projects.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Projet */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{
                              width: 4,
                              height: 36,
                              borderRadius: 2,
                              background: project.color,
                              flexShrink: 0,
                              marginTop: 2,
                            }} />
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 2px 0' }}>
                                {project.name}
                              </p>
                              {project.category && (
                                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
                                  {project.category}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Statut */}
                        <td style={{ padding: '14px 16px' }}>
                          <StatusBadge status={project.status} />
                        </td>

                        {/* Avancement */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                            <div style={{
                              flex: 1,
                              height: 6,
                              background: 'var(--color-bg-tertiary)',
                              borderRadius: 'var(--radius-full)',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${project.taskProgress}%`,
                                height: '100%',
                                background: 'var(--color-accent-default)',
                                borderRadius: 'var(--radius-full)',
                              }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0, width: 32, textAlign: 'right' }}>
                              {project.taskProgress}%
                            </span>
                          </div>
                        </td>

                        {/* Risques */}
                        <td style={{ padding: '14px 16px' }}>
                          {project.maxRiskLevel ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 11,
                              fontWeight: 500,
                              letterSpacing: '0.02em',
                              color: RISK_LEVEL_COLORS[project.maxRiskLevel],
                              background: RISK_LEVEL_BG[project.maxRiskLevel],
                              border: `1px solid ${RISK_LEVEL_COLORS[project.maxRiskLevel]}22`,
                              whiteSpace: 'nowrap',
                            }}>
                              {RISK_LEVEL_LABELS[project.maxRiskLevel]}
                            </span>
                          ) : (
                            <span style={{ fontSize: 13, color: 'var(--color-text-disabled)' }}>—</span>
                          )}
                        </td>

                        {/* Prochain jalon */}
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {project.nextMilestone ? formatDate(project.nextMilestone.plannedDate) : '—'}
                        </td>

                        {/* Fin prévue */}
                        <td style={{
                          padding: '14px 16px',
                          fontSize: 13,
                          color: isEndPast ? 'var(--color-danger-default)' : 'var(--color-text-secondary)',
                          whiteSpace: 'nowrap',
                          fontWeight: isEndPast ? 500 : 400,
                        }}>
                          {formatDate(project.endDate)}
                        </td>

                        {/* Membres */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                              {project.membersCount}
                            </span>
                          </div>
                        </td>

                        {/* Alertes */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {(project.maxRiskLevel === 'CRITIQUE' || project.maxRiskLevel === 'ELEVE') && (
                              <AlertCircle size={15} strokeWidth={1.5} style={{ color: 'var(--color-danger-default)', flexShrink: 0 }} />
                            )}
                            {project.isLate && (
                              <Clock size={15} strokeWidth={1.5} style={{ color: 'var(--color-warning-default)', flexShrink: 0 }} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 4 — Liens entre projets */}
        <div style={{ marginBottom: 24 }}>
          <InterProjectDepsSection defaultCollapsed={false} />
        </div>

        {/* Section 5 — Alertes actives */}
        {!loading && data && (data.summary.lateCount > 0 || data.summary.criticalRiskCount > 0) && (
          <div style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                Points d&apos;attention
              </p>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.summary.lateCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Clock size={16} strokeWidth={1.5} style={{ color: 'var(--color-warning-default)', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
                    <span style={{ fontWeight: 500, color: 'var(--color-warning-default)' }}>
                      {data.summary.lateCount} projet{data.summary.lateCount > 1 ? 's' : ''} en retard
                    </span>
                    {' : '}
                    {data.projects
                      .filter(p => p.isLate)
                      .map(p => `"${p.name}"`)
                      .join(', ')}
                  </p>
                </div>
              )}
              {data.summary.criticalRiskCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <AlertCircle size={16} strokeWidth={1.5} style={{ color: 'var(--color-danger-default)', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
                    <span style={{ fontWeight: 500, color: 'var(--color-danger-default)' }}>
                      {data.summary.criticalRiskCount} projet{data.summary.criticalRiskCount > 1 ? 's' : ''} avec risques critiques ou élevés
                    </span>
                    {' : '}
                    {data.projects
                      .filter(p => p.maxRiskLevel === 'CRITIQUE' || p.maxRiskLevel === 'ELEVE')
                      .map(p => `"${p.name}"`)
                      .join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
