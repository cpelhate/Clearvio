'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload, File, FileText, FileSpreadsheet, Image, Trash2, Download,
  FolderOpen, Lock, Users, UserCheck, Pencil, X, Search, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { usePlan } from '@/hooks/use-plan'
import { UpgradeModal } from '@/components/billing/upgrade-modal'

const BUCKET = 'project-documents'

const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'image/svg+xml': 'SVG',
}

interface DocPermission { userId: string }

interface Document {
  id: string
  projectId: string
  name: string
  storagePath: string
  mimeType: string | null
  size: number | null
  uploadedBy: string
  visibility: 'PRIVATE' | 'PROJECT' | 'SPECIFIC'
  createdAt: string
  permissions: DocPermission[]
}

interface Member {
  userId: string
  name: string | null
  email: string | null
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return FileSpreadsheet
  if (mimeType.includes('pdf') || mimeType.includes('word')) return FileText
  return File
}

function getTypeLabel(mimeType: string | null): string {
  if (!mimeType) return '—'
  return ALLOWED_MIME[mimeType] ?? mimeType.split('/')[1]?.toUpperCase() ?? '—'
}

const VISIBILITY_CONFIG = {
  PRIVATE: { icon: Lock, label: 'Privé', color: '#9ca3af' },
  PROJECT: { icon: Users, label: 'Projet', color: '#1D3461' },
  SPECIFIC: { icon: UserCheck, label: 'Spécifique', color: '#059669' },
}

// ─── Barre de stockage ────────────────────────────────────────────────────────

