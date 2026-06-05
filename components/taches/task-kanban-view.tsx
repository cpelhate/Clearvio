'use client'

import { useState } from 'react'
import { Plus, Flag, Calendar } from 'lucide-react'
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_COLORS } from '@/types/task'
import { TaskDrawer } from './task-drawer'

interface TaskKanbanViewProps {
  tasks: Task[]
  onCreateTask: (data: { title: string; status?: TaskStatus }) => Promise<unknown>
  onUpdateTask: (id: string, data: Partial<Task>) => Promise<unknown>
  onDeleteTask: (id: string) => Promise<unknown>
}

const COLUMNS: TaskStatus[] = ['A_FAIRE', 'EN_COURS', 'EN_REVUE', 'TERMINE', 'BLOQUE']

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function isOverdue(d: string | null, status: TaskStatus) {
  if (!d || status === 'TERMINE') return false
  return new Date(d) < new Date()
}

export function TaskKanbanView({ tasks, onCreateTask, onUpdateTask, onDeleteTask }: TaskKanbanViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [addingIn, setAddingIn] = useState<TaskStatus | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)

  const rootTasks = tasks.filter(t => !t.parentId)
  const byStatus = (status: TaskStatus) => rootTasks.filter(t => t.status === status)

  const handleDrop = async (status: TaskStatus) => {
    if (!draggedId) return
    await onUpdateTask(draggedId, { status })
    setDraggedId(null)
    setDragOverCol(null)
  }

  const handleAdd = async (status: TaskStatus) => {
    if (!newTitle.trim()) return
    await onCreateTask({ title: newTitle.trim(), status })
    setNewTitle('')
    setAddingIn(null)
  }

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, height: '100%' }}>
      {COLUMNS.map(status => {
        const colTasks = byStatus(status)
        const isOver = dragOverCol === status

        return (
          <div
            key={status}
            onDragOver={e => { e.preventDefault(); setDragOverCol(status) }}
            onDrop={() => handleDrop(status)}
            onDragLeave={() => setDragOverCol(null)}
            style={{
              flex: '0 0 280px', display: 'flex', flexDirection: 'column',
              background: isOver ? 'var(--color-accent-bg)' : 'var(--color-bg-secondary)',
              border: `1px solid ${isOver ? 'var(--color-accent-default)' : 'var(--color-border-subtle)'}`,
              borderRadius: 'var(--radius-lg)', padding: 12,
              maxHeight: 'calc(100vh - 260px)', transition: 'all 150ms',
            }}
          >
            {/* Header colonne */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: TASK_STATUS_COLORS[status],
                }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {TASK_STATUS_LABELS[status]}
                </span>
                <span style={{
                  fontSize: 11, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                  background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)',
                }}>
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => { setAddingIn(status); setNewTitle('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4, borderRadius: 'var(--radius-sm)' }}
              >
                <Plus size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {colTasks.map(task => {
                const overdue = isOverdue(task.dueDate, task.status)
                const childCount = tasks.filter(t => t.parentId === task.id).length
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggedId(task.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverCol(null) }}
                    onClick={() => setSelectedTask(task)}
                    style={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px', cursor: 'pointer',
                      opacity: draggedId === task.id ? 0.5 : 1,
                      transition: 'all 150ms',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
                  >
                    <p style={{
                      fontSize: 13, color: 'var(--color-text-primary)',
                      marginBottom: 8, lineHeight: 1.5,
                      textDecoration: task.status === 'TERMINE' ? 'line-through' : 'none',
                      opacity: task.status === 'TERMINE' ? 0.6 : 1,
                    }}>
                      {task.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.priority !== 'NORMALE' && (
                        <Flag size={12} strokeWidth={1.5} style={{ color: TASK_PRIORITY_COLORS[task.priority] }} />
                      )}
                      {task.dueDate && (
                        <span style={{ fontSize: 11, color: overdue ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={11} strokeWidth={1.5} />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {childCount > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                          {childCount} sous-tâche{childCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Ajout inline */}
              {addingIn === status && (
                <div style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-accent-default)',
                  borderRadius: 'var(--radius-md)', padding: '8px 12px',
                }}>
                  <textarea
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(status) }
                      if (e.key === 'Escape') { setAddingIn(null); setNewTitle('') }
                    }}
                    placeholder="Titre de la tâche..."
                    rows={2}
                    style={{
                      width: '100%', resize: 'none', background: 'none',
                      border: 'none', outline: 'none', fontSize: 13,
                      color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)',
                      lineHeight: 1.5,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      onClick={() => handleAdd(status)}
                      style={{
                        height: 26, padding: '0 10px', background: 'var(--color-accent-default)',
                        border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12,
                        fontWeight: 500, cursor: 'pointer', color: '#fff',
                      }}
                    >
                      Ajouter
                    </button>
                    <button
                      onClick={() => { setAddingIn(null); setNewTitle('') }}
                      style={{
                        height: 26, padding: '0 10px', background: 'none',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-sm)', fontSize: 12,
                        cursor: 'pointer', color: 'var(--color-text-secondary)',
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

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
