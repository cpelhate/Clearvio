'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sun, Moon, Monitor, LogOut, Download, Trash2, User, Palette, ShieldCheck,
  Mail, Users, UserPlus, Copy, CheckCheck, RefreshCw, Send, Eye, EyeOff, Shield,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

// ─── Types ───────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system'
type Tab = 'general' | 'membres' | 'email' | 'droits'
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

function getInitials(userId: string): string {
  if (!userId || userId.length < 2) return '??'
  return userId.slice(-2).toUpperCase()
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
                      {getInitials(member.userId ?? member.id)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' } as React.CSSProperties}>
                          {member.email ?? member.userId ?? member.id}
                        </span>
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

// ─── Tab: Droits ─────────────────────────────────────────────────────────────

type PermissionsMatrix = Record<string, Record<string, boolean>>

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MEMBRE: 'Membre',
  CO_RESPONSABLE: 'Co-responsable',
  CONTRIBUTEUR: 'Contributeur',
  OBSERVATEUR: 'Observateur',
}

const ALL_ROLES = ['ADMIN', 'MEMBRE', 'CO_RESPONSABLE', 'CONTRIBUTEUR', 'OBSERVATEUR']
const CONFIGURABLE_ROLES = ['MEMBRE', 'CO_RESPONSABLE', 'CONTRIBUTEUR', 'OBSERVATEUR']

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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                minWidth: 160,
              }}>
                Action
              </th>
              {ALL_ROLES.map(role => (
                <th key={role} style={{
                  textAlign: 'center',
                  padding: '10px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: role === 'ADMIN' ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  minWidth: 100,
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
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParametresPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [email, setEmail] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>('system')
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: 'Général', icon: <User size={14} strokeWidth={1.5} /> },
    { key: 'membres', label: 'Membres & Invitations', icon: <Users size={14} strokeWidth={1.5} /> },
    { key: 'email', label: 'Email', icon: <Mail size={14} strokeWidth={1.5} /> },
    { key: 'droits', label: 'Droits', icon: <Shield size={14} strokeWidth={1.5} /> },
  ]

  return (
    <>
      <Header title="Paramètres" />
      <div style={{ padding: 'var(--space-10)', maxWidth: 680 }}>

        {/* Tab navigation */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 28,
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: 0,
        }}>
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

      </div>
    </>
  )
}
