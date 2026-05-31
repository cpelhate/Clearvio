'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LayoutDashboard } from 'lucide-react'

export default function TableauDeBordPage() {
  const router = useRouter()

  // Setup automatique de l'organisation si l'utilisateur vient de s'inscrire
  useEffect(() => {
    fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(() => router.refresh())
  }, [router])

  return (
    <>
      <Header title="Tableau de bord" />
      <div style={{ padding: 'var(--space-10)' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 400, gap: 16,
        }}>
          <LayoutDashboard size={48} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            Tableau de bord
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 320 }}>
            Vos KPIs et indicateurs de projet apparaîtront ici. Commencez par créer votre premier projet.
          </p>
        </div>
      </div>
    </>
  )
}
