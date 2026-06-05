'use client'

import { useState } from 'react'
import { Plus, ChevronRight, ChevronDown, Flag } from 'lucide-react'
import { Task, TaskStatus, TASK_STATUS_COLORS, TASK_STATUS_BG, TASK_PRIORITY_COLORS } from '@/types/task'
import { TaskDrawer } from './task-drawer'

interface TaskListViewProps {
  tasks: Task[]
  projectId: string
  onCreateTask: (data: { title: string; parentId?: string }) => Promise<unknown>
  onUpdateTask: (id: string, data: Partial<Task>) => Promise<unknown>
  onDeleteTask: (id: string) => Promise<unknown>
}

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
}

function TaskRow({ task, depth, onSelect, onCreateChild, onStatusChange, addingChildOf, onAddChild, onCancelAdd }: TaskRowProps) {
  const [expanded, setExpanded] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const hasChildren = (task.children?.length ?? 0) > 0
  const overdue = isOverdue(task.dueDate, task.status)

  return (
    <>
      <div
        style={{
          display: 'flex', alignItems: 'center',
          height: 40, paddingLeft: 16 + depth * 24,
          paddingRight: 16,
          borderBottom: '1px solid var(--color-border-subtle)',
          cursor: 'pointer', gap: 8,
          transition: 'background 80ms',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-secondary)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
      >
        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-tertiary)', flexShrink: 0, opacity: hasChildren ? 1 : 0, pointerEvents: hasChildren ? 'auto' : 'none' }}
        >
          {expanded ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
        </button>

        {/* Statut dot */}
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

        {/* Titre */}
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

        {/* Priorité */}
        {task.priority !== 'NORMALE' && (
          <Flag size={13} strokeWidth={1.5} style={{ color: TASK_PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
        )}

        {/* Date */}
        {task.dueDate && (
          <span style={{ fontSize: 12, color: overdue ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Ajouter sous-tâche */}
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

      {/* Inline add child */}
      {addingChildOf === task.id && (
        <div style={{
          display: 'flex', alignItems: 'center', height: 40,
          paddingLeft: 16 + (depth + 1) * 24, paddingRight: 16,
          borderBottom: '1px solid var(--color-border-subtle)',
          gap: 8, background: 'var(--color-accent-bg)',
        }}>
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
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Entrée pour valider · Échap pour annuler</span>
        </div>
      )}

      {/* Children */}
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
        />
      ))}
    </>
  )
}

export function TaskListView({ tasks, projectId: _projectId, onCreateTask, onUpdateTask, onDeleteTask }: TaskListViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null)
  const [newRootTitle, setNewRootTitle] = useState('')
  const [addingRoot, setAddingRoot] = useState(false)

  const tree = buildTree(tasks) as (Task & { children: Task[] })[]

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await onUpdateTask(id, { status })
    if (selectedTask?.id === id) setSelectedTask(prev => prev ? { ...prev, status } : null)
  }

  const handleAddChild = async (parentId: string, title: string) => {
    await onCreateTask({ title, parentId })
    setAddingChildOf(null)
  }

  const handleAddRoot = async () => {
    if (!newRootTitle.trim()) return
    await onCreateTask({ title: newRootTitle.trim() })
    setNewRootTitle('')
    setAddingRoot(false)
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 400 }}>
      {/* Table */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* Header tableau */}
        <div style={{
          display: 'flex', alignItems: 'center', height: 36,
          paddingLeft: 64, paddingRight: 16,
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-default)',
        }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-tertiary)' }}>
            Tâche
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-tertiary)', width: 80, textAlign: 'right' }}>
            Échéance
          </span>
        </div>

        {/* Rows */}
        <div>
          {tasks.length === 0 && !addingRoot ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucune tâche</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Commencez par créer votre première tâche.</p>
              <button
                onClick={() => setAddingRoot(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
                  background: 'var(--color-accent-default)', border: 'none',
                  borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', color: '#fff',
                }}
              >
                <Plus size={14} strokeWidth={1.5} /> Nouvelle tâche
              </button>
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
                />
              ))}

              {/* Inline add root */}
              {addingRoot ? (
                <div style={{
                  display: 'flex', alignItems: 'center', height: 40,
                  paddingLeft: 54, paddingRight: 16,
                  borderBottom: '1px solid var(--color-border-subtle)',
                  gap: 8, background: 'var(--color-accent-bg)',
                }}>
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

      {/* Drawer */}
      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={async (id, data) => { await onUpdateTask(id, data); setSelectedTask(prev => prev ? { ...prev, ...data } : null) }}
        onDelete={onDeleteTask}
      />
    </div>
  )
}
