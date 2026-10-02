'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Bell, AlertTriangle, Clock, AlertCircle, CheckCheck, MessageSquare, UserCheck } from 'lucide-react'
import type { DbNotification, ComputedAlert } from '@/app/api/notifications/route'

type AnyNotif = DbNotification | ComputedAlert

function isComputed(n: AnyNotif): n is ComputedAlert {
  return 'date' in n
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 0) {
    const days = Math.ceil(-diff / 86400000)
    return days === 1 ? 'demain' : `dans ${days} jour${days > 1 ? 's' : ''}`
  }
  const days = Math.floor(diff / 86400000)
  if (days === 0) {
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `il y a ${mins} min`
    return `il y a ${Math.floor(mins / 60)}h`
  }
  if (days === 1) return 'hier'
  return `il y a ${days} jour${days > 1 ? 's' : ''}`
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  project_late: <AlertCircle size={18} strokeWidth={1.5} />,
  milestone_overdue: <AlertTriangle size={18} strokeWidth={1.5} />,
  milestone_due: <Clock size={18} strokeWidth={1.5} />,
  task_overdue: <AlertTriangle size={18} strokeWidth={1.5} />,
  task_due: <Clock size={18} strokeWidth={1.5} />,
  TASK_ASSIGNED: <UserCheck size={18} strokeWidth={1.5} />,
  COMMENT_POSTED: <MessageSquare size={18} strokeWidth={1.5} />,
}

const TYPE_LABELS: Record<string, string> = {
  project_late: 'Projet en retard',
  milestone_overdue: 'Jalon dépassé',
  milestone_due: 'Jalon à venir',
  task_overdue: 'Tâche en retard',
  task_due: 'Tâche à rendre',
  TASK_ASSIGNED: 'Assignation',
  COMMENT_POSTED: 'Commentaire',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<AnyNotif[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  function load() {
    fetch('/api/notifications')
      .then(r => r.ok ? r.json() : { items: [], unreadCount: 0 })
      .then((data) => {
        setItems(data.items ?? [])
        setUnreadCount(data.unreadCount ?? 0)
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  async function markAllRead() {
    const unread = items.filter(n => !isComputed(n) && !n.isRead) as DbNotification[]
    await Promise.all(unread.map(n =>
      fetch(`/api/notifications/${n.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) })
    ))
    load()
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) })
    load()
  }

  function getSeverity(n: AnyNotif): 'danger' | 'warning' | 'info' {
    if (isComputed(n)) return n.severity
    if (n.type === 'TASK_ASSIGNED' || n.type === 'COMMENT_POSTED') return 'info'
    return n.severity ?? 'warning'
  }

  function getDate(n: AnyNotif): string {
    return isComputed(n) ? n.date : n.createdAt
  }

  function getProjectId(n: AnyNotif): string | null {
    return n.projectId ?? null
  }

  const severityColors = {
    danger: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-default)' },
    warning: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-default)' },
    info: { bg: 'var(--color-accent-subtle)', text: 'var(--color-accent-default)' },
  }

  return (
    <>
      <Header title="Notifications" />
      <div style={{ padding: 'var(--space-10)', maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
              Notifications
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={markAllRead}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 34, padding: '0 14px',
                background: 'transparent', border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              <CheckCheck size={14} strokeWidth={1.5} />
              Tout marquer comme lu
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 72, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Bell size={28} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>Aucune notification</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Tout est à jour. Revenez vérifier régulièrement.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {items.map((n, idx) => {
              const severity = getSeverity(n)
              const colors = severityColors[severity]
              const isUnread = isComputed(n) ? true : !n.isRead
              return (
                <div
                  key={n.id}
                  style={{
                    borderBottom: idx < items.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    padding: '14px 20px',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    background: isUnread ? 'var(--color-accent-subtle)' : 'transparent',
                    opacity: isComputed(n) ? 1 : (n.isRead ? 0.6 : 1),
                  }}
                >
                  <div
                    onClick={() => { const pid = getProjectId(n); if (pid) router.push(`/projets/${pid}`) }}
                    style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, cursor: getProjectId(n) ? 'pointer' : 'default' }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 'var(--radius-md)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: colors.bg, color: colors.text,
                    }}>
                      {TYPE_ICONS[n.type] ?? <Bell size={18} strokeWidth={1.5} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <p style={{ fontSize: 14, color: 'var(--color-text-primary)', margin: '0 0 4px', fontWeight: isUnread ? 500 : 400 }}>
                          {n.message}
                        </p>
                        <span style={{
                          fontSize: 11, fontWeight: 500, flexShrink: 0,
                          padding: '2px 8px', borderRadius: 'var(--radius-full)',
                          background: colors.bg, color: colors.text,
                        }}>
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {isComputed(n) && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{n.projectName}</span>}
                        <span style={{ fontSize: 12, color: 'var(--color-text-disabled)' }}>·</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{formatDate(getDate(n))}</span>
                      </div>
                    </div>
                  </div>
                  {!isComputed(n) && !n.isRead && (
                    <button
                      onClick={() => dismiss(n.id)}
                      title="Marquer comme lu"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '2px 4px', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
