"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  Route,
  Settings2,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  FolderKanban,
  CheckSquare,
  Menu,
  X,
} from "lucide-react"
import { Logo } from "@/components/logo"

const mainNavItems = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard, navAction: '' },
  { href: "/projets", label: "Projets", icon: FolderKanban, navAction: '' },
  { href: "/mes-taches", label: "Mes tâches", icon: CheckSquare, navAction: '' },
  { href: "/portefeuille", label: "Portefeuille", icon: Briefcase, navAction: 'nav.portefeuille' },
  { href: "/roadmap", label: "Roadmap", icon: Route, navAction: 'nav.roadmap' },
]

const bottomItems = [
  { href: "/notifications", label: "Notifications", icon: Bell, navAction: 'nav.notifications' },
  { href: "/parametres", label: "Paramètres", icon: Settings2, navAction: '' },
]

function useBreakpoint() {
  const [bp, setBp] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w < 768) setBp('mobile')
      else if (w < 1024) setBp('tablet')
      else setBp('desktop')
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return bp
}

export function Sidebar() {
  const bp = useBreakpoint()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const [navVisibility, setNavVisibility] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/me/nav')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setNavVisibility(data) })
      .catch(() => {})
  }, [])

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  const isNavVisible = (action: string) => {
    if (!action) return true
    if (!(action in navVisibility)) return true
    return navVisibility[action]
  }

  const allNavItems = [...mainNavItems, ...bottomItems].filter(item => isNavVisible(item.navAction))

  if (bp === 'mobile') {
    return (
      <>
        <BottomNav
          items={mainNavItems.filter(i => isNavVisible(i.navAction))}
          secondaryItems={bottomItems.filter(i => isNavVisible(i.navAction))}
          pathname={pathname}
          onMenuClick={() => setDrawerOpen(true)}
        />
        {drawerOpen && (
          <MobileDrawer
            items={allNavItems}
            pathname={pathname}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </>
    )
  }

  const isCollapsed = bp === 'tablet' ? true : collapsed

  return (
    <aside
      style={{
        width: isCollapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width-expanded)",
        transition: "width 200ms var(--ease-default)",
        background: "var(--color-bg-secondary)",
        borderRight: "1px solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 40,
        overflow: "hidden",
      }}
    >
      {/* Logo zone */}
      <div style={{
        height: 56,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: isCollapsed ? "center" : "space-between",
        borderBottom: "1px solid var(--color-border-subtle)",
        flexShrink: 0,
      }}>
        <Logo showWordmark={!isCollapsed} size={28} />
        {!isCollapsed && bp === 'desktop' && (
          <button
            onClick={() => { setCollapsed(true); localStorage.setItem('sidebar-collapsed', 'true'); window.dispatchEvent(new Event('sidebar-toggle')) }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 4, borderRadius: "var(--radius-md)" }}
            aria-label="Réduire la navigation"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Nav principale */}
      <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
        {!isCollapsed && (
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", padding: "8px 8px 4px" }}>
            Navigation
          </p>
        )}
        {mainNavItems.filter(item => isNavVisible(item.navAction)).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 36,
                padding: "0 12px",
                borderRadius: "var(--radius-md)",
                marginBottom: 2,
                color: isActive ? "var(--color-accent-default)" : "var(--color-text-secondary)",
                background: isActive ? "var(--color-accent-bg)" : "transparent",
                fontWeight: isActive ? 500 : 400,
                fontSize: 14,
                textDecoration: "none",
                transition: "all 150ms var(--ease-default)",
                boxShadow: isActive ? "inset 2px 0 0 var(--color-accent-default)" : "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <Icon size={18} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              {!isCollapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "8px 8px", borderTop: "1px solid var(--color-border-subtle)" }}>
        {bottomItems.filter(item => isNavVisible(item.navAction)).map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 36,
                padding: "0 12px",
                borderRadius: "var(--radius-md)",
                marginBottom: 2,
                color: isActive ? "var(--color-accent-default)" : "var(--color-text-secondary)",
                background: isActive ? "var(--color-accent-bg)" : "transparent",
                fontSize: 14,
                textDecoration: "none",
                transition: "all 150ms var(--ease-default)",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <Icon size={18} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              {!isCollapsed && item.label}
            </Link>
          )
        })}

        <ThemeToggle collapsed={isCollapsed} />

        {isCollapsed && bp === 'desktop' && (
          <button
            onClick={() => { setCollapsed(false); localStorage.setItem('sidebar-collapsed', 'false'); window.dispatchEvent(new Event('sidebar-toggle')) }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 36, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", borderRadius: "var(--radius-md)" }}
            aria-label="Développer la navigation"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
  navAction: string
}

function BottomNav({
  items,
  secondaryItems,
  pathname,
  onMenuClick,
}: {
  items: NavItem[]
  secondaryItems: NavItem[]
  pathname: string
  onMenuClick: () => void
}) {
  // Show up to 4 main items + "Menu" button
  const visibleItems = items.slice(0, 4)

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        background: "var(--color-bg-secondary)",
        borderTop: "1px solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "stretch",
        zIndex: 40,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              textDecoration: "none",
              color: isActive ? "var(--color-accent-default)" : "var(--color-text-tertiary)",
              minHeight: 44,
            }}
          >
            <Icon size={22} strokeWidth={1.5} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, lineHeight: 1 }}>
              {item.label.split(' ')[0]}
            </span>
          </Link>
        )
      })}
      <button
        onClick={onMenuClick}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-tertiary)",
          minHeight: 44,
        }}
        aria-label="Ouvrir le menu"
      >
        <Menu size={22} strokeWidth={1.5} />
        <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>Menu</span>
      </button>
    </nav>
  )
}

