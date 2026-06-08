'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/projets/status-badge'
import { FolderKanban, CheckSquare, Diamond, Target } from 'lucide-react'
import type { ProjectStatus } from '@/types/project'

interface DashboardData {
  activeProjects: number
  tasksInProgress: number
  upcomingMilestones: number
  objectivesRate: number
  recentProjects: {
    id: string
    name: string
    status: ProjectStatus
    color: string
    endDate: string | null
    taskTotal: number
    taskDone: number
  }[]
  upcomingMilestonesList: {
    id: string
    title: string
    plannedDate: string
    projectName: string
    status: string
  }[]
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

export default function TableauDeBordPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(() => router.refresh())
  }, [router])

  useEffect(() => {
    fetch('/api/dashboard')
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
      label: 'Projets actifs',
      value: data?.activeProjects ?? 0,
      icon: <FolderKanban size={20} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />,
    },
    {
      label: 'Tâches en cours',
      value: data?.tasksInProgress ?? 0,
      icon: <CheckSquare size={20} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />,
    },
    {
      label: 'Jalons à venir',
      value: data?.upcomingMilestones ?? 0,
      icon: <Diamond size={20} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />,
    },
    {
      label: 'Objectifs atteints',
      value: data ? `${data.objectivesRate}%` : '0%',
      icon: <Target size={20} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />,
    },
  ]

  return (
    <>
      <Header title="Tableau de bord" />
      <div style={{ padding: 'var(--space-10)' }}>

        {/* Ligne 1 — KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
            : kpis.map((kpi) => (
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
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-accent-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {kpi.icon}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Ligne 2 — Projets récents */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Projets récents
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRect key={i} height={20} />
              ))}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nom', 'Statut', 'Avancement', 'Date de fin'].map(col => (
                    <th key={col} style={{
                      padding: '10px 24px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-tertiary)',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!data || data.recentProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px 24px', textAlign: 'center', fontSize: 14, color: 'var(--color-text-tertiary)' }}>
                      Aucun projet trouvé
                    </td>
                  </tr>
                ) : data.recentProjects.map((project, idx) => {
                  const progress = project.taskTotal > 0
                    ? Math.round((project.taskDone / project.taskTotal) * 100)
                    : 0
                  return (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/projets/${project.id}`)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: idx < data.recentProjects.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: project.color,
                            flexShrink: 0,
                          }} />
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            {project.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <StatusBadge status={project.status} />
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            flex: 1,
                            height: 4,
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                            minWidth: 80,
                            maxWidth: 160,
                          }}>
                            <div style={{
                              width: `${progress}%`,
                              height: '100%',
                              background: 'var(--color-accent-default)',
                              borderRadius: 'var(--radius-full)',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {formatDate(project.endDate)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Ligne 3 — Jalons à venir */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Jalons à venir — 30 prochains jours
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRect key={i} height={20} />
              ))}
            </div>
          ) : !data || data.upcomingMilestonesList.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 14, color: 'var(--color-text-tertiary)' }}>
              Aucun jalon prévu dans les 30 prochains jours
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.upcomingMilestonesList.map((milestone, idx) => (
                <div
                  key={milestone.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 24px',
                    borderBottom: idx < data.upcomingMilestonesList.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-accent-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Diamond size={16} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {milestone.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
                      {milestone.projectName}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                    {formatDate(milestone.plannedDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
