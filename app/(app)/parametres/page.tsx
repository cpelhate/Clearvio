'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sun, Moon, Monitor, LogOut, Download, Trash2, User, Palette, ShieldCheck,
  Mail, Users, UserPlus, Copy, CheckCheck, RefreshCw, Send, Eye, EyeOff, Shield, Navigation, Flag, Plus, Pencil, X, Github, Webhook,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { useBreakpoint } from '@/lib/hooks/use-breakpoint'

// ─── Types ───────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system'
type Tab = 'profil' | 'general' | 'membres' | 'email' | 'droits' | 'jalons' | 'github'
type OrgRole = 'ADMIN' | 'MEMBRE'
type ProjectRole = 'CO_RESPONSABLE' | 'CONTRIBUTEUR' | 'OBSERVATEUR'

interface Project {
  id: string
  name: string
  color?: string
}

interface Invitation {
  id: string
  email: string
  orgRole: OrgRole
  projectRole: ProjectRole
  expiresAt: string
}

interface Member {
  id: string
  userId: string
  role: OrgRole
  joinedAt: string
  email?: string
  name?: string
}

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  fromEmail: string
  fromName: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getInitials(name: string | null | undefined, fallback: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return fallback.slice(-2).toUpperCase()
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

// ─── Shared styles ───────────────────────────────────────────────────────────

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
  display: 'block',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  color: 'var(--color-text-primary)',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
}

const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 36,
  padding: '0 16px',
  background: 'var(--color-accent-default)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--color-accent-text)',
  transition: 'opacity 150ms',
}

const btnSecondaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 36,
  padding: '0 16px',
  background: 'transparent',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
}

// ─── Tab: Membres & Invitations ───────────────────────────────────────────────

