'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Milestone, MILESTONE_STATUS_LABELS, MILESTONE_STATUS_COLORS, MILESTONE_STATUS_BG, DELIVERABLE_STATUS_LABELS } from '@/types/milestone'
import { TaskStatus, TASK_STATUS_LABELS } from '@/types/task'

interface MilestoneDetailModalProps {
  milestoneId: string | null
  projectId: string
  onClose: () => void
}

const TASK_STATUS_OPTIONS: TaskStatus[] = ['A_FAIRE', 'EN_COURS', 'EN_REVUE', 'TERMINE', 'BLOQUE']

export function MilestoneDetailModal({ milestoneId, projectId, onClose }: MilestoneDetailModalProps) {
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!milestoneId) return
    setLoading(true)
    fetch(`/api/projects/${projectId}/milestones`)
      .then(r => r.ok ? r.json() : [])
      .then((milestones: Milestone[]) => {
        setMilestone(milestones.find(m => m.id === milestoneId) ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [milestoneId, projectId])

  const handleTaskStatusChange = async (taskId: string, status: string) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok && milestone) {
      setMilestone(prev => {
        if (!prev) return prev
        return {
          ...prev,
          tasks: prev.tasks?.map(t => t.id === taskId ? { ...t, status: status as TaskStatus } : t),
        }
      })
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-text-tertiary)',
    borderBottom: '1px solid var(--color-border-subtle)',
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    borderBottom: '1px solid var(--color-border-subtle)',
    verticalAlign: 'middle',
  }

  const selectStyle: React.CSSProperties = {
    height: 28,
    padding: '0 6px',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    fontFamily: 'var(--font-primary)',
    cursor: 'pointer',
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--color-surface, var(--color-bg-elevated))',
        borderRadius: 'var(--radius-lg)',
        maxWidth: 800,
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 201,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)', position: 'sticky', top: 0, background: 'var(--color-surface, var(--color-bg-elevated))', zIndex: 1 }}>
          {loading || !milestone ? (
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Chargement…</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {milestone.title}
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: MILESTONE_STATUS_BG[milestone.status], color: MILESTONE_STATUS_COLORS[milestone.status], flexShrink: 0 }}>
                {MILESTONE_STATUS_LABELS[milestone.status]}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                {formatDate(milestone.plannedDate)}
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 6, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {!loading && milestone && (
          <div style={{ padding: '24px' }}>
            {/* Tasks table */}
            {(milestone.tasks?.length ?? 0) > 0 && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px 0' }}>
                  Tâches ({milestone.tasks!.length})
                </p>
                <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Titre', 'Statut', 'Échéance'].map(col => (
                          <th key={col} style={thStyle}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {milestone.tasks!.map((task, idx) => (
                        <tr key={task.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--color-bg-primary)' }}>
                          <td style={{ ...tdStyle, maxWidth: 300 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {task.title}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <select
                              value={task.status}
                              onChange={e => handleTaskStatusChange(task.id, e.target.value)}
                              style={selectStyle}
                            >
                              {TASK_STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                            {formatDate(task.dueDate ?? null)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Deliverables table */}
            {(milestone.deliverables?.length ?? 0) > 0 && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px 0' }}>
                  Livrables ({milestone.deliverables!.length})
                </p>
                <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Titre', 'Statut', 'Tâche liée'].map(col => (
                          <th key={col} style={thStyle}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {milestone.deliverables!.map((d, idx) => (
                        <tr key={d.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--color-bg-primary)' }}>
                          <td style={{ ...tdStyle, maxWidth: 300 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {d.title}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 12 }}>{DELIVERABLE_STATUS_LABELS[d.status]}</span>
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>
                            {d.task?.title ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(milestone.tasks?.length ?? 0) === 0 && (milestone.deliverables?.length ?? 0) === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14, padding: '16px 0' }}>
                Aucune tâche ni livrable associé à ce jalon.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
