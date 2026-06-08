'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, AlertTriangle, Clock, AlertCircle, CheckCheck } from 'lucide-react'
import type { Notification } from '@/app/api/notifications/route'

const STORAGE_KEY = 'clearvio_notifications_seen_at'

function getSeenAt(): number {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0 } catch { return 0 }
}
function setSeenAt(ts: number) {
  try { localStorage.setItem(STORAGE_KEY, String(ts)) } catch {}
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

const TYPE_ICONS: Record<Notification['type'], React.ReactNode> = {
  project_late: <AlertCircle size={15} strokeWidth={1.5} />,
  milestone_overdue: <AlertTriangle size={15} strokeWidth={1.5} />,
  milestone_due: <Clock size={15} strokeWidth={1.5} />,
  task_overdue: <AlertTriangle size={15} strokeWidth={1.5} />,
  task_due: <Clock size={15} strokeWidth={1.5} />,
}

export function NotificationsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [seenAt, setSeenAtState] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSeenAtState(getSeenAt())
    fetch('/api/notifications')
      .then(r => r.ok ? r.json() : [])
      .then(setNotifications)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const unreadCount = notifications.filter(n => {
    const notifTs = new Date(n.date).getTime()
    return notifTs > seenAt || n.severity === 'danger'
  }).length

  function handleOpen() {
    setOpen(o => !o)
  }

  function markAllRead() {
    const ts = Date.now()
    setSeenAt(ts)
    setSeenAtState(ts)
  }

  function handleNotifClick(n: Notification) {
    setOpen(false)
    router.push(`/projets/${n.projectId}`)
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
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
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
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
          {/* Header */}
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
              {notifications.length > 0 && (
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

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Bell size={28} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Aucune notification</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>Tout est à jour.</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    padding: '12px 16px', cursor: 'pointer',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {/* Icon */}
                  <div style={{
                    width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: n.severity === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                    color: n.severity === 'danger' ? 'var(--color-danger-default)' : 'var(--color-warning-default)',
                  }}>
                    {TYPE_ICONS[n.type]}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: '0 0 2px', lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{n.projectName}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-disabled)' }}>·</span>
                      <span style={{ fontSize: 11, color: n.severity === 'danger' ? 'var(--color-danger-default)' : 'var(--color-warning-default)' }}>
                        {formatDate(n.date)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
