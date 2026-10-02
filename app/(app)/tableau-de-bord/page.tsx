'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/projets/status-badge'
import { MilestoneDetailModal } from '@/components/jalons/milestone-detail-modal'
import { FolderKanban, CheckSquare, Diamond, Target, AlertTriangle, CheckCheck, Users } from 'lucide-react'
import type { ProjectStatus } from '@/types/project'

interface TasksByStatus {
  A_FAIRE: number
  EN_COURS: number
  EN_REVUE: number
  TERMINE: number
  BLOQUE: number
}

interface MyTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  projectId: string
  projectName: string
}

interface MemberWorkload {
  userId: string
  name: string | null
  count: number
}

interface DashboardData {
  activeProjects: number
  tasksInProgress: number
  tasksOverdue: number
  tasksDoneToday: number
  upcomingMilestones: number
  objectivesRate: number
  tasksByStatus: TasksByStatus
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
    projectId: string
    projectName: string
    status: string
    taskCount: number
    taskDone: number
  }[]
  myTodayTasks: MyTask[]
  memberWorkload: MemberWorkload[]
  isAdmin: boolean
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
      padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonRect width={100} height={12} />
          <SkeletonRect width={60} height={28} />
        </div>
        <SkeletonRect width={36} height={36} style={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
      </div>
    </div>
  )
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITIQUE: 'var(--color-danger-default)',
  HAUTE: 'var(--color-warning-default)',
  NORMALE: 'var(--color-accent-default)',
  BASSE: 'var(--color-text-tertiary)',
}

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  EN_REVUE: 'En revue',
  TERMINE: 'Terminé',
  BLOQUE: 'Bloqué',
}