function MobileDrawer({
  items,
  pathname,
  onClose,
}: {
  items: NavItem[]
  pathname: string
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 50,
        }}
      />
      {/* Drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: "var(--color-bg-secondary)",
          borderRight: "1px solid var(--color-border-subtle)",
          zIndex: 51,
          display: "flex",
          flexDirection: "column",
          animation: "slideInDrawer 200ms var(--ease-default)",
        }}
      >
        <style>{`@keyframes slideInDrawer { from { transform: translateX(-100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ height: 56, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border-subtle)", flexShrink: 0 }}>
          <Logo showWordmark size={28} />
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 4, borderRadius: "var(--radius-md)" }}
            aria-label="Fermer le menu"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px", overflowY: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", padding: "8px 8px 4px" }}>
            Navigation
          </p>
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 44,
                  padding: "0 12px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: 2,
                  color: isActive ? "var(--color-accent-default)" : "var(--color-text-secondary)",
                  background: isActive ? "var(--color-accent-bg)" : "transparent",
                  fontWeight: isActive ? 500 : 400,
                  fontSize: 15,
                  textDecoration: "none",
                  transition: "all 150ms var(--ease-default)",
                  boxShadow: isActive ? "inset 2px 0 0 var(--color-accent-default)" : "none",
                }}
              >
                <Icon size={19} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: "8px", borderTop: "1px solid var(--color-border-subtle)" }}>
          <ThemeToggle collapsed={false} />
        </div>
      </aside>
    </>
  )
}

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored === "dark" || stored === "light") {
      setTheme(stored)
    } else {
      setTheme("system")
    }
  }, [])

  const applyTheme = (next: "light" | "dark" | "system") => {
    const html = document.documentElement
    if (next === "dark") {
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else if (next === "light") {
      html.classList.remove("dark")
      localStorage.setItem("theme", "light")
    } else {
      localStorage.removeItem("theme")
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      html.classList.toggle("dark", prefersDark)
    }
    setTheme(next)
  }

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    applyTheme(next)
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor
  const label = theme === "dark" ? "Mode sombre" : theme === "light" ? "Mode clair" : "Thème système"

  return (
    <button
      onClick={cycleTheme}
      title={collapsed ? label : undefined}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 36,
        padding: "0 12px",
        borderRadius: "var(--radius-md)",
        marginBottom: 2,
        color: "var(--color-text-tertiary)",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 14,
        width: "100%",
        transition: "all 150ms",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <Icon size={18} strokeWidth={1.5} style={{ flexShrink: 0 }} />
      {!collapsed && label}
    </button>
  )
}
