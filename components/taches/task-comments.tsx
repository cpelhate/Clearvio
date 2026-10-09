'use client'

import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'

interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
}

interface TaskCommentsProps {
  projectId: string
  taskId: string
  currentUserId: string
}

function formatCommentDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  if (isToday) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function Avatar({ userId, isCurrentUser }: { userId: string; isCurrentUser: boolean }) {
  const initials = isCurrentUser ? 'V' : userId.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'var(--color-accent-bg)',
      color: 'var(--color-accent-default)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export function TaskComments({ projectId, taskId, currentUserId }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setComments(data); setLoading(false) })
  }, [projectId, taskId])

  const handleSubmit = async () => {
    if (!newContent.trim() || submitting) return
    setSubmitting(true)
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    })
    if (res.ok) {
      const created = await res.json()
      setComments(prev => [...prev, created])
      setNewContent('')
    }
    setSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
  }

  const startEdit = (comment: TaskComment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const saveEdit = async (commentId: string) => {
    if (!editContent.trim()) return
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    })
    if (res.ok) {
      const updated = await res.json()
      setComments(prev => prev.map(c => c.id === commentId ? updated : c))
      setEditingId(null)
      setEditContent('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div style={{ marginTop: 32 }}>
      {/* Header */}
      <div style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--color-text-tertiary)', marginBottom: 16,
      }}>
        Commentaires {!loading && `(${comments.length})`}
      </div>

      {/* Liste commentaires */}
      <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-bg-secondary)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, background: 'var(--color-bg-secondary)', borderRadius: 4, marginBottom: 8, width: '30%' }} />
                  <div style={{ height: 40, background: 'var(--color-bg-secondary)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
            Aucun commentaire — Soyez le premier à commenter.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comments.map(comment => {
              const isOwner = comment.userId === currentUserId
              const isEditing = editingId === comment.id
              return (
                <div key={comment.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar userId={comment.userId} isCurrentUser={isOwner} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {isOwner ? 'Vous' : comment.userId.slice(0, 8)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {formatCommentDate(comment.createdAt)}
                        </span>
                        {isOwner && !isEditing && (
                          <>
                            <button
                              onClick={() => startEdit(comment)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}
                              title="Modifier"
                            >
                              <Pencil size={12} strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}
                              title="Supprimer"
                            >
                              <Trash2 size={12} strokeWidth={1.5} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div>
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={3}
                          className="form-textarea"
                          style={{ marginBottom: 8 }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => saveEdit(comment.id)} className="btn btn-primary btn-sm">
                            <Check size={12} strokeWidth={1.5} /> Sauvegarder
                          </button>
                          <button onClick={cancelEdit} className="btn btn-secondary btn-sm">
                            <X size={12} strokeWidth={1.5} /> Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <div>
        <textarea
          ref={textareaRef}
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Ajouter un commentaire... (Ctrl+Entrée pour envoyer)"
          className="form-textarea"
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSubmit}
            disabled={!newContent.trim() || submitting}
            className="btn btn-primary btn-sm"
          >
            {submitting ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}
