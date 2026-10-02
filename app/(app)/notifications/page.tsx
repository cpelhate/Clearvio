'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Bell, AlertTriangle, Clock, AlertCircle, CheckCheck } from 'lucide-react'
import type { DbNotification as Notification } from '@/app/api/notifications/route'

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
    return days === 1 ? 'demain' : `dans ${days} jour${days > 1 ? 's' : ''}`
  }
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} jour${days > 1 ? 's' : ''}`
}

const TYPE_ICONS: Record<Notification['type'], React.ReactNode> = {
  project_late: <AlertCircle size={18} strokeWidth={1.5} />,
  milestone_overdue: <AlertTriangle size={18} strokeWidth={1.5} />,
  milestone_due: <Clock size={18} strokeWidth={1.5} />,
  task_overdue: <AlertTriangle size={18} strokeWidth={1.5} />,
  task_due: <Clock size={18} strokeWidth={1.5} />,
}

const TYPE_LABELS: Record<Notification['type'], string> = {
  project_late: 'Projet en retard',
  milestone_overdue: 'Jalon dépassé',
  milestone_due: 'Jalon à venir',
  task_overdue: 'Tâche en retard',
  task_due: 'Tâche à rendre',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [seenAt, setSeenAtState] = useState(0)

  useEffect(() => {
    setSeenAtState(getSeenAt())
    fetch('/api/notifications')
      .then(r => r.ok ? r.json() : [])
      .then((data) => { setNotifications(data); setLoading(false) })
  }, [])

  function markAllRead() {
    const ts = Date.now()
    setSeenAt(ts)
    setSeenAtState(ts)
  }

  const unreadCount = notifications.filter(n => new Date(n.date).getTime() > seenAt || n.severity === 'danger').length

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
              {unreadCount > 0 ? `${unreadCount} alerte${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
            </p>
          </div>
          {notifications.length > 0 && (
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
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Bell size={28} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>Aucune notification</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Tout est à jour. Revenez vérifier régulièrement.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {notifications.map((n, idx) => (
              <button
                key={n.id}
                onClick={() => router.push(`/projets/${n.projectId}`)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  borderBottom: idx < notifications.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  padding: '16px 20px', cursor: 'pointer',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: n.severity === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                  color: n.severity === 'danger' ? 'var(--color-danger-default)' : 'var(--color-warning-default)',
                }}>
                  {TYPE_ICONS[n.type]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <p style={{ fontSize: 14, color: 'var(--color-text-primary)', margin: '0 0 4px', fontWeight: 500 }}>
                      {n.message}
                    </p>
                    <span style={{
                      fontSize: 11, fontWeight: 500, flexShrink: 0,
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      background: n.severity === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                      color: n.severity === 'danger' ? 'var(--color-danger-default)' : 'var(--color-warning-default)',
                    }}>
                      {TYPE_LABELS[n.type]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{n.projectName}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-disabled)' }}>·</span>
                    <span style={{ fontSize: 12, color: n.severity === 'danger' ? 'var(--color-danger-default)' : 'var(--color-warning-default)', fontWeight: 500 }}>
                      {formatDate(n.date)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
