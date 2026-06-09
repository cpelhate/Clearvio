'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Users, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface InviteInfo {
  email: string
  orgName: string
  orgRole: 'ADMIN' | 'MEMBRE'
  projectRole: 'CO_RESPONSABLE' | 'CONTRIBUTEUR' | 'OBSERVATEUR'
  allProjects: boolean
  projectCount: number
  message: string | null
  expiresAt: string
}

const ORG_ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrateur', MEMBRE: 'Membre' }
const PROJECT_ROLE_LABELS: Record<string, string> = {
  CO_RESPONSABLE: 'Co-responsable',
  CONTRIBUTEUR: 'Contributeur',
  OBSERVATEUR: 'Observateur',
}

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [status, setStatus] = useState<'loading' | 'valid' | 'error' | 'accepting' | 'done'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))

    fetch(`/api/invitations/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErrorMsg(data.error); setStatus('error') }
        else { setInfo(data); setStatus('valid') }
      })
      .catch(() => { setErrorMsg('Erreur de chargement'); setStatus('error') })
  }, [token])

  async function handleAccept() {
    if (!isLoggedIn) {
      router.push(`/inscription?token=${token}`)
      return
    }
    setStatus('accepting')
    const res = await fetch(`/api/invitations/${token}`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) {
      setStatus('done')
      setTimeout(() => router.push('/tableau-de-bord'), 2000)
    } else {
      setErrorMsg(data.error ?? 'Erreur')
      setStatus('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-primary)',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#1D3461', padding: '24px 32px', textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: 0 }}>Clearvio</h1>
        </div>

        <div style={{ padding: 32 }}>
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--color-border-default)', borderTopColor: 'var(--color-accent-default)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Vérification de l'invitation...</p>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <XCircle size={48} strokeWidth={1.5} style={{ color: 'var(--color-danger-default)', margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Invitation invalide</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>{errorMsg}</p>
              <button onClick={() => router.push('/connexion')} style={{ height: 38, padding: '0 20px', background: 'var(--color-accent-default)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, cursor: 'pointer' }}>
                Aller à la connexion
              </button>
            </div>
          )}

          {status === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={48} strokeWidth={1.5} style={{ color: 'var(--color-success-default)', margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Invitation acceptée !</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Redirection vers le tableau de bord...</p>
            </div>
          )}

          {(status === 'valid' || status === 'accepting') && info && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px', textAlign: 'center' }}>
                Invitation à rejoindre
              </h2>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent-default)', textAlign: 'center', margin: '0 0 24px' }}>
                {info.orgName}
              </p>

              {info.message && (
                <div style={{ background: 'var(--color-bg-secondary)', borderLeft: '3px solid var(--color-accent-default)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', padding: '12px 16px', marginBottom: 24, fontSize: 14, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  "{info.message}"
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <ShieldCheck size={16} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rôle organisation</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{ORG_ROLE_LABELS[info.orgRole]}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <Users size={16} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Accès projets</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
                      {info.allProjects ? `Tous les projets (${info.projectCount})` : `${info.projectCount} projet${info.projectCount > 1 ? 's' : ''}`}
                      {' — '}{PROJECT_ROLE_LABELS[info.projectRole]}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <Clock size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expire le</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
                      {new Date(info.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAccept}
                disabled={status === 'accepting'}
                style={{
                  width: '100%', height: 44,
                  background: status === 'accepting' ? 'var(--color-accent-subtle)' : 'var(--color-accent-default)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                  fontSize: 15, fontWeight: 600, cursor: status === 'accepting' ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {status === 'accepting' ? 'Traitement...' : isLoggedIn ? 'Accepter l\'invitation' : 'Créer un compte et accepter'}
              </button>

              {!isLoggedIn && (
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 12 }}>
                  Déjà un compte ?{' '}
                  <a href={`/connexion?token=${token}`} style={{ color: 'var(--color-accent-default)', textDecoration: 'none' }}>
                    Se connecter
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
