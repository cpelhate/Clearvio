'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, AlertTriangle, Clock, AlertCircle, CheckCheck } from 'lucide-react'

interface DbNotification {
  id: string
  type: string
  title: string
  message: string
  projectId: string | null
  taskId: string | null
  isRead: boolean
  createdAt: string
}

interface ComputedAlert {
  id: string
  type: string
  title: string
  message: string
  projectId: string
  projectName: string
  date: string
  severity: 'warning' | 'danger'
  isRead: false
}

type NotificationItem = DbNotification | ComputedAlert

function isComputed(n: NotificationItem): n is ComputedAlert {
  return 'severity' in n && 'projectName' in n
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 0) {
    const days = Math.ceil(-diff / 86400000)
    return days === 1 ? 'demain' : `dans ${days} j`
  }
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} j`
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  project_late: <AlertCircle size={15} strokeWidth={1.5} />,
  milestone_overdue: <AlertTriangle size={15} strokeWidth={1.5} />,
  milestone_due: <Clock size={15} strokeWidth={1.5} />,
  task_overdue: <AlertTriangle size={15} strokeWidth={1.5} />,
  task_due: <Clock size={15} strokeWidth={1.5} />,
  TASK_ASSIGNED: <Bell size={15} strokeWidth={1.5} />,
  COMMENT_POSTED: <Bell size={15} strokeWidth={1.5} />,
}

export function NotificationsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications')
      .then(r => r.ok ? r.json() : { items: [], unreadCount: 0 })
      .then(data => {
        setItems(data.items ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      })
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function dismissNotification(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    })
    fetchNotifications()
  }

  async function markAllRead() {
    const unreadDb = items.filter(n => !isComputed(n) && !n.isRead) as DbNotification[]
    await Promise.all(unreadDb.map(n =>
      fetch(`/api/notifications/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
    ))
    fetchNotifications()
  }

  function handleNotifClick(n: NotificationItem) {
    setOpen(false)
    const projectId = isComputed(n) ? n.projectId : n.projectId
    if (projectId) router.push(`/projets/${projectId}`)
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'var(--color-bg-secondary)' : 'none',
          border: 'none', cursor: 'pointer',
          color: open ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          padding: 8, borderRadius: 'var(--radius-md)',
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms',
        }}
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 'var(--radius-full)',
            background: 'var(--color-danger-default)', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            border: '2px solid var(--color-bg-primary)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed',
          top: 56,
          right: 16,
          width: 360,
          maxHeight: 'calc(100vh - 80px)',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {items.length > 0 && (
                <button
                  onClick={markAllRead}
                  title="Tout marquer comme lu"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center' }}
                >
                  <CheckCheck size={15} strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center' }}
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Bell size={28} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Aucune notification</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>Tout est à jour.</p>
              </div>
            ) : (
              items.map(n => {
                const isDb = !isComputed(n)
                const severity = isComputed(n) ? n.severity : (n.type === 'project_late' || n.type === 'task_overdue' || n.type === 'milestone_overdue' ? 'danger' : 'warning')
                const dateStr = isComputed(n) ? n.date : n.createdAt
                const subtitle = isComputed(n) ? n.projectName : undefined
                const isUnread = !n.isRead

                return (
                  <div
                    key={n.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      background: isUnread ? 'var(--color-accent-subtle)' : 'transparent',
                      display: 'flex',
                      alignItems: 'flex-start',
                    }}
                  >
                    <button
                      onClick={() => handleNotifClick(n)}
                      style={{
                        flex: 1, textAlign: 'left', background: 'none', border: 'none',
                        padding: '12px 12px 12px 16px', cursor: 'pointer',
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: severity === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                        color: severity === 'danger' ? 'var(--color-danger-default)' : 'var(--color-warning-default)',
                      }}>
                        {TYPE_ICONS[n.type] ?? <Bell size={15} strokeWidth={1.5} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: '0 0 2px', lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {subtitle && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{subtitle}</span>}
                          {subtitle && <span style={{ fontSize: 11, color: 'var(--color-text-disabled)' }}>·</span>}
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                            {formatDate(dateStr)}
                          </span>
                        </div>
                      </div>
                    </button>
                    {isDb && (
                      <button
                        onClick={() => dismissNotification(n.id)}
                        title="Marquer comme lu"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--color-text-tertiary)', padding: '14px 12px 14px 4px',
                          display: 'flex', alignItems: 'center', flexShrink: 0,
                        }}
                      >
                        <X size={13} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