function MembresTab({ currentUserId }: { currentUserId: string | null }) {
  const { toast } = useToast()

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [orgRole, setOrgRole] = useState<OrgRole>('MEMBRE')
  const [projectRole, setProjectRole] = useState<ProjectRole>('OBSERVATEUR')
  const [allProjects, setAllProjects] = useState(true)
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Invitations list state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)

  // Members list state
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Copy invite URL state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(Array.isArray(data) ? data : (data.projects ?? []))
      }
    } catch {
      // ignore
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  const fetchInvitations = useCallback(async () => {
    setLoadingInvitations(true)
    try {
      const res = await fetch('/api/invitations')
      if (res.ok) {
        const data = await res.json()
        setInvitations(Array.isArray(data) ? data : (data.invitations ?? []))
      }
    } catch {
      // ignore
    } finally {
      setLoadingInvitations(false)
    }
  }, [])

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true)
    try {
      const res = await fetch('/api/settings/members')
      if (res.ok) {
        const data = await res.json()
        setMembers(Array.isArray(data) ? data : (data.members ?? []))
      }
    } catch {
      // ignore
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
    fetchMembers()
  }, [fetchInvitations, fetchMembers])

  useEffect(() => {
    if (!allProjects) {
      fetchProjects()
    }
  }, [allProjects, fetchProjects])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) return
    setInviting(true)
    setInviteError(null)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, message: inviteMessage, orgRole, projectRole, allProjects, projectIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error ?? 'Erreur lors de l\'envoi de l\'invitation.')
      } else {
        if (data.emailSent === false && data.inviteUrl) {
          toast(`Email non envoyé. Copiez ce lien : ${data.inviteUrl}`, 'info')
        } else {
          toast('Invitation envoyée avec succès.', 'success')
        }
        setInviteEmail('')
        setInviteMessage('')
        setOrgRole('MEMBRE')
        setProjectRole('OBSERVATEUR')
        setAllProjects(true)
        setProjectIds([])
        fetchInvitations()
      }
    } catch {
      setInviteError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch('/api/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast('Invitation révoquée.', 'success')
        fetchInvitations()
      } else {
        toast('Erreur lors de la révocation.', 'error')
      }
    } catch {
      toast('Erreur réseau.', 'error')
    }
  }

  async function handleMemberRoleChange(memberId: string, role: OrgRole) {
    try {
      const res = await fetch('/api/settings/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
        toast('Rôle mis à jour.', 'success')
      } else {
        toast('Erreur lors de la mise à jour du rôle.', 'error')
      }
    } catch {
      toast('Erreur réseau.', 'error')
    }
  }

  function toggleProjectId(id: string) {
    setProjectIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const orgRoleLabels: Record<OrgRole, string> = { ADMIN: 'Administrateur', MEMBRE: 'Membre' }
  const projectRoleLabels: Record<ProjectRole, string> = {
    CO_RESPONSABLE: 'Co-responsable',
    CONTRIBUTEUR: 'Contributeur',
    OBSERVATEUR: 'Observateur',
  }

  return (
    <div>
      {/* Invite form */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <UserPlus size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Inviter un membre</h2>
        </div>
        <div style={sectionBodyStyle}>
          <form onSubmit={handleInvite}>
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Email */}
              <div>
                <label style={labelStyle}>Email <span style={{ color: 'var(--color-danger-default)' }}>*</span></label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="prenom.nom@example.com"
                  style={inputStyle}
                />
              </div>

              {/* Message */}
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  value={inviteMessage}
                  onChange={e => setInviteMessage(e.target.value)}
                  rows={3}
                  placeholder="Message personnalisé (optionnel)"
                  style={{
                    ...inputStyle,
                    height: 'auto',
                    padding: '8px 12px',
                    resize: 'vertical',
                    lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Roles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Rôle organisation</label>
                  <select value={orgRole} onChange={e => setOrgRole(e.target.value as OrgRole)} style={selectStyle}>
                    <option value="MEMBRE">Membre</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Rôle projet</label>
                  <select value={projectRole} onChange={e => setProjectRole(e.target.value as ProjectRole)} style={selectStyle}>
                    <option value="OBSERVATEUR">Observateur</option>
                    <option value="CONTRIBUTEUR">Contributeur</option>
                    <option value="CO_RESPONSABLE">Co-responsable</option>
                  </select>
                </div>
              </div>

              {/* Projects */}
              <div>
                <label style={labelStyle}>Projets</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={allProjects}
                    onChange={e => setAllProjects(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    Tous les projets (existants)
                  </span>
                </label>

                {!allProjects && (
                  <div style={{
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    background: 'var(--color-bg-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}>
                    {loadingProjects ? (
                      <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement…</span>
                    ) : projects.length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Aucun projet trouvé.</span>
                    ) : (
                      projects.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={projectIds.includes(p.id)}
                            onChange={() => toggleProjectId(p.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          {p.color && (
                            <span style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: p.color,
                              flexShrink: 0,
                            }} />
                          )}
                          <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{p.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {inviteError && (
                <p style={{ fontSize: 13, color: 'var(--color-danger-default)', margin: 0 }}>{inviteError}</p>
              )}

              <div>
                <button type="submit" disabled={inviting} style={{ ...btnPrimaryStyle, opacity: inviting ? 0.6 : 1 }}>
                  <Send size={14} strokeWidth={1.5} />
                  {inviting ? 'Envoi en cours…' : 'Envoyer l\'invitation'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Pending invitations */}
      <div style={sectionStyle}>
        <div style={{ ...sectionHeaderStyle, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Invitations en attente</h2>
          </div>
          <button onClick={fetchInvitations} style={{ ...btnSecondaryStyle, height: 28, padding: '0 10px', fontSize: 12 }}>
            <RefreshCw size={13} strokeWidth={1.5} />
            Rafraîchir
          </button>
        </div>
        <div style={sectionBodyStyle}>
          {loadingInvitations ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement…</p>
          ) : invitations.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Aucune invitation en attente.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {['Email', 'Rôle org', 'Rôle projet', 'Expire le', ''].map(h => (
                      <th key={h} style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invitations.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '10px 10px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {inv.email}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--color-text-secondary)' }}>
                        {orgRoleLabels[inv.orgRole] ?? inv.orgRole}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--color-text-secondary)' }}>
                        {projectRoleLabels[inv.projectRole] ?? inv.projectRole}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatDate(inv.expiresAt)}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          title="Révoquer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            background: 'transparent',
                            border: '1px solid var(--color-border-default)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: 'var(--color-danger-default)',
                          }}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Members list */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <Users size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Membres de l&apos;organisation</h2>
        </div>
        <div style={sectionBodyStyle}>
          {loadingMembers ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement…</p>
          ) : members.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Aucun membre trouvé.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map(member => {
                const isCurrentUser = currentUserId && (member.userId === currentUserId || member.id === currentUserId)
                return (
                  <div key={member.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'var(--color-accent-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-accent-default)',
                      flexShrink: 0,
                      letterSpacing: '0.04em',
                    }}>
                      {getInitials(member.name, member.userId ?? member.id)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                          {member.name ?? member.email ?? member.userId ?? member.id}
                        </span>
                        {member.email && member.name && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{member.email}</span>
                        )}
                        {isCurrentUser && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '1px 6px',
                            background: 'var(--color-accent-bg)',
                            color: 'var(--color-accent-default)',
                            borderRadius: 'var(--radius-sm)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}>Vous</span>
                        )}
                      </div>
                      {member.joinedAt && (
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          Membre depuis le {formatDate(member.joinedAt)}
                        </span>
                      )}
                    </div>

                    {/* Role select */}
                    <select
                      value={member.role}
                      disabled={!!isCurrentUser}
                      onChange={e => handleMemberRoleChange(member.id, e.target.value as OrgRole)}
                      style={{
                        ...selectStyle,
                        width: 'auto',
                        minWidth: 130,
                        opacity: isCurrentUser ? 0.5 : 1,
                        cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <option value="MEMBRE">Membre</option>
                      <option value="ADMIN">Administrateur</option>
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Email (SMTP) ────────────────────────────────────────────────────────

function EmailTab() {
  const { toast } = useToast()
  const [config, setConfig] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    fromEmail: '',
    fromName: '',
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch('/api/settings/smtp')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setConfig({
            host: data.host ?? '',
            port: data.port ?? 587,
            secure: data.secure ?? false,
            user: data.user ?? '',
            fromEmail: data.fromEmail ?? '',
            fromName: data.fromName ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...config }
      if (password) payload.password = password
      const res = await fetch('/api/settings/smtp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast('Configuration SMTP sauvegardée.', 'success')
        setPassword('')
      } else {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Erreur lors de la sauvegarde.', 'error')
      }
    } catch {
      toast('Erreur réseau.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await fetch('/api/settings/smtp/test', { method: 'POST' })
      if (res.ok) {
        toast('Test réussi ! L\'email de test a été envoyé.', 'success')
      } else {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Échec du test SMTP.', 'error')
      }
    } catch {
      toast('Erreur réseau.', 'error')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div style={sectionStyle}>
        <div style={sectionBodyStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement de la configuration…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <Mail size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Configuration SMTP</h2>
        </div>
      </div>
      <div style={sectionBodyStyle}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Configurez votre serveur mail pour envoyer les invitations depuis votre domaine.
        </p>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Host & Port */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Hôte (Host)</label>
                <input
                  type="text"
                  value={config.host}
                  onChange={e => setConfig(c => ({ ...c, host: e.target.value }))}
                  placeholder="mail.example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Port</label>
                <input
                  type="number"
                  value={config.port}
                  onChange={e => setConfig(c => ({ ...c, port: Number(e.target.value) }))}
                  placeholder="587"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Secure */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.secure}
                onChange={e => setConfig(c => ({ ...c, secure: e.target.checked }))}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Connexion sécurisée (SSL/TLS)
              </span>
            </label>

            {/* User */}
            <div>
              <label style={labelStyle}>Utilisateur</label>
              <input
                type="text"
                value={config.user}
                onChange={e => setConfig(c => ({ ...c, user: e.target.value }))}
                placeholder="user@example.com"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                Laisser vide pour conserver le mot de passe existant.
              </p>
            </div>

            {/* From Email & Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Email expéditeur</label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={e => setConfig(c => ({ ...c, fromEmail: e.target.value }))}
                  placeholder="noreply@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Nom expéditeur</label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={e => setConfig(c => ({ ...c, fromName: e.target.value }))}
                  placeholder="Mon Organisation"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={saving}
                style={{ ...btnPrimaryStyle, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              <button
                type="button"
                disabled={testing}
                onClick={handleTest}
                style={{ ...btnSecondaryStyle, opacity: testing ? 0.6 : 1 }}
              >
                <Send size={14} strokeWidth={1.5} />
                {testing ? 'Test en cours…' : 'Tester la connexion'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Toggle Switch component ──────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 32,
        height: 18,
        borderRadius: 9,
        background: checked ? 'var(--color-accent-default)' : 'var(--color-border-default)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        position: 'relative',
        transition: 'background 150ms',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        left: checked ? 16 : 2,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transition: 'left 150ms',
      }} />
    </button>
  )
}

// ─── Tab: Droits ─────────────────────────────────────────────────────────────

type PermissionsMatrix = Record<string, Record<string, boolean>>

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MEMBRE: 'Membre',
  CO_RESPONSABLE: 'Co-resp.',
  CONTRIBUTEUR: 'Contrib.',
  OBSERVATEUR: 'Observ.',
}

const ALL_ROLES = ['ADMIN', 'MEMBRE', 'CO_RESPONSABLE', 'CONTRIBUTEUR', 'OBSERVATEUR']
const CONFIGURABLE_ROLES = ['MEMBRE', 'CO_RESPONSABLE', 'CONTRIBUTEUR', 'OBSERVATEUR']

const NAV_MODULES: { key: string; label: string; description: string }[] = [
  { key: 'nav.portefeuille', label: 'Portefeuille', description: 'Vue multi-projets' },
  { key: 'nav.roadmap', label: 'Roadmap', description: 'Planning global' },
  { key: 'nav.notifications', label: 'Notifications', description: 'Centre de notifications' },
]

const ACTION_GROUPS: { label: string; actions: { key: string; label: string }[] }[] = [
  {
    label: 'Projets',
    actions: [
      { key: 'project.create', label: 'Créer' },
      { key: 'project.edit', label: 'Modifier' },
      { key: 'project.delete', label: 'Supprimer' },
    ],
  },
  {
    label: 'Tâches',
    actions: [
      { key: 'task.create', label: 'Créer' },
      { key: 'task.edit', label: 'Modifier' },
      { key: 'task.delete', label: 'Supprimer' },
    ],
  },
  {
    label: 'Jalons',
    actions: [
      { key: 'milestone.create', label: 'Créer' },
      { key: 'milestone.edit', label: 'Modifier' },
      { key: 'milestone.delete', label: 'Supprimer' },
    ],
  },
  {
    label: 'Livrables',
    actions: [
      { key: 'deliverable.create', label: 'Créer' },
      { key: 'deliverable.edit', label: 'Modifier' },
      { key: 'deliverable.delete', label: 'Supprimer' },
    ],
  },
  {
    label: 'Objectifs',
    actions: [
      { key: 'objective.create', label: 'Créer' },
      { key: 'objective.edit', label: 'Modifier' },
      { key: 'objective.delete', label: 'Supprimer' },
    ],
  },
  {
    label: 'Risques',
    actions: [
      { key: 'risk.create', label: 'Créer' },
      { key: 'risk.edit', label: 'Modifier' },
      { key: 'risk.delete', label: 'Supprimer' },
    ],
  },
  {
    label: 'Documents',
    actions: [
      { key: 'document.upload', label: 'Téléverser' },
      { key: 'document.delete', label: 'Supprimer' },
    ],
  },
  {
    label: 'Commentaires',
    actions: [
      { key: 'comment.create', label: 'Créer' },
      { key: 'comment.delete_other', label: 'Supprimer (autre)' },
    ],
  },
  {
    label: 'Membres',
    actions: [
      { key: 'member.invite', label: 'Inviter' },
      { key: 'member.remove', label: 'Retirer' },
      { key: 'member.change_role', label: 'Modifier rôle' },
    ],
  },
]

function DroitsTab() {
  const { toast } = useToast()
  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/permissions')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setMatrix(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(role: string, action: string, currentValue: boolean) {
    const newValue = !currentValue
    // Optimistic update
    setMatrix(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [role]: { ...prev[role], [action]: newValue },
      }
    })

    try {
      const res = await fetch('/api/settings/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, action, allowed: newValue }),
      })
      if (!res.ok) {
        // Revert on error
        setMatrix(prev => {
          if (!prev) return prev
          return {
            ...prev,
            [role]: { ...prev[role], [action]: currentValue },
          }
        })
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Erreur lors de la mise à jour.', 'error')
      } else {
        toast('Permission mise à jour.', 'success')
      }
    } catch {
      setMatrix(prev => {
        if (!prev) return prev
        return {
          ...prev,
          [role]: { ...prev[role], [action]: currentValue },
        }
      })
      toast('Erreur réseau.', 'error')
    }
  }

  if (loading) {
    return (
      <div style={sectionStyle}>
        <div style={sectionBodyStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  if (!matrix) {
    return (
      <div style={sectionStyle}>
        <div style={sectionBodyStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            Impossible de charger les permissions. Vérifiez que vous êtes administrateur.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Section Accès aux modules */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <div style={sectionHeaderStyle}>
          <Navigation size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Accès aux modules</h2>
          <span style={{
            marginLeft: 'auto',
            fontSize: 10, fontWeight: 600,
            padding: '2px 8px',
            background: 'var(--color-accent-bg)',
            color: 'var(--color-accent-default)',
            border: '1px solid var(--color-accent-default)',
            borderRadius: 'var(--radius-sm)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
          }}>Navigation</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed', minWidth: 400 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', width: '30%' }}>
                Module
              </th>
              {ALL_ROLES.map(role => (
                <th key={role} style={{ textAlign: 'center', padding: '10px 8px', fontSize: 11, fontWeight: 600, color: role === 'ADMIN' ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NAV_MODULES.map(mod => (
              <tr key={mod.key} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: '10px 20px' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontSize: 13 }}>{mod.label}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{mod.description}</span>
                </td>
                <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                  <ToggleSwitch checked={true} disabled />
                </td>
                {CONFIGURABLE_ROLES.map(role => {
                  const val = matrix[role]?.[mod.key] ?? true
                  return (
                    <td key={role} style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <ToggleSwitch checked={val} onChange={() => handleToggle(role, mod.key, val)} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Section Droits par rôle */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <Shield size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Droits par rôle
            </h2>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed', minWidth: 400 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <th style={{
                textAlign: 'left',
                padding: '10px 20px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                width: '30%',
              }}>
                Action
              </th>
              {ALL_ROLES.map(role => (
                <th key={role} style={{
                  textAlign: 'center',
                  padding: '10px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: role === 'ADMIN' ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTION_GROUPS.map(group => (
              <>
                <tr key={`group-${group.label}`} style={{ background: 'var(--color-bg-elevated)' }}>
                  <td
                    colSpan={ALL_ROLES.length + 1}
                    style={{
                      padding: '8px 20px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      borderBottom: '1px solid var(--color-border-subtle)',
                      borderTop: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    {group.label}
                  </td>
                </tr>
                {group.actions.map(action => (
                  <tr
                    key={action.key}
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                  >
                    <td style={{ padding: '10px 20px', color: 'var(--color-text-secondary)' }}>
                      {action.label}
                    </td>
                    {/* Admin column — always checked, disabled */}
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        style={{ cursor: 'not-allowed', opacity: 0.4, width: 15, height: 15 }}
                      />
                    </td>
                    {/* Configurable roles */}
                    {CONFIGURABLE_ROLES.map(role => {
                      const val = matrix[role]?.[action.key] ?? false
                      return (
                        <td key={role} style={{ textAlign: 'center', padding: '10px 12px' }}>
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={() => handleToggle(role, action.key, val)}
                            style={{ cursor: 'pointer', width: 15, height: 15 }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

// ─── GithubTab ───────────────────────────────────────────────────────────────

interface GithubConnection {
  id: string
  repoOwner: string
  repoName: string
  webhookSecret: string
  createdAt: string
}

function GithubTab() {
  const { toast } = useToast()
  const [connection, setConnection] = useState<GithubConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  useEffect(() => {
    fetch('/api/settings/github')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setConnection(data)
          setRepoOwner(data.repoOwner)
          setRepoName(data.repoName)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoOwner: repoOwner.trim(), repoName: repoName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setConnection(data)
        toast('Connexion GitHub enregistrée', 'success')
      } else {
        const d = await res.json().catch(() => ({}))
        toast(d.error ?? 'Erreur lors de la sauvegarde', 'error')
      }
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch('/api/settings/github', { method: 'DELETE' })
      if (res.ok) {
        setConnection(null)
        setRepoOwner('')
        setRepoName('')
        toast('Connexion GitHub supprimée', 'success')
      } else {
        toast('Erreur lors de la suppression', 'error')
      }
    } catch {
      toast('Erreur réseau', 'error')
    }
  }

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret).then(() => {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    })
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/github/webhook`
    : '/api/github/webhook'

  if (loading) {
    return (
      <div style={sectionStyle}>
        <div style={sectionBodyStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Section Connexion */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <Github size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Intégration GitHub</h2>
          </div>
        </div>
        <div style={sectionBodyStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
            Synchronisez automatiquement les tâches avec vos Pull Requests. Utilisez le <strong>shortName</strong> d&apos;une tâche
            (ex. <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>WIRE-1</code>) dans le titre ou la description de vos PR.
          </p>

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Propriétaire du dépôt</label>
                  <input
                    type="text"
                    value={repoOwner}
                    onChange={e => setRepoOwner(e.target.value)}
                    placeholder="ex. mon-organisation"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Nom du dépôt</label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={e => setRepoName(e.target.value)}
                    placeholder="ex. mon-projet"
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ ...btnPrimaryStyle, opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Sauvegarde…' : connection ? 'Mettre à jour' : 'Connecter'}
                </button>
                {connection && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{ ...btnSecondaryStyle, color: 'var(--color-danger-default)', borderColor: 'var(--color-danger-default)' }}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                    Déconnecter
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Section Webhook (visible uniquement si connexion active) */}
      {connection && (
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <Webhook size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Configuration du webhook</h2>
          </div>
          <div style={sectionBodyStyle}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              Ajoutez ce webhook dans <strong>GitHub → Settings → Webhooks</strong> de votre dépôt
              <code style={{ fontFamily: 'var(--font-mono)', marginLeft: 4 }}>{connection.repoOwner}/{connection.repoName}</code>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Webhook URL */}
              <div>
                <label style={labelStyle}>Payload URL</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={webhookUrl}
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 12, opacity: 0.8 }}
                  />
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(webhookUrl); toast('URL copiée', 'success') }}
                    style={{ ...btnSecondaryStyle, flexShrink: 0, height: 36, padding: '0 12px' }}
                  >
                    <Copy size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Secret */}
              <div>
                <label style={labelStyle}>Secret</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      readOnly
                      type={showSecret ? 'text' : 'password'}
                      value={connection.webhookSecret}
                      style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 12, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', padding: 0 }}
                      tabIndex={-1}
                    >
                      {showSecret ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => copySecret(connection.webhookSecret)}
                    style={{ ...btnSecondaryStyle, flexShrink: 0, height: 36, padding: '0 12px' }}
                  >
                    {copiedSecret ? <CheckCheck size={13} strokeWidth={1.5} style={{ color: 'var(--color-success-default)' }} /> : <Copy size={13} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div style={{
                padding: '14px 16px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--color-text-secondary)',
              }}>
                <p style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>Comportements activés :</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>PR ouverte avec <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>#SHORTNAME</code> → tâche passée en <strong>En révision</strong></li>
                  <li>PR fusionnée → tâche passée en <strong>Terminée</strong></li>
                  <li>Commit avec <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>#SHORTNAME</code> → commentaire automatique sur la tâche</li>
                </ul>
                <p style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  Content type : <strong>application/json</strong> · Events : <strong>Pull requests</strong> + <strong>Pushes</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── JalonsTab ────────────────────────────────────────────────────────────────

interface MilestoneType {
  id: string
  name: string
  color: string
  icon: string
  description?: string | null
}

const MILESTONE_ICONS = [
  { value: 'flag', label: 'Drapeau' },
  { value: 'milestone', label: 'Jalon' },
  { value: 'star', label: 'Étoile' },
  { value: 'check', label: 'Validation' },
  { value: 'alert', label: 'Alerte' },
  { value: 'diamond', label: 'Diamant' },
]

function JalonsTab() {
  const { toast } = useToast()
  const [types, setTypes] = useState<MilestoneType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', color: '#6366f1', icon: 'flag', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/milestone-types')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setTypes(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function startEdit(t: MilestoneType) {
    setEditId(t.id)
    setForm({ name: t.name, color: t.color, icon: t.icon, description: t.description ?? '' })
    setShowForm(true)
  }

  function startCreate() {
    setEditId(null)
    setForm({ name: '', color: '#6366f1', icon: 'flag', description: '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Nom requis', 'error'); return }
    setSaving(true)
    try {
      const url = editId ? `/api/settings/milestone-types/${editId}` : '/api/settings/milestone-types'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { toast('Erreur lors de la sauvegarde', 'error'); return }
      const saved = await res.json()
      if (editId) {
        setTypes(prev => prev.map(t => t.id === editId ? saved : t))
        toast('Type de jalon mis à jour', 'success')
      } else {
        setTypes(prev => [...prev, saved])
        toast('Type de jalon créé', 'success')
      }
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/settings/milestone-types/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTypes(prev => prev.filter(t => t.id !== id))
      toast('Type supprimé', 'success')
    } else {
      toast('Erreur lors de la suppression', 'error')
    }
  }

  return (
    <div>
      <div style={sectionStyle}>
        <div style={{ ...sectionHeaderStyle, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flag size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Types de jalons</h2>
          </div>
          <button onClick={startCreate} style={btnPrimaryStyle}>
            <Plus size={14} strokeWidth={1.5} />
            Nouveau type
          </button>
        </div>
        <div style={sectionBodyStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
            Définissez des types de jalons personnalisés pour votre organisation (ex. : Décision Go/NoGo, Livraison client, Point de contrôle).
          </p>

          {loading && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Chargement…</p>}

          {!loading && types.length === 0 && !showForm && (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              Aucun type de jalon personnalisé. Créez-en un pour commencer.
            </p>
          )}

          {types.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showForm ? 20 : 0 }}>
              {types.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: t.color, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t.name}</p>
                    {t.description && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{t.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4 }}
                  >
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-default)', padding: 4 }}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <div style={{
              padding: 16,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {editId ? 'Modifier le type' : 'Nouveau type de jalon'}
                </p>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input
                    style={inputStyle}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ex. Décision Go/NoGo"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input
                    style={inputStyle}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description optionnelle"
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Couleur</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="color"
                        value={form.color}
                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                        style={{ width: 36, height: 36, border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: 2 }}
                      />
                      <input
                        style={{ ...inputStyle, width: 100 }}
                        value={form.color}
                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Icône</label>
                    <select
                      style={selectStyle}
                      value={form.icon}
                      onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                    >
                      {MILESTONE_ICONS.map(ic => (
                        <option key={ic.value} value={ic.value}>{ic.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowForm(false)} style={btnSecondaryStyle}>Annuler</button>
                  <button onClick={handleSave} disabled={saving} style={btnPrimaryStyle}>
                    {saving ? 'Sauvegarde…' : editId ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Mon profil ─────────────────────────────────────────────────────────

function ProfilTab({ userEmail }: { userEmail: string | null }) {
  const { toast } = useToast()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/me/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setFirstName(data.firstName ?? '')
          setLastName(data.lastName ?? '')
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword && newPassword !== confirmPassword) {
      toast('Les mots de passe ne correspondent pas.', 'error')
      return
    }
    setSaving(true)
    setSuccess(false)
    try {
      const body: Record<string, string> = { firstName, lastName }
      if (newPassword) body.password = newPassword
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSuccess(true)
        setNewPassword('')
        setConfirmPassword('')
        toast('Profil mis à jour', 'success')
      } else {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Erreur lors de la mise à jour.', 'error')
      }
    } catch {
      toast('Erreur réseau.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const initials = [firstName, lastName]
    .map(s => s?.trim()?.[0] ?? '')
    .join('')
    .toUpperCase() || '?'

  return (
    <div>
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <User size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Mon profil</h2>
        </div>
        <div style={sectionBodyStyle}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--color-accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 600, color: 'var(--color-accent-default)',
                  flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
                    {[firstName, lastName].filter(Boolean).join(' ') || 'Votre nom'}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
                    {userEmail ?? '—'}
                  </p>
                </div>
              </div>

              {/* Name fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Prénom"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Nom"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Email read-only */}
              <div>
                <label style={labelStyle}>Adresse email</label>
                <input
                  type="email"
                  value={userEmail ?? ''}
                  readOnly
                  style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ ...labelStyle, marginTop: 4 }}>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
                  style={inputStyle}
                />
              </div>
              {newPassword && (
                <div>
                  <label style={labelStyle}>Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirmer le mot de passe"
                    style={inputStyle}
                  />
                </div>
              )}

              {success && (
                <p style={{ fontSize: 13, color: 'var(--color-success-default)', margin: 0 }}>Profil mis à jour</p>
              )}

              <div>
                <button type="submit" disabled={saving} style={{ ...btnPrimaryStyle, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Sauvegarde…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParametresPage() {
  const router = useRouter()
  const { toast } = useToast()
  const bp = useBreakpoint()
  const [activeTab, setActiveTab] = useState<Tab>('profil')
  const [email, setEmail] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>('system')
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    setTheme(stored ?? 'system')

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null)
        setCurrentUserId(data.user.id)
        fetch('/api/me/org').then(r => r.ok ? r.json() : null).then(d => {
          if (d?.orgName) setOrgName(d.orgName)
          if (d?.role === 'ADMIN') setIsAdmin(true)
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

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/me/export')
      if (!res.ok) {
        toast('Erreur lors de la génération de l\'export.', 'error')
        return
      }
      const blob = await res.blob()
      const filename = `clearvio-export-${new Date().toISOString().slice(0, 10)}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast('Export téléchargé avec succès.', 'success')
    } catch {
      toast('Erreur réseau lors de l\'export.', 'error')
    } finally {
      setExporting(false)
    }
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profil', label: 'Mon profil', icon: <User size={14} strokeWidth={1.5} /> },
    { key: 'general', label: 'Général', icon: <User size={14} strokeWidth={1.5} /> },
    { key: 'membres', label: 'Membres & Invitations', icon: <Users size={14} strokeWidth={1.5} /> },
    { key: 'email', label: 'Email', icon: <Mail size={14} strokeWidth={1.5} /> },
    { key: 'droits', label: 'Droits', icon: <Shield size={14} strokeWidth={1.5} /> },
    { key: 'jalons', label: 'Jalons', icon: <Flag size={14} strokeWidth={1.5} /> },
    { key: 'github', label: 'GitHub', icon: <Github size={14} strokeWidth={1.5} /> },
  ]

  return (
    <>
      <Header title="Paramètres" />
      <div style={{ padding: bp === 'mobile' ? '16px' : 'var(--space-10)', maxWidth: 680 }}>

        {/* Tab navigation */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 28,
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 36,
                padding: '0 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key
                  ? '2px solid var(--color-accent-default)'
                  : '2px solid transparent',
                marginBottom: -1,
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                color: activeTab === tab.key
                  ? 'var(--color-accent-default)'
                  : 'var(--color-text-secondary)',
                transition: 'color 150ms, border-color 150ms',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Mon profil */}
        {activeTab === 'profil' && (
          <ProfilTab userEmail={email} />
        )}

        {/* Tab: Général */}
        {activeTab === 'general' && (
          <>
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
                    disabled={exporting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      height: 36, padding: '0 16px',
                      background: 'transparent',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14, cursor: exporting ? 'not-allowed' : 'pointer',
                      color: 'var(--color-text-secondary)',
                      opacity: exporting ? 0.6 : 1,
                    }}
                  >
                    <Download size={15} strokeWidth={1.5} />
                    {exporting ? 'Génération en cours…' : 'Exporter mes données'}
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
          </>
        )}

        {/* Tab: Membres & Invitations */}
        {activeTab === 'membres' && (
          <MembresTab currentUserId={currentUserId} />
        )}

        {/* Tab: Email (SMTP) */}
        {activeTab === 'email' && (
          <EmailTab />
        )}

        {/* Tab: Droits */}
        {activeTab === 'droits' && (
          <DroitsTab />
        )}

        {/* Tab: Jalons */}
        {activeTab === 'jalons' && isAdmin && (
          <JalonsTab />
        )}
        {activeTab === 'jalons' && !isAdmin && (
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14, padding: 20 }}>
            Seuls les administrateurs peuvent gérer les types de jalons.
          </div>
        )}

        {activeTab === 'github' && isAdmin && (
          <GithubTab />
        )}
        {activeTab === 'github' && !isAdmin && (
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14, padding: 20 }}>
            Seuls les administrateurs peuvent configurer l&apos;intégration GitHub.
          </div>
        )}

      </div>
    </>
  )
}
