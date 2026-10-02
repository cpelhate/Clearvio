'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { TaskDrawer } from '@/components/taches/task-drawer'
import { Task, TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from '@/types/task'
import { CheckSquare, Circle, AlertTriangle, FolderKanban, Check, Trash2, X, Plus, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useBreakpoint } from '@/lib/hooks/use-breakpoint'

interface TaskWithProject extends Task {
  project: { id: string; name: string; color: string } | null
}

const STATUS_OPTIONS: TaskStatus[] = ['A_FAIRE', 'EN_COURS', 'EN_REVUE', 'TERMINE', 'BLOQUE']
const PRIORITY_OPTIONS: TaskPriority[] = ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE']
const DUE_OPTIONS = [
  { value: 'late', label: 'En retard' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'later', label: 'Plus tard' },
  { value: 'nodate', label: 'Sans date' },
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
  if (diff === 0) return { label: "Aujourd'hui", late: false }
  if (diff === 1) return { label: 'Demain', late: false }
  if (diff < 7) return { label: `Dans ${diff} j`, late: false }
  return { label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), late: false }
}

export default function MesTachesPage() {
  const bp = useBreakpoint()
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatuses, setFilterStatuses] = useState<Set<TaskStatus>>(new Set())
  const [filterPriorities, setFilterPriorities] = useState<Set<TaskPriority>>(new Set())
  const [filterDue, setFilterDue] = useState<Set<string>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [groupBy, setGroupBy] = useState<'project' | 'date'>('project')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkStatusVal, setBulkStatusVal] = useState('')
  const [bulkPriorityVal, setBulkPriorityVal] = useState('')
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string; color: string }[]>([])
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskSubmitting, setNewTaskSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/me/tasks')
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
    fetch('/api/projects').then(r => r.ok ? r.json() : []).then((ps: { id: string; name: string; color: string }[]) => {
      setProjects(ps)
      if (ps.length > 0) setNewTaskProjectId(ps[0].id)
    }).catch(() => {})
  }, [])

  const toggleStatus = (s: TaskStatus) => setFilterStatuses(prev => {
    const next = new Set(prev); if (next.has(s)) next.delete(s); else next.add(s); return next
  })
  const togglePriority = (p: TaskPriority) => setFilterPriorities(prev => {
    const next = new Set(prev); if (next.has(p)) next.delete(p); else next.add(p); return next
  })
  const toggleDue = (d: string) => setFilterDue(prev => {
    const next = new Set(prev); if (next.has(d)) next.delete(d); else next.add(d); return next
  })
  const clearFilters = () => { setFilterStatuses(new Set()); setFilterPriorities(new Set()); setFilterDue(new Set()) }
  const filterCount = filterStatuses.size + filterPriorities.size + filterDue.size

  const filtered = useMemo(() => {
    let result = tasks
    if (filterStatuses.size > 0) result = result.filter(t => filterStatuses.has(t.status))
    if (filterPriorities.size > 0) result = result.filter(t => filterPriorities.has(t.priority))
    if (filterDue.size > 0) {
      const now = new Date()
      const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999)
      const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + 7); endOfWeek.setHours(23, 59, 59, 999)
      result = result.filter(t => {
        if (!t.dueDate) return filterDue.has('nodate')
        const d = new Date(t.dueDate)
        if (t.status !== 'TERMINE' && d < now) return filterDue.has('late')
        if (d <= endOfToday) return filterDue.has('today')
        if (d <= endOfWeek) return filterDue.has('week')
        return filterDue.has('later')
      })
    }
    return result
  }, [tasks, filterStatuses, filterPriorities, filterDue])

  const byProject = useMemo(() => {
    const map = new Map<string, { project: TaskWithProject['project']; tasks: TaskWithProject[] }>()
    for (const t of filtered) {
      const key = t.projectId
      if (!map.has(key)) map.set(key, { project: t.project, tasks: [] })
      map.get(key)!.tasks.push(t)
    }
    return Array.from(map.values()).sort((a, b) => (a.project?.name ?? '').localeCompare(b.project?.name ?? ''))
  }, [filtered])

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
      { label: "Aujourd'hui", tasks: today, accent: 'var(--color-warning-default)', bg: 'var(--color-warning-bg)' },
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next
    })
    setBulkConfirmDelete(false)
  }

  const allFilteredIds = filtered.map(t => t.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))
  const someSelected = !allSelected && selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allFilteredIds))
    setBulkConfirmDelete(false)
  }

  const clearSelection = () => { setSelectedIds(new Set()); setBulkConfirmDelete(false) }

  const bulkUpdate = async (data: Partial<Task>) => {
    setBulkLoading(true)
    const ids = [...selectedIds]
    await Promise.all(ids.map(id => {
      const t = tasks.find(x => x.id === id)
      if (!t) return
      return fetch(`/api/projects/${t.projectId}/tasks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }))
    setTasks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, ...data } : t))
    setBulkLoading(false)
    clearSelection()
  }

  const bulkDelete = async () => {
    if (!bulkConfirmDelete) { setBulkConfirmDelete(true); return }
    setBulkLoading(true)
    const ids = [...selectedIds]
    const toDelete = tasks.filter(t => ids.includes(t.id))
    for (const t of toDelete) {
      await fetch(`/api/projects/${t.projectId}/tasks/${t.id}`, { method: 'DELETE' })
    }
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
    if (selectedTask && ids.includes(selectedTask.id)) setSelectedTask(null)
    setBulkLoading(false)
    clearSelection()
  }

  const submitNewTask = async () => {
    if (!newTaskTitle.trim() || !newTaskProjectId) return
    setNewTaskSubmitting(true)
    const res = await fetch(`/api/projects/${newTaskProjectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle.trim(), dueDate: newTaskDueDate || null, assigneeId: currentUserId }),
    })
    if (res.ok) {
      setShowNewTaskForm(false)
      setNewTaskTitle('')
      setNewTaskDueDate('')
      load()
    }
    setNewTaskSubmitting(false)
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

  const selectBtnBase: React.CSSProperties = {
    height: 30, padding: '0 8px',
    border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-primary)',
  }

  const renderTaskRow = (t: TaskWithProject, showProject = true) => {
    const isSelected = selectedIds.has(t.id)
    const late = isLate(t.dueDate, t.status)
    const dateInfo = formatDate(t.dueDate)
    return (
      <div
        key={t.id}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-border-subtle)',
          cursor: 'pointer', transition: 'background 120ms',
          background: isSelected ? 'var(--color-accent-bg)' : 'transparent',
        }}
        onClick={() => { setSelectedTask(t); setSelectedProjectId(t.projectId) }}
        onMouseEnter={e => (e.currentTarget.style.background = isSelected ? 'var(--color-accent-bg)' : 'var(--color-bg-tertiary)')}
        onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'var(--color-accent-bg)' : 'transparent')}
      >
        <div
          onClick={e => { e.stopPropagation(); toggleSelect(t.id) }}
          style={{
            width: 15, height: 15, borderRadius: 3, flexShrink: 0,
            border: `1.5px solid ${isSelected ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
            background: isSelected ? 'var(--color-accent-default)' : 'transparent',
            cursor: 'pointer',
            opacity: isSelected || selectedIds.size > 0 ? 1 : 0,
            transition: 'opacity 100ms, background 100ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isSelected && <Check size={10} strokeWidth={2.5} style={{ color: '#fff' }} />}
        </div>
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${TASK_STATUS_COLORS[t.status]}`, background: t.status === 'TERMINE' ? TASK_STATUS_COLORS[t.status] : 'transparent', flexShrink: 0 }} />
        <span style={{
          flex: 1, fontSize: 14, minWidth: 0,
          color: t.status === 'TERMINE' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
          textDecoration: t.status === 'TERMINE' ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {t.title}
        </span>
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
        {t.priority !== 'NORMALE' && (
          <span style={{ fontSize: 11, fontWeight: 500, color: TASK_PRIORITY_COLORS[t.priority], flexShrink: 0 }}>
            {TASK_PRIORITY_LABELS[t.priority]}
          </span>
        )}
        {dateInfo && (
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: dateInfo.late ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}>
            {late && <AlertTriangle size={10} strokeWidth={2} style={{ display: 'inline', marginRight: 3 }} />}
            {dateInfo.label}
          </span>
        )}
      </div>
    )
  }

  const pagePadding = bp === 'mobile' ? '16px' : 'var(--space-10)'
  const bulkBottom = bp === 'mobile' ? 'calc(56px + 16px + env(safe-area-inset-bottom, 0px))' : '24px'

  return (
    <>
      <Header title="Mes tâches" />
      <div style={{ padding: pagePadding }}>

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: filterCount > 0 ? 8 : 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div
              onClick={toggleSelectAll}
              title={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              style={{
                width: 28, height: 28, borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${allSelected || someSelected ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
                background: allSelected ? 'var(--color-accent-default)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 100ms',
              }}
            >
              {allSelected && <Check size={13} strokeWidth={2.5} style={{ color: '#fff' }} />}
              {someSelected && <div style={{ width: 9, height: 2, background: 'var(--color-accent-default)', borderRadius: 1 }} />}
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)', margin: '0 2px' }} />
            <button
              onClick={() => setShowFilterPanel(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px',
                border: `1px solid ${filterCount > 0 ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
                borderRadius: 20,
                background: filterCount > 0 ? 'var(--color-accent-bg)' : 'var(--color-bg-secondary)',
                color: filterCount > 0 ? 'var(--color-accent-default)' : 'var(--color-text-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-primary)', transition: 'all 120ms',
              }}
            >
              <SlidersHorizontal size={13} strokeWidth={1.5} />
              Filtres
              {filterCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--color-accent-default)', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {filterCount}
                </span>
              )}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setGroupBy('project')} style={btnStyle(groupBy === 'project')}>Par projet</button>
            <button onClick={() => setGroupBy('date')} style={btnStyle(groupBy === 'date')}>Par échéance</button>
            <button
              onClick={() => setShowNewTaskForm(v => !v)}
              style={{ ...btnStyle(showNewTaskForm), display: 'flex', alignItems: 'center', gap: 5, background: showNewTaskForm ? 'var(--color-accent-default)' : 'var(--color-bg-secondary)', color: showNewTaskForm ? '#fff' : 'var(--color-text-primary)' }}
            >
              <Plus size={13} strokeWidth={1.5} />
              Nouvelle tâche
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {filterCount > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            {[...filterStatuses].map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 10px', borderRadius: 20, background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-default)', color: 'var(--color-accent-default)', fontSize: 11, fontWeight: 500 }}>
                {TASK_STATUS_LABELS[s]}
                <button onClick={() => toggleStatus(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit' }}><X size={10} strokeWidth={2} /></button>
              </span>
            ))}
            {[...filterPriorities].map(p => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 10px', borderRadius: 20, background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-default)', color: 'var(--color-accent-default)', fontSize: 11, fontWeight: 500 }}>
                {TASK_PRIORITY_LABELS[p]}
                <button onClick={() => togglePriority(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit' }}><X size={10} strokeWidth={2} /></button>
              </span>
            ))}
            {[...filterDue].map(d => {
              const opt = DUE_OPTIONS.find(o => o.value === d)
              return (
                <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 10px', borderRadius: 20, background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-default)', color: 'var(--color-accent-default)', fontSize: 11, fontWeight: 500 }}>
                  {opt?.label}
                  <button onClick={() => toggleDue(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit' }}><X size={10} strokeWidth={2} /></button>
                </span>
              )
            })}
            <button
              onClick={clearFilters}
              style={{ height: 24, padding: '0 10px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 20, fontSize: 11, color: 'var(--color-text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font-primary)' }}
            >
              Tout effacer
            </button>
          </div>
        )}

        {showNewTaskForm && (
          <div style={{ marginBottom: 16, padding: '16px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Projet</label>
              <select value={newTaskProjectId} onChange={e => setNewTaskProjectId(e.target.value)} style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 13, fontFamily: 'var(--font-primary)' }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '2 1 240px' }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Titre</label>
              <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitNewTask()} placeholder="Titre de la tâche" style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 13, fontFamily: 'var(--font-primary)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Échéance (optionnel)</label>
              <input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 13, fontFamily: 'var(--font-primary)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitNewTask} disabled={newTaskSubmitting || !newTaskTitle.trim()} style={{ height: 32, padding: '0 14px', background: 'var(--color-accent-default)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-primary)', opacity: newTaskSubmitting || !newTaskTitle.trim() ? 0.5 : 1 }}>
                {newTaskSubmitting ? '...' : 'Créer'}
              </button>
              <button onClick={() => { setShowNewTaskForm(false); setNewTaskTitle(''); setNewTaskDueDate('') }} style={{ height: 32, padding: '0 10px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-primary)' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} style={{ height: 44, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <CheckSquare size={40} strokeWidth={1} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              {filterCount > 0 ? 'Aucune tâche trouvée' : 'Aucune tâche'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              {filterCount > 0 ? 'Aucune tâche ne correspond aux filtres actifs.' : "Vous n'avez aucune tâche pour le moment."}
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: bulkBottom, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 100, fontSize: 13, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', padding: '0 4px' }}>
            {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div style={{ width: 1, height: 20, background: 'var(--color-border-default)', flexShrink: 0 }} />
          <select value={bulkStatusVal} onChange={e => { const v = e.target.value; if (v) { setBulkStatusVal(''); bulkUpdate({ status: v as TaskStatus }) } }} disabled={bulkLoading} style={selectBtnBase}>
            <option value="" disabled>Statut…</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
          </select>
          <select value={bulkPriorityVal} onChange={e => { const v = e.target.value; if (v) { setBulkPriorityVal(''); bulkUpdate({ priority: v as TaskPriority }) } }} disabled={bulkLoading} style={selectBtnBase}>
            <option value="" disabled>Priorité…</option>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
          </select>
          <div style={{ width: 1, height: 20, background: 'var(--color-border-default)', flexShrink: 0 }} />
          <button
            onClick={bulkDelete}
            disabled={bulkLoading}
            style={{
              height: 30, padding: '0 10px',
              background: bulkConfirmDelete ? 'var(--color-danger-default)' : 'var(--color-danger-bg)',
              border: `1px solid var(--color-danger-default)`,
              borderRadius: 'var(--radius-md)',
              color: bulkConfirmDelete ? '#fff' : 'var(--color-danger-default)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-primary)', transition: 'all 120ms',
            }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
            {bulkConfirmDelete ? 'Confirmer' : 'Supprimer'}
          </button>
          <button
            onClick={clearSelection}
            title="Annuler la sélection"
            style={{ width: 28, height: 28, background: 'none', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Filter flyout panel */}
      {showFilterPanel && (
        <>
          <div onClick={() => setShowFilterPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.15)' }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 272,
            zIndex: 201, background: 'var(--color-bg-elevated)',
            borderLeft: '1px solid var(--color-border-default)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Filtres</span>
              <button onClick={() => setShowFilterPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Statut</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {STATUS_OPTIONS.map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={filterStatuses.has(s)} onChange={() => toggleStatus(s)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-accent-default)' }} />
                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{TASK_STATUS_LABELS[s]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Priorité</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {PRIORITY_OPTIONS.map(p => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={filterPriorities.has(p)} onChange={() => togglePriority(p)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-accent-default)' }} />
                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{TASK_PRIORITY_LABELS[p]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Échéance</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {DUE_OPTIONS.map(o => (
                    <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={filterDue.has(o.value)} onChange={() => toggleDue(o.value)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-accent-default)' }} />
                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {filterCount > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border-subtle)' }}>
                <button
                  onClick={clearFilters}
                  style={{ width: '100%', height: 34, background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-primary)' }}
                >
                  Réinitialiser ({filterCount})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
