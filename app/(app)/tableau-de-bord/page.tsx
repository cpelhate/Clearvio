import { Header } from "@/components/layout/header"

export default function TableauDeBordPage() {
  return (
    <>
      <Header title="Tableau de bord" />
      <div style={{ padding: "var(--space-10)" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 16,
          color: "var(--color-text-tertiary)",
        }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <p style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>Tableau de bord</p>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", textAlign: "center", maxWidth: 320 }}>
            Vos KPIs et indicateurs de projet apparaîtront ici. Commencez par créer votre premier projet.
          </p>
        </div>
      </div>
    </>
  )
}