export default function TableauDeBordPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMilestone, setSelectedMilestone] = useState<{ id: string; projectId: string } | null>(null)

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

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return `J+${Math.abs(diff)}`
    if (diff === 0) return "Auj."
    if (diff === 1) return "Demain"
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  const kpis = [
    {
      label: 'Projets actifs',
      value: data?.activeProjects ?? 0,
      icon: <FolderKanban size={18} strokeWidth={1.5} />,
      color: 'var(--color-accent-default)',
      bg: 'var(--color-accent-bg)',
    },
    {
      label: 'Tâches en cours',
      value: data?.tasksInProgress ?? 0,
      icon: <CheckSquare size={18} strokeWidth={1.5} />,
      color: 'var(--color-accent-default)',
      bg: 'var(--color-accent-bg)',
    },
    {
      label: 'Tâches en retard',
      value: data?.tasksOverdue ?? 0,
      icon: <AlertTriangle size={18} strokeWidth={1.5} />,
      color: (data?.tasksOverdue ?? 0) > 0 ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)',
      bg: (data?.tasksOverdue ?? 0) > 0 ? 'var(--color-danger-bg)' : 'var(--color-bg-tertiary)',
      alert: (data?.tasksOverdue ?? 0) > 0,
    },
    {
      label: 'Terminées aujourd\'hui',
      value: data?.tasksDoneToday ?? 0,
      icon: <CheckCheck size={18} strokeWidth={1.5} />,
      color: (data?.tasksDoneToday ?? 0) > 0 ? 'var(--color-success-default)' : 'var(--color-text-tertiary)',
      bg: (data?.tasksDoneToday ?? 0) > 0 ? 'var(--color-success-bg)' : 'var(--color-bg-tertiary)',
    },
    {
      label: 'Jalons à venir',
      value: data?.upcomingMilestones ?? 0,
      icon: <Diamond size={18} strokeWidth={1.5} />,
      color: 'var(--color-accent-default)',
      bg: 'var(--color-accent-bg)',
    },
    {
      label: 'Objectifs atteints',
      value: data ? `${data.objectivesRate}%` : '0%',
      icon: <Target size={18} strokeWidth={1.5} />,
      color: 'var(--color-accent-default)',
      bg: 'var(--color-accent-bg)',
    },
  ]

  const totalTasks = data ? Object.values(data.tasksByStatus).reduce((a, b) => a + b, 0) : 0

  const statusBarSegments = data ? [
    { key: 'TERMINE', label: 'Terminé', color: 'var(--color-success-default)', count: data.tasksByStatus.TERMINE },
    { key: 'EN_COURS', label: 'En cours', color: 'var(--color-accent-default)', count: data.tasksByStatus.EN_COURS },
    { key: 'EN_REVUE', label: 'En revue', color: 'var(--color-warning-default)', count: data.tasksByStatus.EN_REVUE },
    { key: 'BLOQUE', label: 'Bloqué', color: 'var(--color-danger-default)', count: data.tasksByStatus.BLOQUE },
    { key: 'A_FAIRE', label: 'À faire', color: 'var(--color-border-default)', count: data.tasksByStatus.A_FAIRE },
  ] : []

  const maxWorkload = data?.memberWorkload.reduce((m, w) => Math.max(m, w.count), 1) ?? 1

  return (
    <>
      <Header title="Tableau de bord" />
      <div style={{ padding: 'var(--space-10)' }}>

        {/* Ligne 1 — 6 KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)
            : kpis.map((kpi) => (
              <div key={kpi.label} style={{
                background: 'var(--color-bg-secondary)',
                border: `1px solid ${kpi.alert ? 'var(--color-danger-border)' : 'var(--color-border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{
                    width: 32, height: 32,
                    borderRadius: 'var(--radius-md)',
                    background: kpi.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: kpi.color, flexShrink: 0,
                  }}>
                    {kpi.icon}
                  </div>
                </div>
                <p style={{ fontSize: 24, fontWeight: 600, color: kpi.alert ? kpi.color : 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
                  {kpi.value}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.3 }}>
                  {kpi.label}
                </p>
              </div>
            ))
          }
        </div>

        {/* Ligne 2 — Barre de statut des tâches */}
        {!loading && totalTasks > 0 && (
          <div style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', margin: 0 }}>
                Avancement global — {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>
                {data ? Math.round((data.tasksByStatus.TERMINE / totalTasks) * 100) : 0}% terminé
              </p>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 'var(--radius-full)', overflow: 'hidden', gap: 2 }}>
              {statusBarSegments.filter(s => s.count > 0).map(s => (
                <div key={s.key} title={`${s.label}: ${s.count}`} style={{
                  flex: s.count,
                  background: s.color,
                  minWidth: 4,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              {statusBarSegments.filter(s => s.count > 0).map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{s.label} ({s.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ligne 3 — Mes tâches du jour + Charge équipe */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Mes tâches du jour */}
          <div style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Mes tâches du jour</p>
            </div>
            {loading ? (
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonRect key={i} height={18} />)}
              </div>
            ) : !data || data.myTodayTasks.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                Aucune tâche assignée pour aujourd'hui
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.myTodayTasks.map((task, idx) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'TERMINE'
                  return (
                    <div
                      key={task.id}
                      onClick={() => router.push(`/projets/${task.projectId}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 20px',
                        borderBottom: idx < data.myTodayTasks.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: PRIORITY_COLORS[task.priority] ?? 'var(--color-text-tertiary)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
                          {task.projectName}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                          {STATUS_LABELS[task.status]}
                        </span>
                        {task.dueDate && (
                          <span style={{ fontSize: 11, color: isOverdue ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)', fontWeight: isOverdue ? 600 : 400 }}>
                            {formatDateShort(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Charge équipe */}
          <div style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Charge équipe</p>
              {!loading && !data?.isAdmin && (
                <span style={{ fontSize: 11, color: 'var(--color-text-disabled)', background: 'var(--color-bg-tertiary)', padding: '1px 6px', borderRadius: 8 }}>Admin</span>
              )}
            </div>
            {loading ? (
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonRect key={i} height={18} />)}
              </div>
            ) : !data?.isAdmin ? (
              <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                <Users size={28} strokeWidth={1.5} style={{ color: 'var(--color-text-disabled)', margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>
                  Réservé aux administrateurs
                </p>
              </div>
            ) : data.memberWorkload.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                Aucune tâche en cours assignée
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                {data.memberWorkload.map(member => {
                  const pct = Math.round((member.count / maxWorkload) * 100)
                  const initials = member.name
                    ? member.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                    : '?'
                  const isHigh = pct > 75
                  return (
                    <div key={member.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--color-accent-bg)', color: 'var(--color-accent-default)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.name ?? 'Utilisateur'}
                        </p>
                        <div style={{ height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: 'var(--radius-full)',
                            background: isHigh ? 'var(--color-danger-default)' : 'var(--color-accent-default)',
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: isHigh ? 'var(--color-danger-default)' : 'var(--color-text-secondary)', fontWeight: isHigh ? 600 : 400, flexShrink: 0 }}>
                        {member.count}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ligne 4 — Projets récents */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Projets récents
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                      padding: '9px 20px',
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
                    <td colSpan={4} style={{ padding: '32px 20px', textAlign: 'center', fontSize: 14, color: 'var(--color-text-tertiary)' }}>
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
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            {project.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <StatusBadge status={project.status} />
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            flex: 1, height: 4,
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden', minWidth: 80, maxWidth: 160,
                          }}>
                            <div style={{
                              width: `${progress}%`, height: '100%',
                              background: 'var(--color-accent-default)',
                              borderRadius: 'var(--radius-full)',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {formatDate(project.endDate)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Ligne 5 — Jalons à venir */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Jalons à venir — 30 prochains jours
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRect key={i} height={20} />
              ))}
            </div>
          ) : !data || data.upcomingMilestonesList.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 14, color: 'var(--color-text-tertiary)' }}>
              Aucun jalon prévu dans les 30 prochains jours
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.upcomingMilestonesList.map((milestone, idx) => {
                const progress = milestone.taskCount > 0
                  ? Math.round((milestone.taskDone / milestone.taskCount) * 100)
                  : 0
                return (
                  <div
                    key={milestone.id}
                    onClick={() => setSelectedMilestone({ id: milestone.id, projectId: milestone.projectId })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '13px 20px',
                      borderBottom: idx < data.upcomingMilestonesList.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 'var(--radius-md)',
                      background: 'var(--color-accent-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Diamond size={15} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {milestone.title}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
                        {milestone.projectName}
                      </p>
                      {milestone.taskCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                          <div style={{ flex: 1, height: 3, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', maxWidth: 120 }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-accent-default)', borderRadius: 'var(--radius-full)' }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{milestone.taskDone}/{milestone.taskCount}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {formatDate(milestone.plannedDate)}
                      </span>
                      {milestone.taskCount > 0 && (
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
                          {milestone.taskCount} tâche{milestone.taskCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {selectedMilestone && (
        <MilestoneDetailModal
          milestoneId={selectedMilestone.id}
          projectId={selectedMilestone.projectId}
          onClose={() => setSelectedMilestone(null)}
        />
      )}
    </>
  )
}
