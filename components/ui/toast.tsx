'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  action?: { label: string; href: string }
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, options?: { duration?: number; action?: { label: string; href: string } }) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success', options?: { duration?: number; action?: { label: string; href: string } }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type, action: options?.action }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), options?.duration ?? 5000)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const icons = {
    success: <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: 'var(--color-success-default)', flexShrink: 0 }} />,
    error: <XCircle size={16} strokeWidth={1.5} style={{ color: 'var(--color-danger-default)', flexShrink: 0 }} />,
    info: <AlertCircle size={16} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)', flexShrink: 0 }} />,
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontSize: 14, color: 'var(--color-text-primary)',
            minWidth: 280, maxWidth: 400,
            pointerEvents: 'all',
            animation: 'slideInRight 200ms ease-out',
          }}>
            {icons[t.type]}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>{t.message}</span>
              {t.action && (
                <a href={t.action.href} style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent-default)', textDecoration: 'none' }}>
                  {t.action.label} →
                </a>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 2, display: 'flex', alignSelf: 'flex-start' }}>
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