function StorageBar({ projectId }: { projectId: string }) {
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/documents/usage`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUsage(d))
  }, [projectId])

  if (!usage || usage.quota === 0) return null

  const pct = Math.min(100, (usage.used / usage.quota) * 100)
  const isWarning = pct > 80

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Stockage du projet</span>
        <span style={{ fontSize: 12, color: isWarning ? '#ef4444' : 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatSize(usage.used)} / {formatSize(usage.quota)}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--color-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: isWarning ? '#ef4444' : 'var(--color-accent-default)',
          borderRadius: 3, transition: 'width 400ms',
        }} />
      </div>
    </div>
  )
}

// ─── Modal de visibilité ──────────────────────────────────────────────────────

function VisibilityModal({
  doc,
  members,
  onClose,
  onSaved,
}: {
  doc: Document
  members: Member[]
  onClose: () => void
  onSaved: () => void
}) {
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PROJECT' | 'SPECIFIC'>(doc.visibility)
  const [selectedUsers, setSelectedUsers] = useState<string[]>(doc.permissions.map(p => p.userId))
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const filteredMembers = members.filter(m =>
    m.userId !== doc.uploadedBy &&
    ((m.name?.toLowerCase().includes(search.toLowerCase())) ||
     (m.email?.toLowerCase().includes(search.toLowerCase())))
  )

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid])
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/projects/${doc.projectId}/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility, permissionUserIds: visibility === 'SPECIFIC' ? selectedUsers : [] }),
    })
    setSaving(false)
    if (res.ok) { toast('Visibilité mise à jour', 'success'); onSaved(); onClose() }
    else { const d = await res.json(); toast(d.error ?? 'Erreur', 'error') }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Visibilité du document</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex' }}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{doc.name}</strong>
          </p>

          {/* Options de visibilité */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {(['PRIVATE', 'PROJECT', 'SPECIFIC'] as const).map(v => {
              const cfg = VISIBILITY_CONFIG[v]
              const Icon = cfg.icon
              const descriptions: Record<string, string> = {
                PRIVATE: 'Visible uniquement par vous',
                PROJECT: 'Visible par tous les membres du projet',
                SPECIFIC: 'Visible par les personnes que vous choisissez',
              }
              return (
                <label key={v} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  border: `1px solid ${visibility === v ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: visibility === v ? 'var(--color-accent-subtle)' : 'var(--color-bg-secondary)',
                }}>
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                    style={{ accentColor: 'var(--color-accent-default)' }}
                  />
                  <Icon size={15} strokeWidth={1.5} style={{ color: cfg.color, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 1 }}>{cfg.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{descriptions[v]}</p>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Sélection de membres si SPECIFIC */}
          {visibility === 'SPECIFIC' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  type="text"
                  placeholder="Rechercher un membre…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', height: 34, paddingLeft: 32, paddingRight: 12, border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)' }}>
                {filteredMembers.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '12px 14px' }}>Aucun membre trouvé</p>
                ) : filteredMembers.map(m => {
                  const selected = selectedUsers.includes(m.userId)
                  return (
                    <div key={m.userId} onClick={() => toggleUser(m.userId)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                      cursor: 'pointer', borderBottom: '1px solid var(--color-border-subtle)',
                      background: selected ? 'var(--color-accent-subtle)' : 'transparent',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${selected ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
                        background: selected ? 'var(--color-accent-default)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {selected && <Check size={11} strokeWidth={2.5} color="#fff" />}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{m.name ?? m.email}</p>
                        {m.name && m.email && <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{m.email}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
              {selectedUsers.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                  {selectedUsers.length} personne{selectedUsers.length > 1 ? 's' : ''} sélectionnée{selectedUsers.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, height: 36, background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving || (visibility === 'SPECIFIC' && selectedUsers.length === 0)} style={{ flex: 2, height: 36, background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', color: '#fff', fontFamily: 'var(--font-primary)', opacity: (saving || (visibility === 'SPECIFIC' && selectedUsers.length === 0)) ? 0.6 : 1 }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Vue principale ───────────────────────────────────────────────────────────

export function DocumentsView({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { limits } = usePlan()

  const load = useCallback(async () => {
    setLoading(true)
    const [docsRes, membersRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/documents`),
      fetch(`/api/projects/${projectId}/members`),
    ])
    if (docsRes.ok) setDocuments(await docsRes.json())
    if (membersRes.ok) setMembers(await membersRes.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleFiles = async (files: FileList) => {
    if (!limits.documents) {
      toast(
        'Le stockage de documents est réservé aux plans Pro et Business.',
        'error',
        { action: { label: 'Voir les tarifs', href: '/tarifs' } }
      )
      setUpgradeOpen(true)
      return
    }
    if (!files.length) return

    const supabase = createClient()
    setUploading(true)
    setUploadErrors([])
    const errors: string[] = []

    for (const file of Array.from(files)) {
      // Validation format
      if (!Object.keys(ALLOWED_MIME).includes(file.type)) {
        errors.push(`"${file.name}" — format non accepté. Formats autorisés : PDF, Word (.doc, .docx), Excel (.xls, .xlsx), images (JPG, PNG, GIF, WEBP, SVG).`)
        continue
      }
      // Validation taille
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`"${file.name}" — fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale est de 50 Mo par fichier.`)
        continue
      }

      const storagePath = `${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file)
      if (uploadError) {
        errors.push(`"${file.name}" — échec de l'envoi vers le stockage. Veuillez réessayer.`)
        continue
      }

      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, storagePath, mimeType: file.type || null, size: file.size }),
      })
      if (!res.ok) {
        const d = await res.json()
        // Récupérer l'usage actuel pour les erreurs de quota
        let errorMsg = d.error ?? `Erreur lors de l'enregistrement de "${file.name}".`
        if (d.error?.includes('Quota')) {
          const usageRes = await fetch(`/api/projects/${projectId}/documents/usage`)
          if (usageRes.ok) {
            const { used, quota } = await usageRes.json()
            errorMsg = `"${file.name}" — quota de stockage atteint (${formatSize(used)} utilisés sur ${formatSize(quota)} autorisés). Supprimez des fichiers ou passez au plan Business.`
          }
        }
        errors.push(errorMsg)
        await supabase.storage.from(BUCKET).remove([storagePath])
      }
    }

    setUploading(false)
    if (errors.length > 0) setUploadErrors(errors)
    await load()
  }

  const handleDownload = async (doc: Document) => {
    const res = await fetch(`/api/projects/${projectId}/documents/${doc.id}/url`)
    if (!res.ok) { toast('Impossible de générer le lien', 'error'); return }
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  const handleDelete = async (doc: Document) => {
    if (confirmDelete !== doc.id) { setConfirmDelete(doc.id); return }
    const res = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, { method: 'DELETE' })
    if (res.ok) { toast('Document supprimé'); await load() }
    else { const d = await res.json(); toast(d.error ?? 'Erreur', 'error') }
    setConfirmDelete(null)
  }

  // Bloquer accès si plan FREE
  if (!loading && !limits.documents) {
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 16, textAlign: 'center', padding: 32 }}>
          <FolderOpen size={40} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Stockage de documents</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', maxWidth: 360, lineHeight: 1.6 }}>
            Le stockage de documents est disponible sur les plans Pro et Business. Passez à un plan supérieur pour attacher des fichiers à vos projets.
          </p>
          <button onClick={() => setUpgradeOpen(true)} style={{ height: 36, padding: '0 16px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-primary)' }}>
            Voir les tarifs
          </button>
        </div>
        {upgradeOpen && <UpgradeModal feature="le stockage de documents" onClose={() => setUpgradeOpen(false)} />}
      </>
    )
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <StorageBar projectId={projectId} />

      {/* Zone drag-and-drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
          borderRadius: 'var(--radius-lg)', padding: '32px 24px',
          textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
          background: dragOver ? 'var(--color-accent-subtle)' : 'var(--color-bg-secondary)',
          transition: 'all 150ms', marginBottom: 24,
        }}
      >
        <Upload size={28} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 10px', display: 'block' }} />
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
          {uploading ? 'Envoi en cours…' : 'Déposer des fichiers ici ou cliquer pour sélectionner'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          PDF, Word, Excel, images — 50 Mo max par fichier
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.svg"
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Zone d'erreurs persistante */}
      {uploadErrors.length > 0 && (
        <div style={{
          border: '1px solid #fca5a5', borderRadius: 'var(--radius-lg)',
          background: '#fef2f2', padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: uploadErrors.length > 1 ? 10 : 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: uploadErrors.length > 1 ? 8 : 0 }}>
              {uploadErrors.length === 1 ? 'Échec d\'envoi' : `${uploadErrors.length} fichiers non envoyés`}
            </p>
            <button onClick={() => setUploadErrors([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', display: 'flex', padding: 2, flexShrink: 0 }}>
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {uploadErrors.map((err, i) => (
              <li key={i} style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid #fca5a5' }}>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Liste des documents */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 50, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : documents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, gap: 10, textAlign: 'center' }}>
          <FolderOpen size={36} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucun document</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Déposez des fichiers ci-dessus pour les attacher à ce projet.</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* En-tête */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 110px 100px', gap: 0, padding: '8px 16px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            {['Nom', 'Type', 'Taille', 'Date', 'Actions'].map((h, i) => (
              <span key={h} style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', textAlign: i >= 4 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>

          {/* Lignes */}
          {documents.map((doc, idx) => {
            const Icon = getFileIcon(doc.mimeType)
            const VisIcon = VISIBILITY_CONFIG[doc.visibility].icon
            const visColor = VISIBILITY_CONFIG[doc.visibility].color
            const visLabel = VISIBILITY_CONFIG[doc.visibility].label
            return (
              <div
                key={doc.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 110px 100px', gap: 0,
                  padding: '10px 16px', alignItems: 'center',
                  borderBottom: idx < documents.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  background: 'var(--color-bg-primary)',
                }}
              >
                {/* Nom + badge visibilité */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Icon size={15} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name}
                  </span>
                  <span title={visLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 20, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', flexShrink: 0 }}>
                    <VisIcon size={10} strokeWidth={1.5} style={{ color: visColor }} />
                    <span style={{ fontSize: 10, color: visColor, fontWeight: 500 }}>{visLabel}</span>
                  </span>
                </div>

                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{getTypeLabel(doc.mimeType)}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatSize(doc.size)}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{formatDate(doc.createdAt)}</span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingDoc(doc)} title="Modifier la visibilité" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                    <Pencil size={13} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => handleDownload(doc)} title="Télécharger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                    <Download size={13} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    title={confirmDelete === doc.id ? 'Confirmer la suppression' : 'Supprimer'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: confirmDelete === doc.id ? 'var(--color-danger-bg, #fee2e2)' : 'none', border: 'none', cursor: 'pointer', color: confirmDelete === doc.id ? '#ef4444' : 'var(--color-text-tertiary)' }}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal visibilité */}
      {editingDoc && (
        <VisibilityModal
          doc={editingDoc}
          members={members}
          onClose={() => setEditingDoc(null)}
          onSaved={load}
        />
      )}

      {upgradeOpen && <UpgradeModal feature="le stockage de documents" onClose={() => setUpgradeOpen(false)} />}
    </div>
  )
}
