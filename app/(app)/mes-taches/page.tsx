'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { TaskDrawer } from '@/components/taches/task-drawer'
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_STATUS_BG, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS, TaskPriority } from '@/types/task'
import { CheckSquare, Circle, Clock, AlertTriangle, FolderKanban } from 'lucide-react'

interface TaskWithProject extends Task {
  project: { id: string; name: string; color: string } | null
}

const STATUS_FILTERS: { value: TaskStatus | 'ALL' | 'ACTIVE'; label: string }[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'ACTIVE', label: 'Actives' },
  { value: 'A_FAIRE', label: 'À faire' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EN_REVUE', label: 'En révision' },
  { value: 'BLOQUE', label: 'Bloquées' },
  { value: 'TERMINE', label: 'Terminées' },
]

function isLate(dueDate: string | null, status: TaskStatus) {
  if (!dueDate || status === 'TERMINE') return false
  return new Date(dueDate) < new Date()
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000)
  if (diff < -1) return { label: `${Math.abs(diff)} j de retard`, late: true }
  if (diff === -1) return { label: 'Hier', late: true }
  if (diff === 0) return { label: 'Aujourd\'hui', late: false }
  if (diff === 1) return { label: 'Demain', late: false }
  if (diff < 7) return { label: `Dans ${diff} j`, late: false }
  return { label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), late: false }
}

