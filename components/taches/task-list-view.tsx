'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronRight, ChevronDown, Flag, Check, Trash2, X, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Task, TaskStatus, TaskPriority, TASK_STATUS_COLORS, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from '@/types/task'
import { TaskDrawer } from './task-drawer'
import { useToast } from '@/components/ui/toast'
import { usePlan } from '@/hooks/use-plan'
import { UpgradeModal } from '@/components/billing/upgrade-modal'

interface MemberInfo { userId: string; name: string | null }
interface MilestoneInfo { id: string; title: string }

interface TaskListViewProps {
  tasks: Task[]
  projectId: string
  members?: MemberInfo[]
  onCreateTask: (data: { title: string; parentId?: string }) => Promise<unknown>
  onUpdateTask: (id: string, data: Partial<Task>) => Promise<unknown>
  onDeleteTask: (id: string) => Promise<unknown>
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

function buildTree(tasks: Task[]): Task[] {
  const map = new Map<string, Task & { children: Task[] }>()
  const roots: (Task & { children: Task[] })[] = []

  tasks.forEach(t => map.set(t.id, { ...t, children: [] }))
  tasks.forEach(t => {
    const node = map.get(t.id)!
    if (t.parentId && map.has(t.parentId)) {
      map.get(t.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function isOverdue(d: string | null, status: TaskStatus) {
  if (!d || status === 'TERMINE') return false
  return new Date(d) < new Date()
}

interface TaskRowProps {
  task: Task & { children?: Task[] }
  depth: number
  onSelect: (t: Task) => void
  onCreateChild: (parentId: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  addingChildOf: string | null
  onAddChild: (parentId: string, title: string) => void
  onCancelAdd: () => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}

function TaskRow({ task, depth, onSelect, onCreateChild, onStatusChange, addingChildOf, onAddChild, onCancelAdd, selectedIds, onToggleSelect }: TaskRowProps) {
  const [expanded, setExpanded] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [hovered, setHovered] = useState(false)
  const hasChildren = (task.children?.length ?? 0) > 0
  const overdue = isOverdue(task.dueDate, task.status)
  const isSelected = selectedIds.has(task.id)
  const showCheckbox = hovered || isSelected || selectedIds.size > 0

  return (
    <>
      <div
        style={{
          display: 'flex', alignItems: 'center',
          height: 40, paddingLeft: 16 + depth * 24, paddingRight: 16,
          borderBottom: '1px solid var(--color-border-subtle)',
          cursor: 'pointer', gap: 8,
          background: isSelected ? 'var(--color-accent-bg)' : 'transparent', transition: 'background 80ms',
        }}
        onMouseEnter={e => { setHovered(true); if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-secondary)' }}
        onMouseLeave={e => { setHovered(false); (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'var(--color-accent-bg)' : 'transparent' }}
      >
        <div
          onClick={e => { e.stopPropagation(); onToggleSelect(task.id) }}
          style={{
            width: 15, height: 15, borderRadius: 3, flexShrink: 0,
            border: `1.5px solid ${isSelected ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
            background: isSelected ? 'var(--color-accent-default)' : 'transparent',
            cursor: 'pointer', opacity: showCheckbox ? 1 : 0,
            transition: 'opacity 100ms, border-color 100ms, background 100ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isSelected && <Check size={10} strokeWidth={2.5} style={{ color: '#fff' }} />}
        </div>

        <button
          onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-tertiary)', flexShrink: 0, opacity: hasChildren ? 1 : 0, pointerEvents: hasChildren ? 'auto' : 'none' }}
        >
          {expanded ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
        </button>

        <button
          onClick={e => {
            e.stopPropagation()
            const statuses: TaskStatus[] = ['A_FAIRE', 'EN_COURS', 'EN_REVUE', 'TERMINE', 'BLOQUE']
            const idx = statuses.indexOf(task.status)
            onStatusChange(task.id, statuses[(idx + 1) % statuses.length])
          }}
          title={task.status}
          style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${TASK_STATUS_COLORS[task.status]}`,
            background: task.status === 'TERMINE' ? TASK_STATUS_COLORS[task.status] : 'transparent',
            cursor: 'pointer',
          }}
        />

        <span
          onClick={() => onSelect(task)}
          style={{
            flex: 1, fontSize: 14, color: 'var(--color-text-primary)',
            textDecoration: task.status === 'TERMINE' ? 'line-through' : 'none',
            opacity: task.status === 'TERMINE' ? 0.6 : 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {task.title}
        </span>

        {task.priority !== 'NORMALE' && (
          <Flag size={13} strokeWidth={1.5} style={{ color: TASK_PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
        )}

        {task.dueDate && (
          <span style={{ fontSize: 12, color: overdue ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {formatDate(task.dueDate)}
          </span>
        )}

        {depth < 2 && (
          <button
            onClick={e => { e.stopPropagation(); onCreateChild(task.id) }}
            title="Ajouter une sous-tâche"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-tertiary)', borderRadius: 'var(--radius-sm)', opacity: 0, transition: 'opacity 150ms' }}
            onMouseEnter={e => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0' }}
          >
            <Plus size={13} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {addingChildOf === task.id && (
        <div style={{
          display: 'flex', alignItems: 'center', height: 40,
          paddingLeft: 16 + (depth + 1) * 24, paddingRight: 16,
          borderBottom: '1px solid var(--color-border-subtle)',
          gap: 8, background: 'var(--color-accent-bg)',
        }}>
          <div style={{ width: 15, flexShrink: 0 }} />
          <div style={{ width: 18, flexShrink: 0 }} />
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--color-border-default)', flexShrink: 0 }} />
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newTitle.trim()) { onAddChild(task.id, newTitle); setNewTitle('') }
              if (e.key === 'Escape') { onCancelAdd(); setNewTitle('') }
            }}
            placeholder="Nom de la sous-tâche..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)' }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Entrée · Échap</span>
        </div>
      )}

      {expanded && task.children?.map(child => (
        <TaskRow
          key={child.id}
          task={child as Task & { children?: Task[] }}
          depth={depth + 1}
          onSelect={onSelect}
          onCreateChild={onCreateChild}
          onStatusChange={onStatusChange}
          addingChildOf={addingChildOf}
          onAddChild={onAddChild}
          onCancelAdd={onCancelAdd}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </>
  )
}

interface AiTask {
  title: string
  description?: string
  priority: string
  children?: { title: string; description?: string; priority: string }[]
}

function AiGenerateModal({ projectId, projectName, onClose, onImport }: {
  projectId: string
  projectName?: string
  onClose: () => void
  onImport: (tasks: AiTask[]) => Promise<void>
}) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiTask[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const { toast } = useToast()

  const generate = async () => {
    if (!description.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, projectName }),
      })
      if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur IA', 'error'); return }
      const data = await res.json()
      setResult(data.tasks ?? [])
      setSelected(new Set((data.tasks ?? []).map((_: AiTask, i: number) => i)))
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!result) return
    setImporting(true)
    const toImport = result.filter((_, i) => selected.has(i))
    await onImport(toImport)
    setImporting(false)
    onClose()
  }

  const toggleSelect = (i: number) => setSelected(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n
  })

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
    fontSize: 14, color: 'var(--color-text-primary)', outline: 'none',
    fontFamily: 'var(--font-primary)', resize: 'vertical', lineHeight: 1.6,
    boxSizing: 'border-box',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301, width: 560, maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh',
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Sparkles size={18} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Générer des tâches avec l'IA</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Décrivez ce que vous voulez accomplir</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex' }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {!result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Description de la fonctionnalité ou du besoin *
                </label>
                <textarea
                  autoFocus
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex : Implémenter un module d'authentification avec inscription, connexion, réinitialisation du mot de passe et gestion des sessions..."
                  style={inputBase}
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}>
                L'IA va générer une liste de tâches structurées que vous pourrez sélectionner avant d'importer.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {result.length} tâche{result.length > 1 ? 's' : ''} générée{result.length > 1 ? 's' : ''} — {selected.size} sélectionnée{selected.size > 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => setResult(null)}
                  style={{ fontSize: 12, color: 'var(--color-accent-default)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  ← Modifier la description
                </button>
              </div>
              {result.map((task, i) => (
                <div
                  key={i}
                  onClick={() => toggleSelect(i)}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                    border: `1px solid ${selected.has(i) ? 'var(--color-accent-default)' : 'var(--color-border-subtle)'}`,
                    background: selected.has(i) ? 'var(--color-accent-bg)' : 'var(--color-bg-secondary)',
                    transition: 'all 100ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 15, height: 15, borderRadius: 3, flexShrink: 0, marginTop: 2,
                      border: `1.5px solid ${selected.has(i) ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
                      background: selected.has(i) ? 'var(--color-accent-default)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected.has(i) && <Check size={9} strokeWidth={2.5} style={{ color: '#fff' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: task.description ? 3 : 0 }}>{task.title}</p>
                      {task.description && <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{task.description}</p>}
                      {task.children && task.children.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {task.children.map((child, j) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 12 }}>
                              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{child.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: task.priority === 'CRITIQUE' ? 'var(--color-danger-bg)' : task.priority === 'HAUTE' ? '#fff3e0' : 'var(--color-bg-tertiary)',
                      color: task.priority === 'CRITIQUE' ? 'var(--color-danger-default)' : task.priority === 'HAUTE' ? '#e65100' : 'var(--color-text-tertiary)',
                      flexShrink: 0,
                    }}>{task.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ height: 34, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>
            Annuler
          </button>
          {!result ? (
            <button
              onClick={generate}
              disabled={loading || !description.trim()}
              style={{ height: 34, padding: '0 16px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: loading || !description.trim() ? 'not-allowed' : 'pointer', color: '#fff', opacity: loading || !description.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-primary)' }}
            >
              <Sparkles size={14} strokeWidth={1.5} />
              {loading ? 'Génération…' : 'Générer'}
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              style={{ height: 34, padding: '0 16px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: importing || selected.size === 0 ? 'not-allowed' : 'pointer', color: '#fff', opacity: importing || selected.size === 0 ? 0.6 : 1, fontFamily: 'var(--font-primary)' }}
            >
              {importing ? 'Import…' : `Importer ${selected.size} tâche${selected.size > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export function TaskListView({ tasks, projectId, members = [], onCreateTask, onUpdateTask, onDeleteTask }: TaskListViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null)
  const [newRootTitle, setNewRootTitle] = useState('')
  const [addingRoot, setAddingRoot] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null)
  const { limits } = usePlan()
  const { toast } = useToast()
  const [bulkStatusVal, setBulkStatusVal] = useState('')
  const [bulkPriorityVal, setBulkPriorityVal] = useState('')
  // Filter state
  const [filterStatuses, setFilterStatuses] = useState<Set<TaskStatus>>(new Set())
  const [filterPriorities, setFilterPriorities] = useState<Set<TaskPriority>>(new Set())
  const [filterDue, setFilterDue] = useState<Set<string>>(new Set())
  const [filterAssignees, setFilterAssignees] = useState<Set<string>>(new Set())
  const [filterMilestones, setFilterMilestones] = useState<Set<string>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [milestones, setMilestones] = useState<MilestoneInfo[]>([])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/milestones`)
      .then(r => r.ok ? r.json() : [])
      .then((ms: { id: string; title: string }[]) => setMilestones(ms.map(m => ({ id: m.id, title: m.title }))))
      .catch(() => {})
  }, [projectId])

  const toggleStatus = (s: TaskStatus) => setFilterStatuses(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  const togglePriority = (p: TaskPriority) => setFilterPriorities(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })
  const toggleDue = (d: string) => setFilterDue(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n })
  const toggleAssignee = (id: string) => setFilterAssignees(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleMilestone = (id: string) => setFilterMilestones(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearFilters = () => { setFilterStatuses(new Set()); setFilterPriorities(new Set()); setFilterDue(new Set()); setFilterAssignees(new Set()); setFilterMilestones(new Set()) }
  const filterCount = filterStatuses.size + filterPriorities.size + filterDue.size + filterAssignees.size + filterMilestones.size

  // Unique assignees present in tasks
  const taskAssignees = [...new Set(tasks.filter(t => t.assigneeId).map(t => t.assigneeId!))]
    .map(userId => ({ userId, name: members.find(m => m.userId === userId)?.name ?? null }))

  // Apply filters
  const filteredTasks = (() => {
    let result = tasks
    if (filterStatuses.size > 0) result = result.filter(t => filterStatuses.has(t.status))
    if (filterPriorities.size > 0) result = result.filter(t => filterPriorities.has(t.priority))
    if (filterAssignees.size > 0) result = result.filter(t => t.assigneeId != null && filterAssignees.has(t.assigneeId))
    if (filterMilestones.size > 0) result = result.filter(t => t.milestoneId != null && filterMilestones.has(t.milestoneId))
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
  })()

  const tree = buildTree(filteredTasks) as (Task & { children: Task[] })[]

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setBulkConfirmDelete(false)
  }

  const allSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedIds.has(t.id))
  const someSelected = !allSelected && selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredTasks.map(t => t.id)))
    setBulkConfirmDelete(false)
  }

  const clearSelection = () => { setSelectedIds(new Set()); setBulkConfirmDelete(false) }

  const bulkStatus = async (status: TaskStatus) => {
    setBulkLoading(true)
    const count = selectedIds.size
    await Promise.all([...selectedIds].map(id => onUpdateTask(id, { status })))
    setBulkLoading(false); clearSelection()
    toast(`${count} tâche${count > 1 ? 's' : ''} mise${count > 1 ? 's' : ''} à jour`)
  }

  const bulkPriority = async (priority: TaskPriority) => {
    setBulkLoading(true)
    const count = selectedIds.size
    await Promise.all([...selectedIds].map(id => onUpdateTask(id, { priority })))
    setBulkLoading(false); clearSelection()
    toast(`${count} tâche${count > 1 ? 's' : ''} mise${count > 1 ? 's' : ''} à jour`)
  }

  const bulkDelete = async () => {
    if (!bulkConfirmDelete) { setBulkConfirmDelete(true); return }
    setBulkLoading(true)
    const count = selectedIds.size
    for (const id of [...selectedIds]) await onDeleteTask(id)
    setBulkLoading(false); clearSelection()
    toast(`${count} tâche${count > 1 ? 's' : ''} supprimée${count > 1 ? 's' : ''}`)
  }

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await onUpdateTask(id, { status })
    if (selectedTask?.id === id) setSelectedTask(prev => prev ? { ...prev, status } : null)
  }

  const handleAddChild = async (parentId: string, title: string) => {
    await onCreateTask({ title, parentId }); setAddingChildOf(null)
  }

  const handleAddRoot = async () => {
    if (!newRootTitle.trim()) return
    await onCreateTask({ title: newRootTitle.trim() })
    setNewRootTitle(''); setAddingRoot(false)
  }

  const selectBtnBase: React.CSSProperties = {
    height: 30, padding: '0 8px',
    border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-primary)',
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 400 }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Filter bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 36, paddingLeft: 16, paddingRight: 16,
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-default)',
        }}>
          {/* Select all */}
          <div
            onClick={toggleSelectAll}
            style={{
              width: 15, height: 15, borderRadius: 3, flexShrink: 0,
              border: `1.5px solid ${allSelected ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
              background: allSelected ? 'var(--color-accent-default)' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 100ms, border-color 100ms',
            }}
          >
            {allSelected && <Check size={10} strokeWidth={2.5} style={{ color: '#fff' }} />}
            {someSelected && <div style={{ width: 7, height: 2, background: 'var(--color-text-tertiary)', borderRadius: 1 }} />}
          </div>
          <div style={{ width: 18, flexShrink: 0 }} />
          <div style={{ width: 14, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-tertiary)' }}>
            Tâche
          </span>
          {/* Active filter chips inline */}
          {filterCount > 0 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[...filterStatuses].map(s => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 20, padding: '0 8px', borderRadius: 20, background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-default)', color: 'var(--color-accent-default)', fontSize: 10, fontWeight: 500 }}>
                  {TASK_STATUS_LABELS[s]}
                  <button onClick={() => toggleStatus(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit' }}><X size={9} strokeWidth={2} /></button>
                </span>
              ))}
              {[...filterPriorities].map(p => (
                <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 20, padding: '0 8px', borderRadius: 20, background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-default)', color: 'var(--color-accent-default)', fontSize: 10, fontWeight: 500 }}>
                  {TASK_PRIORITY_LABELS[p]}
                  <button onClick={() => togglePriority(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit' }}><X size={9} strokeWidth={2} /></button>
                </span>
              ))}
              {filterCount > filterStatuses.size + filterPriorities.size && (
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>+{filterCount - filterStatuses.size - filterPriorities.size}</span>
              )}
              <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', borderRadius: 'var(--radius-sm)' }} title="Effacer les filtres">
                <X size={11} strokeWidth={2} />
              </button>
            </div>
          )}
          <button
            onClick={() => limits.ai ? setShowAiModal(true) : setUpgradeFeature('la génération de tâches par IA')}
            title="Générer des tâches avec l'IA"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px',
              border: '1px solid var(--color-border-default)', borderRadius: 20,
              background: 'transparent', color: 'var(--color-text-tertiary)',
              fontSize: 11, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-primary)', flexShrink: 0,
            }}
          >
            <Sparkles size={11} strokeWidth={1.5} />
            IA
          </button>
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px',
              border: `1px solid ${filterCount > 0 ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
              borderRadius: 20,
              background: filterCount > 0 ? 'var(--color-accent-bg)' : 'transparent',
              color: filterCount > 0 ? 'var(--color-accent-default)' : 'var(--color-text-tertiary)',
              fontSize: 11, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-primary)', flexShrink: 0,
            }}
          >
            <SlidersHorizontal size={11} strokeWidth={1.5} />
            Filtres
            {filterCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: 'var(--color-accent-default)', color: '#fff', fontSize: 9, fontWeight: 700 }}>
                {filterCount}
              </span>
            )}
          </button>
          <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-tertiary)', width: 80, textAlign: 'right', flexShrink: 0 }}>
            Échéance
          </span>
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredTasks.length === 0 && !addingRoot ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
              {filterCount > 0 ? (
                <>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucune tâche trouvée</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Aucune tâche ne correspond aux filtres actifs.</p>
                  <button onClick={clearFilters} style={{ height: 32, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-primary)' }}>
                    Effacer les filtres
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucune tâche</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Commencez par créer votre première tâche.</p>
                  <button
                    onClick={() => setAddingRoot(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#fff' }}
                  >
                    <Plus size={14} strokeWidth={1.5} /> Nouvelle tâche
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {tree.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  depth={0}
                  onSelect={setSelectedTask}
                  onCreateChild={setAddingChildOf}
                  onStatusChange={handleStatusChange}
                  addingChildOf={addingChildOf}
                  onAddChild={handleAddChild}
                  onCancelAdd={() => setAddingChildOf(null)}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              ))}

              {addingRoot ? (
                <div style={{
                  display: 'flex', alignItems: 'center', height: 40,
                  paddingLeft: 16, paddingRight: 16,
                  borderBottom: '1px solid var(--color-border-subtle)',
                  gap: 8, background: 'var(--color-accent-bg)',
                }}>
                  <div style={{ width: 15, flexShrink: 0 }} />
                  <div style={{ width: 18, flexShrink: 0 }} />
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--color-border-default)', flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={newRootTitle}
                    onChange={e => setNewRootTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddRoot()
                      if (e.key === 'Escape') { setAddingRoot(false); setNewRootTitle('') }
                    }}
                    placeholder="Nom de la tâche..."
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Entrée · Échap</span>
                </div>
              ) : (
                <button
                  onClick={() => setAddingRoot(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    height: 36, paddingLeft: 16, background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 13,
                    borderBottom: '1px solid var(--color-border-subtle)',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-secondary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                >
                  <Plus size={14} strokeWidth={1.5} /> Nouvelle tâche
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Generate Modal */}
      {showAiModal && (
        <AiGenerateModal
          projectId={projectId}
          onClose={() => setShowAiModal(false)}
          onImport={async (aiTasks) => {
            for (const aiTask of aiTasks) {
              const created = await onCreateTask({ title: aiTask.title }) as { id?: string } | undefined
              if (created && aiTask.children?.length) {
                const parentId = (created as { id?: string })?.id
                if (parentId) {
                  for (const child of aiTask.children) {
                    await onCreateTask({ title: child.title, parentId })
                  }
                }
              }
            }
            toast(`${aiTasks.length} tâche${aiTasks.length > 1 ? 's' : ''} importée${aiTasks.length > 1 ? 's' : ''}`)
          }}
        />
      )}

      {upgradeFeature && <UpgradeModal feature={upgradeFeature} onClose={() => setUpgradeFeature(null)} />}

      {/* Task drawer */}
      <TaskDrawer
        task={selectedTask}
        projectId={projectId}
        onClose={() => setSelectedTask(null)}
        onUpdate={async (id, data) => { await onUpdateTask(id, data); setSelectedTask(prev => prev ? { ...prev, ...data } : null) }}
        onDelete={onDeleteTask}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
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
          <select value={bulkStatusVal} onChange={e => { const v = e.target.value; if (v) { setBulkStatusVal(''); bulkStatus(v as TaskStatus) } }} disabled={bulkLoading} style={selectBtnBase}>
            <option value="" disabled>Statut…</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
          </select>
          <select value={bulkPriorityVal} onChange={e => { const v = e.target.value; if (v) { setBulkPriorityVal(''); bulkPriority(v as TaskPriority) } }} disabled={bulkLoading} style={selectBtnBase}>
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
          <button onClick={clearSelection} title="Annuler la sélection" style={{ width: 28, height: 28, background: 'none', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

              {taskAssignees.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Assigné à</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {taskAssignees.map(a => (
                      <label key={a.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={filterAssignees.has(a.userId)} onChange={() => toggleAssignee(a.userId)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-accent-default)' }} />
                        <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{a.name ?? a.userId.slice(0, 8) + '…'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {milestones.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Jalon</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {milestones.map(m => (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={filterMilestones.has(m.id)} onChange={() => toggleMilestone(m.id)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-accent-default)' }} />
                        <span style={{ fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {filterCount > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border-subtle)' }}>
                <button onClick={clearFilters} style={{ width: '100%', height: 34, background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-primary)' }}>
                  Réinitialiser ({filterCount})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
