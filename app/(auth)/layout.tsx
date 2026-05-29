import { Logo } from "@/components/logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--color-bg-tertiary)", padding: 16 }}>
      <div style={{ marginBottom: 32 }}>
        <Logo size={36} />
      </div>
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: "var(--radius-xl)",
        padding: 32,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        {children}
      </div>
    </div>
  )
}
