"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"
import { Logo } from "@/components/logo"

const navItems = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/projets", label: "Projets", icon: FolderKanban },
  { href: "/portefeuille", label: "Portefeuille", icon: Briefcase },
  { href: "/roadmap", label: "Roadmap", icon: Route },
]

const bottomItems = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/parametres", label: "Paramètres", icon: Settings2 },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width-expanded)",
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
      <div style={{ height: 56, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", borderBottom: "1px solid var(--color-border-subtle)", flexShrink: 0 }}>
        <Logo showWordmark={!collapsed} size={28} />
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 4, borderRadius: "var(--radius-md)" }}
            aria-label="Réduire la navigation"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Nav principale */}
      <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
        {!collapsed && (
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", padding: "8px 8px 4px" }}>
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
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
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "8px 8px", borderTop: "1px solid var(--color-border-subtle)" }}>
        {bottomItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
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
              {!collapsed && item.label}
            </Link>
          )
        })}

        {/* Toggle dark mode */}
        <ThemeToggle collapsed={collapsed} />

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
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

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    setTheme(next)
    if (next === "dark") {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else if (next === "light") {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    } else {
      localStorage.removeItem("theme")
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      document.documentElement.classList.toggle("dark", prefersDark)
    }
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <button
      onClick={cycleTheme}
      title={collapsed ? "Thème" : undefined}
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
      {!collapsed && (theme === "dark" ? "Mode sombre" : theme === "light" ? "Mode clair" : "Thème système")}
    </button>
  )
}
