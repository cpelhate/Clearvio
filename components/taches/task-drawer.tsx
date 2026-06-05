'use client'

import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Task, TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@/types/task'

interface TaskDrawerProps {
  task: Task | null
  onClose: () => void
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<unknown>
  onDelete: (taskId: string) => Promise<unknown>
}

const STATUS_OPTIONS: TaskStatus[] = ['A_FAIRE', 'EN_COURS', 'EN_REVUE', 'TERMINE', 'BLOQUE']
const PRIORITY_OPTIONS: TaskPriority[] = ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE']

export function TaskDrawer({ task, onClose, onUpdate, onDelete }: TaskDrawerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setConfirmDelete(false)
    }
  }, [task])

  if (!task) return null

  const save = async (field: string, value: unknown) => {
    setSaving(true)
    await onUpdate(task.id, { [field]: value } as Partial<Task>)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await onDelete(task.id)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)', fontSize: 14,
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)', outline: 'none',
    fontFamily: 'var(--font-primary)',
  }

  const levelLabel = task.level === 0 ? 'Tâche' : task.level === 1 ? 'Sous-tâche' : 'Micro-tâche'

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.2)' }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: 480, background: 'var(--color-bg-elevated)',
        borderLeft: '1px solid var(--color-border-subtle)',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.10)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 220ms var(--ease-default)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {levelLabel}
            </span>
            {saving && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Sauvegarde...</span>}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={handleDelete}
              style={{
                background: confirmDelete ? 'var(--color-danger-bg)' : 'none',
                border: 'none', cursor: 'pointer', padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                color: confirmDelete ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)',
                fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Trash2 size={14} strokeWidth={1.5} />
              {confirmDelete ? 'Confirmer' : ''}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 6, borderRadius: 'var(--radius-md)' }}>
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Titre */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => title !== task.title && save('title', title)}
            style={{ ...inputStyle, fontSize: 17, fontWeight: 500, border: 'none', padding: '4px 0', borderRadius: 0, background: 'transparent', marginBottom: 20 }}
            placeholder="Titre de la tâche"
          />

          {/* Champs rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Statut */}
            <div>
              <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
                Statut
              </label>
              <select
                value={task.status}
                onChange={e => save('status', e.target.value)}
                style={{ ...inputStyle, height: 32, padding: '0 8px', fontSize: 13 }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            {/* Priorité */}
            <div>
              <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
                Priorité
              </label>
              <select
                value={task.priority}
                onChange={e => save('priority', e.target.value)}
                style={{ ...inputStyle, height: 32, padding: '0 8px', fontSize: 13, color: TASK_PRIORITY_COLORS[task.priority as TaskPriority] }}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>

            {/* Date d'échéance */}
            <div>
              <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
                Échéance
              </label>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                onChange={e => save('dueDate', e.target.value || null)}
                style={{ ...inputStyle, height: 32, padding: '0 8px', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => description !== (task.description || '') && save('description', description || null)}
              rows={6}
              placeholder="Ajoutez une description..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
