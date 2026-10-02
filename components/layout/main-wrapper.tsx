"use client"

import { useEffect, useState } from "react"

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarState, setSidebarState] = useState<'expanded' | 'collapsed' | 'mobile'>('expanded')

  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w < 768) {
        setSidebarState('mobile')
      } else if (w < 1024) {
        setSidebarState('collapsed')
      } else {
        // On desktop, listen for the sidebar collapse via localStorage
        const stored = localStorage.getItem('sidebar-collapsed')
        setSidebarState(stored === 'true' ? 'collapsed' : 'expanded')
      }
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('sidebar-toggle', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('sidebar-toggle', update)
    }
  }, [])

  const marginLeft =
    sidebarState === 'mobile' ? 0
    : sidebarState === 'collapsed' ? 'var(--sidebar-width-collapsed)'
    : 'var(--sidebar-width-expanded)'

  const paddingBottom = sidebarState === 'mobile'
    ? 'calc(56px + env(safe-area-inset-bottom, 0px))'
    : undefined

  return (
    <main
      style={{
        flex: 1,
        minHeight: '100vh',
        background: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-primary)',
        transition: 'margin-left 200ms var(--ease-default)',
        marginLeft,
        paddingBottom,
      }}
    >
      {children}
    </main>
  )
}
