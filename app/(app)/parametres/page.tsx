'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon, Monitor, LogOut, Download, Trash2, User, Palette, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(next: Theme) {
  const html = document.documentElement
  if (next === 'dark') {
    html.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else if (next === 'light') {
    html.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  } else {
    localStorage.removeItem('theme')
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  marginBottom: 24,
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '16px 20px',
  borderBottom: '1px solid var(--color-border-subtle)',
}

const sectionBodyStyle: React.CSSProperties = {
  padding: '20px',
}

export default function ParametresPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>('system')
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    setTheme(stored ?? 'system')

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null)
        // Fetch org name
        fetch('/api/me/org').then(r => r.ok ? r.json() : null).then(d => {
          if (d?.orgName) setOrgName(d.orgName)
        })
      }
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/connexion')
  }

  function handleThemeChange(next: Theme) {
    setTheme(next)
    applyTheme(next)
  }

  function handleExport() {
    toast('Fonctionnalité disponible prochainement', 'info')
  }

  function handleDeleteAccount() {
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true)
      return
    }
    toast('Contactez support@clearvio.fr pour supprimer votre compte', 'info')
    setConfirmDeleteAccount(false)
  }

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Clair', icon: <Sun size={16} strokeWidth={1.5} /> },
    { value: 'dark', label: 'Sombre', icon: <Moon size={16} strokeWidth={1.5} /> },
    { value: 'system', label: 'Système', icon: <Monitor size={16} strokeWidth={1.5} /> },
  ]

  return (
    <>
      <Header title="Paramètres" />
      <div style={{ padding: 'var(--space-10)', maxWidth: 640 }}>

        {/* Section Profil */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <User size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Profil</h2>
          </div>
          <div style={sectionBodyStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Adresse email
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {email ?? '—'}
                </p>
              </div>
              {orgName && (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Organisation
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
                    {orgName}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 36, padding: '0 16px',
                background: 'transparent',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14, cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              <LogOut size={15} strokeWidth={1.5} />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Section Apparence */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <Palette size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Apparence</h2>
          </div>
          <div style={sectionBodyStyle}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Choisissez le thème de l&apos;interface. Le mode système suit les préférences de votre appareil.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleThemeChange(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    height: 36, padding: '0 16px',
                    background: theme === opt.value ? 'var(--color-accent-bg)' : 'transparent',
                    border: `1px solid ${theme === opt.value ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14, cursor: 'pointer',
                    color: theme === opt.value ? 'var(--color-accent-default)' : 'var(--color-text-secondary)',
                    fontWeight: theme === opt.value ? 500 : 400,
                    transition: 'all 150ms',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section RGPD */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <ShieldCheck size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Données & RGPD</h2>
          </div>
          <div style={sectionBodyStyle}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
              Clearvio collecte uniquement les données nécessaires à la gestion de vos projets : adresse email,
              informations de profil et données de projet. Ces données sont hébergées sur Vercel et Supabase
              (Union Européenne). Pour plus d&apos;informations, consultez notre{' '}
              <a href="/politique-confidentialite" style={{ color: 'var(--color-accent-default)', textDecoration: 'none' }}>
                politique de confidentialité
              </a>.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleExport}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  height: 36, padding: '0 16px',
                  background: 'transparent',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14, cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Download size={15} strokeWidth={1.5} />
                Exporter mes données
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  height: 36, padding: '0 16px',
                  background: confirmDeleteAccount ? 'var(--color-danger-default)' : 'transparent',
                  border: `1px solid ${confirmDeleteAccount ? 'var(--color-danger-default)' : 'var(--color-danger-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14, cursor: 'pointer',
                  color: confirmDeleteAccount ? 'var(--color-accent-text)' : 'var(--color-danger-default)',
                  transition: 'all 150ms',
                }}
              >
                <Trash2 size={15} strokeWidth={1.5} />
                {confirmDeleteAccount ? 'Confirmer la suppression' : 'Supprimer mon compte'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
