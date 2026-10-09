'use client'

import { X, Sparkles, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
  feature: string        // libellé de la feature bloquée
  onClose: () => void
}

export function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const router = useRouter()

  const goToPricing = () => {
    onClose()
    router.push('/tarifs')
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 401, width: 440, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Gradient header */}
        <div style={{ background: 'linear-gradient(135deg, #1D3461 0%, #2a4a8a 100%)', padding: '28px 24px 24px', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', display: 'flex', padding: 6 }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} strokeWidth={1.5} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Fonctionnalité Pro</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Passez à un plan supérieur pour débloquer</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{feature}</strong> n&apos;est pas disponible dans votre plan actuel (Gratuit).
            Passez au plan <strong style={{ color: 'var(--color-text-primary)' }}>Pro</strong> ou <strong style={{ color: 'var(--color-text-primary)' }}>Business</strong> pour y accéder.
          </p>

          {/* Aperçu des plans */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { name: 'Pro', price: '15 €/mois', features: ['IA complète', 'Illimité projets', '20 membres', 'GitHub sync'] },
              { name: 'Business', price: '49 €/mois', features: ['Tout Pro inclus', 'Membres illimités', 'Support prioritaire'] },
            ].map(p => (
              <div key={p.name} style={{ flex: 1, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{p.name}</p>
                <p style={{ fontSize: 13, color: 'var(--color-accent-default)', fontWeight: 500, marginBottom: 8 }}>{p.price}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      <Sparkles size={10} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, height: 38, background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>
              Pas maintenant
            </button>
            <button onClick={goToPricing} style={{ flex: 2, height: 38, background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Sparkles size={13} strokeWidth={1.5} /> Voir les tarifs
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
