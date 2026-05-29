import { Header } from "@/components/layout/header"
import { FolderKanban } from "lucide-react"

export default function ProjetsPage() {
  return (
    <>
      <Header title="Projets" />
      <div style={{ padding: "var(--space-10)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
          <FolderKanban size={48} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)" }} />
          <p style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>Aucun projet</p>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", textAlign: "center", maxWidth: 320 }}>
            Créez votre premier projet pour démarrer.
          </p>
          <button style={{ height: 36, padding: "0 16px", background: "var(--color-accent-default)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            + Nouveau projet
          </button>
        </div>
      </div>
    </>
  )
}