export default function MesTachesPage() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL' | 'ACTIVE'>('ACTIVE')
  const [groupBy, setGroupBy] = useState<'project' | 'date'>('project')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/me/tasks')
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return tasks
    if (statusFilter === 'ACTIVE') return tasks.filter(t => t.status !== 'TERMINE')
    return tasks.filter(t => t.status === statusFilter)
  }, [tasks, statusFilter])

  // Group by project
  const byProject = useMemo(() => {
    const map = new Map<string, { project: TaskWithProject['project']; tasks: TaskWithProject[] }>()
    for (const t of filtered) {
      const key = t.projectId
      if (!map.has(key)) map.set(key, { project: t.project, tasks: [] })
      map.get(key)!.tasks.push(t)
    }
    return Array.from(map.values()).sort((a, b) => (a.project?.name ?? '').localeCompare(b.project?.name ?? ''))
  }, [filtered])

  // Group by due date
  const byDate = useMemo(() => {
    const late: TaskWithProject[] = []
    const today: TaskWithProject[] = []
    const week: TaskWithProject[] = []
    const later: TaskWithProject[] = []
    const noDate: TaskWithProject[] = []
    const now = new Date()
    const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + 7)

    for (const t of filtered) {
      if (!t.dueDate) { noDate.push(t); continue }
      const d = new Date(t.dueDate)
      if (t.status !== 'TERMINE' && d < now) late.push(t)
      else if (d.toDateString() === now.toDateString()) today.push(t)
      else if (d <= endOfWeek) week.push(t)
      else later.push(t)
    }
    return [
      { label: 'En retard', tasks: late, accent: 'var(--color-danger-default)', bg: 'var(--color-danger-bg)' },
      { label: 'Aujourd\'hui', tasks: today, accent: 'var(--color-warning-default)', bg: 'var(--color-warning-bg)' },
      { label: 'Cette semaine', tasks: week, accent: 'var(--color-accent-default)', bg: 'var(--color-accent-bg)' },
      { label: 'Plus tard', tasks: later, accent: 'var(--color-text-tertiary)', bg: 'var(--color-bg-tertiary)' },
      { label: 'Sans date', tasks: noDate, accent: 'var(--color-text-tertiary)', bg: 'var(--color-bg-tertiary)' },
    ].filter(g => g.tasks.length > 0)
  }, [filtered])

  const handleUpdate = async (taskId: string, data: Partial<Task>) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const res = await fetch(`/api/projects/${task.projectId}/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
      if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, ...updated } : null)
    }
  }

  const handleDelete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    await fetch(`/api/projects/${task.projectId}/tasks/${taskId}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setSelectedTask(null)
  }

  const lateCount = tasks.filter(t => isLate(t.dueDate, t.status)).length
  const activeCount = tasks.filter(t => t.status !== 'TERMINE').length

  const btnStyle = (active: boolean): React.CSSProperties => ({
    height: 30, padding: '0 12px',
    border: '1px solid var(--color-border-default)', borderRadius: 20,
    background: active ? 'var(--color-accent-default)' : 'var(--color-bg-secondary)',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'var(--font-primary)', transition: 'all 120ms',
    whiteSpace: 'nowrap' as const,
  })

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px',
    borderBottom: '1px solid var(--color-border-subtle)',
    cursor: 'pointer', transition: 'background 120ms',
  }

  const renderTaskRow = (t: TaskWithProject, showProject = true) => {
    const late = isLate(t.dueDate, t.status)
    const dateInfo = formatDate(t.dueDate)
    return (
      <div
        key={t.id}
        style={rowStyle}
        onClick={() => { setSelectedTask(t); setSelectedProjectId(t.projectId) }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Status indicator */}
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${TASK_STATUS_COLORS[t.status]}`, background: t.status === 'TERMINE' ? TASK_STATUS_COLORS[t.status] : 'transparent', flexShrink: 0 }} />

        {/* Title */}
        <span style={{
          flex: 1, fontSize: 14, minWidth: 0,
          color: t.status === 'TERMINE' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
          textDecoration: t.status === 'TERMINE' ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {t.title}
        </span>

        {/* Project badge */}
        {showProject && t.project && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: 'var(--color-text-tertiary)',
            padding: '1px 8px', borderRadius: 12,
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border-subtle)',
            flexShrink: 0, maxWidth: 160,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.project.color, flexShrink: 0 }} />
            {t.project.name}
          </span>
        )}

        {/* Priority */}
        {t.priority !== 'NORMALE' && (
          <span style={{ fontSize: 11, fontWeight: 500, color: TASK_PRIORITY_COLORS[t.priority], flexShrink: 0 }}>
            {TASK_PRIORITY_LABELS[t.priority]}
          </span>
        )}

        {/* Due date */}
        {dateInfo && (
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: dateInfo.late ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}>
            {dateInfo.late && <AlertTriangle size={10} strokeWidth={2} style={{ display: 'inline', marginRight: 3 }} />}
            {dateInfo.label}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <Header title="Mes tâches" />
      <div style={{ padding: 'var(--space-10)' }}>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Tâches actives', value: activeCount, icon: <Circle size={18} strokeWidth={1.5} />, color: 'var(--color-accent-default)', bg: 'var(--color-accent-bg)' },
            { label: 'En retard', value: lateCount, icon: <AlertTriangle size={18} strokeWidth={1.5} />, color: 'var(--color-danger-default)', bg: 'var(--color-danger-bg)' },
            { label: 'Terminées', value: tasks.filter(t => t.status === 'TERMINE').length, icon: <CheckSquare size={18} strokeWidth={1.5} />, color: 'var(--color-success-default)', bg: 'var(--color-success-bg)' },
            { label: 'Projets', value: new Set(tasks.map(t => t.projectId)).size, icon: <FolderKanban size={18} strokeWidth={1.5} />, color: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)' },
          ].map(k => (
            <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', flex: '1 1 160px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                {k.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{loading ? '—' : k.value}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)} style={btnStyle(statusFilter === f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setGroupBy('project')} style={btnStyle(groupBy === 'project')}>Par projet</button>
            <button onClick={() => setGroupBy('date')} style={btnStyle(groupBy === 'date')}>Par échéance</button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} style={{ height: 44, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <CheckSquare size={40} strokeWidth={1} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              {statusFilter === 'ACTIVE' ? 'Aucune tâche active' : 'Aucune tâche'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              {statusFilter === 'ACTIVE' ? 'Toutes vos tâches sont terminées.' : 'Aucune tâche ne correspond à ce filtre.'}
            </p>
          </div>
        ) : groupBy === 'project' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {byProject.map(group => (
              <div key={group.project?.id ?? 'unknown'} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-primary)' }}>
                  {group.project && <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.project.color, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {group.project?.name ?? 'Projet inconnu'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                    {group.tasks.length} tâche{group.tasks.length > 1 ? 's' : ''}
                  </span>
                </div>
                {group.tasks.map(t => renderTaskRow(t, false))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {byDate.map(group => (
              <div key={group.label} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--color-border-subtle)', background: group.bg }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: group.accent, letterSpacing: '.03em' }}>{group.label}</span>
                  <span style={{ fontSize: 11, color: group.accent, opacity: .7, marginLeft: 'auto' }}>{group.tasks.length}</span>
                </div>
                {group.tasks.map(t => renderTaskRow(t, true))}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          projectId={selectedProjectId}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
