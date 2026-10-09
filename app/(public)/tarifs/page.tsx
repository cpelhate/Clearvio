'use client'

import { useState } from 'react'
import { Check, Sparkles, Github, FileText, Users, Shield, Zap } from 'lucide-react'
import Link from 'next/link'

interface Plan {
  name: string
  price: string
  description: string
  features: string[]
  cta: string
  priceId?: string
  highlighted: boolean
  badge?: string
}

const PLANS: Plan[] = [
  {
    name: 'Gratuit',
    price: '0 €',
    description: 'Pour démarrer et explorer Clearvio',
    highlighted: false,
    cta: 'Commencer gratuitement',
    features: [
      '3 projets maximum',
      '5 membres par organisation',
      'Tâches, jalons, risques',
      'Gantt, Kanban, Calendrier',
      'Rapports PDF',
    ],
  },
  {
    name: 'Pro',
    price: '15 €',
    description: 'Pour les équipes qui veulent aller plus loin',
    highlighted: true,
    badge: '7 jours gratuits',
    cta: 'Démarrer l\'essai gratuit',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    features: [
      'Projets illimités',
      '20 membres par organisation',
      'IA : génération de tâches',
      'IA : rédaction (user stories, specs)',
      'IA : analyse de risques',
      'IA : rapport de statut',
      'Intégration GitHub bidirectionnelle',
      'Stockage de documents',
      'Envoi de rapports par email',
    ],
  },
  {
    name: 'Business',
    price: '49 €',
    description: 'Pour les grandes équipes et organisations',
    highlighted: false,
    cta: 'Contacter l\'équipe',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS,
    features: [
      'Tout le plan Pro',
      'Membres illimités',
      'Support prioritaire',
      'Onboarding dédié',
      'SLA garanti',
    ],
  },
]

const FEATURE_ICONS = [
  { icon: Sparkles, label: 'IA intégrée', desc: 'Génération de tâches, rédaction, analyse de risques et rapports automatiques' },
  { icon: Github, label: 'GitHub sync', desc: 'Synchronisation bidirectionnelle entre tâches Clearvio et issues GitHub' },
  { icon: Zap, label: 'Gantt & Kanban', desc: 'Vues projet avancées pour planifier et suivre l\'avancement en temps réel' },
  { icon: Shield, label: 'Gestion des risques', desc: 'Registre des risques avec matrice de criticité et plans de mitigation' },
  { icon: FileText, label: 'Rapports PDF', desc: 'Export de rapports complets pour vos parties prenantes' },
  { icon: Users, label: 'Multi-équipes', desc: 'Gestion des membres, rôles et permissions par projet' },
]

export default function TarifsPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleCheckout = async (plan: Plan) => {
    if (!plan.priceId) return
    setLoadingPlan(plan.name)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId }),
      })
      if (res.status === 401) {
        window.location.href = '/connexion?redirect=/tarifs'
        return
      }
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary, #f9fafb)', fontFamily: 'var(--font-primary, system-ui)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1D3461', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          Clearvio
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/connexion" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>Connexion</Link>
          <Link href="/inscription" style={{ fontSize: 13, fontWeight: 500, color: '#fff', background: '#1D3461', padding: '7px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Essai gratuit
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1D3461', marginBottom: 12 }}>Tarifs</p>
          <h1 style={{ fontSize: 42, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 16 }}>
            Simple, transparent,<br />sans surprise
          </h1>
          <p style={{ fontSize: 17, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Commencez gratuitement. Passez à Pro quand votre équipe est prête — avec 7 jours d&apos;essai sans engagement.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 80 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: '#fff', border: plan.highlighted ? '2px solid #1D3461' : '1px solid #e5e7eb',
              borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column',
              position: 'relative', boxShadow: plan.highlighted ? '0 8px 32px rgba(29,52,97,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1D3461', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>{plan.price}</span>
                  {plan.price !== '0 €' && <span style={{ fontSize: 13, color: '#9ca3af' }}>/mois</span>}
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{plan.description}</p>
              </div>

              <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                    <Check size={15} strokeWidth={2.5} style={{ color: '#1D3461', flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan)}
                disabled={loadingPlan === plan.name}
                style={{
                  width: '100%', height: 42,
                  background: plan.highlighted ? '#1D3461' : '#fff',
                  border: plan.highlighted ? 'none' : '1px solid #d1d5db',
                  borderRadius: 10, fontSize: 14, fontWeight: 600,
                  cursor: loadingPlan === plan.name ? 'not-allowed' : 'pointer',
                  color: plan.highlighted ? '#fff' : '#374151',
                  opacity: loadingPlan === plan.name ? 0.7 : 1,
                  fontFamily: 'inherit', transition: 'all 150ms',
                }}
              >
                {loadingPlan === plan.name ? 'Redirection…' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Feature grid */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', marginBottom: 8 }}>Tout ce dont votre équipe a besoin</h2>
          <p style={{ fontSize: 15, color: '#6b7280' }}>Une plateforme complète pour gérer vos projets de bout en bout</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 64 }}>
          {FEATURE_ICONS.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{ display: 'flex', gap: 14, padding: '16px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EEF2F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} strokeWidth={1.5} color="#1D3461" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 32 }}>Questions fréquentes</h2>
          {[
            { q: 'L\'essai de 7 jours nécessite-t-il une carte bancaire ?', r: 'Oui, une carte est requise pour démarrer l\'essai. Vous ne serez pas débité pendant 7 jours et pouvez annuler à tout moment.' },
            { q: 'Que se passe-t-il à la fin de l\'essai ?', r: 'Votre abonnement Pro démarre automatiquement à 15 €/mois. Si vous annulez avant la fin de l\'essai, vous revenez au plan Gratuit sans frais.' },
            { q: 'Puis-je changer de plan ?', r: 'Oui, vous pouvez passer d\'un plan à l\'autre à tout moment depuis Paramètres → Facturation. Le changement est proratisé.' },
            { q: 'Les fonctionnalités IA sont-elles incluses dans l\'essai ?', r: 'Non, les fonctionnalités IA sont disponibles uniquement après souscription au plan Pro payant, pas pendant l\'essai gratuit.' },
          ].map(({ q, r }) => (
            <div key={q} style={{ textAlign: 'left', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{q}</p>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{r}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '24px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>© 2026 Clearvio · <Link href="/politique-confidentialite" style={{ color: '#9ca3af' }}>Politique de confidentialité</Link></p>
      </footer>
    </div>
  )
}
