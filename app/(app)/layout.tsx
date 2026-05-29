import { Sidebar } from "@/components/layout/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main
        style={{
          marginLeft: "var(--sidebar-width-expanded)",
          flex: 1,
          minHeight: "100vh",
          background: "var(--color-bg-tertiary)",
          transition: "margin-left 200ms var(--ease-default)",
        }}
      >
        {children}
      </main>
    </div>
  )
}
