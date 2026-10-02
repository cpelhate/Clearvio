'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { NotificationsButton } from '@/components/notifications/notifications-panel'
import { SearchModal } from '@/components/search/search-modal'

interface HeaderProps {
  title: string
  breadcrumbs?: { label: string; href?: string }[]
}

export function Header({ title, breadcrumbs = [] }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-10)',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
      className="surface-glass"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>{crumb.label}</span>
            {i < breadcrumbs.length - 1 && <span style={{ color: 'var(--color-text-disabled)' }}>/</span>}
          </span>
        ))}
        <h1 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {title}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setSearchOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 8, borderRadius: 'var(--radius-md)' }}
          aria-label="Rechercher"
        >
          <Search size={18} strokeWidth={1.5} />
        </button>
        <NotificationsButton />
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
