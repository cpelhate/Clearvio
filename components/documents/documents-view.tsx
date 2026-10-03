'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Upload, File, FileText, Image, Trash2, Download, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

const BUCKET = 'documents-clearvio'

interface DocumentsViewProps {
  projectId: string
}

interface Document {
  id: string
  projectId: string
  name: string
  storagePath: string
  mimeType: string | null
  size: number | null
  uploadedBy: string
  createdAt: string
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
  if (mimeType.includes('pdf') || mimeType.includes('text')) return FileText
  return File
}

export function DocumentsView({ projectId }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/documents`)
    if (res.ok) setDocuments(await res.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleFiles = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)
    const supabase = createClient()

    for (const file of Array.from(files)) {
      const storagePath = `${projectId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file)
      if (error) { toast(`Échec de l'upload : ${file.name}`, 'error'); continue }

      await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          storagePath,
          mimeType: file.type || null,
          size: file.size,
        }),
      })
    }
    setUploading(false)
    await load()
  }

  const handleDownload = async (doc: Document) => {
    const supabase = createClient()
    // Essayer d'abord l'URL publique
    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(doc.storagePath)
    if (publicData?.publicUrl) {
      window.open(publicData.publicUrl, '_blank')
      return
    }
    // Fallback sur une URL signée
    const { data: signedData } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storagePath, 60)
    if (signedData?.signedUrl) window.open(signedData.signedUrl, '_blank')
  }

  const handleDelete = async (doc: Document) => {
    if (confirmDelete !== doc.id) { setConfirmDelete(doc.id); return }
    await fetch(`/api/projects/${projectId}/documents/${doc.id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await load()
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Zone drag-and-drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-accent-default)' : 'var(--color-border-default)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: 40,
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          background: dragOver ? 'var(--color-accent-bg)' : 'var(--color-bg-secondary)',
          transition: 'all 150ms',
          marginBottom: 24,
        }}
      >
        <Upload
          size={32}
          strokeWidth={1.5}
          style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 12px', display: 'block' }}
        />
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {uploading ? 'Envoi en cours...' : 'Déposer des fichiers ici'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          ou cliquez pour sélectionner — max 50 Mo par fichier
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Liste des documents */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 48, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12 }}>
          <FolderOpen size={40} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucun document</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            Déposez des fichiers ci-dessus pour les attacher à ce projet.
          </p>
        </div>
      ) : (
        <div style={{
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {/* En-tête tableau */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 80px 120px 80px',
            gap: 0,
            padding: '8px 16px',
            background: 'var(--color-bg-secondary)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
              Nom
            </span>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
              Type
            </span>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
              Taille
            </span>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
              Date
            </span>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
              Actions
            </span>
          </div>

          {/* Lignes */}
          {documents.map((doc, idx) => {
            const Icon = getFileIcon(doc.mimeType)
            const isLast = idx === documents.length - 1
            return (
              <div
                key={doc.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 80px 120px 80px',
                  gap: 0,
                  padding: '10px 16px',
                  alignItems: 'center',
                  borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
                  background: 'var(--color-bg-primary)',
                }}
              >
                {/* Nom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Icon size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  <span style={{
                    fontSize: 14, color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {doc.name}
                  </span>
                </div>

                {/* Type */}
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {doc.mimeType ? doc.mimeType.split('/')[1]?.toUpperCase() ?? doc.mimeType : '—'}
                </span>

                {/* Taille */}
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {formatSize(doc.size)}
                </span>

                {/* Date */}
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {formatDate(doc.createdAt)}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleDownload(doc)}
                    title="Télécharger"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    <Download size={14} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    title={confirmDelete === doc.id ? 'Confirmer la suppression' : 'Supprimer'}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                      background: confirmDelete === doc.id ? 'var(--color-danger-bg)' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: confirmDelete === doc.id ? 'var(--color-danger-default)' : 'var(--color-text-tertiary)',
                    }}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Note bucket */}
      {/* NOTE : Le bucket 'documents-clearvio' doit être créé manuellement dans le dashboard Supabase.
          Politiques recommandées :
          - Authenticated users can upload (INSERT)
          - Authenticated users can read files (SELECT)
          - Authenticated users can delete their files (DELETE)
          Pour simplifier le MVP, configurer le bucket en "Public" permet d'utiliser getPublicUrl()
          sans signed URLs. */}
    </div>
  )
}
