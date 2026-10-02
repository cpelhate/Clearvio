'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface SearchResult {
  id: string; title: string; status: string; projectId?: string; plannedDate?: string
}
interface SearchResults {
  tasks: SearchResult[]; projects: (SearchResult & { name: string })[]; milestones: SearchResult[]
}

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ tasks: [], projects: [], milestones: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ tasks: [], projects: [], milestones: [] })
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ tasks: [], projects: [], milestones: [] })
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (res.ok) setResults(await res.json())
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const allResults = [
    ...results.tasks.map(r => ({ ...r, _type: 'task' as const })),
    ...results.projects.map(r => ({ ...r, title: r.name, _type: 'project' as const })),
    ...results.milestones.map(r => ({ ...r, _type: 'milestone' as const })),
  ]

  const navigate = (r: typeof allResults[0]) => {
    onClose()
    if (r._type === 'project') router.push(`/projets/${r.id}`)
    else router.push(`/projets/${r.projectId}`)
  }

  const STATUS_LABELS: Record<string, string> = {
    A_FAIRE: 'À faire', EN_COURS: 'En cours', TERMINE: 'Terminé', BLOQUE: 'Bloqué', EN_REVUE: 'En revue',
    A_VENIR: 'À venir', EN_RETARD: 'En retard', ACTIF: 'Actif', EN_PAUSE: 'En pause',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: '15vh', left: '50%', transform: 'translateX(-50%)',
        width: 580, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        zIndex: 201, overflow: 'hidden',
        border: '1px solid var(--color-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Search size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une tâche, un projet, un jalon…"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: 'var(--color-text-primary)', outline: 'none' }}
          />
          {loading && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>…</span>}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 2 }}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {allResults.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {results.tasks.length > 0 && (
              <>
                <div style={{ padding: '6px 16px 2px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Tâches</div>
                {results.tasks.map(r => (
                  <div key={r.id} onClick={() => navigate({ ...r, _type: 'task' })} style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 13, flex: 1, color: 'var(--color-text-primary)' }}>{r.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{STATUS_LABELS[r.status] ?? r.status}</span>
                  </div>
                ))}
              </>
            )}
            {results.projects.length > 0 && (
              <>
                <div style={{ padding: '6px 16px 2px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Projets</div>
                {results.projects.map(r => (
                  <div key={r.id} onClick={() => navigate({ ...r, title: r.name, _type: 'project' })} style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 13, flex: 1, color: 'var(--color-text-primary)' }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{STATUS_LABELS[r.status] ?? r.status}</span>
                  </div>
                ))}
              </>
            )}
            {results.milestones.length > 0 && (
              <>
                <div style={{ padding: '6px 16px 2px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Jalons</div>
                {results.milestones.map(r => (
                  <div key={r.id} onClick={() => navigate({ ...r, _type: 'milestone' })} style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 13, flex: 1, color: 'var(--color-text-primary)' }}>{r.title}</span>
                    {r.plannedDate && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{new Date(r.plannedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {query.length >= 2 && !loading && allResults.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            Aucun résultat pour « {query} »
          </div>
        )}

        {query.length < 2 && (
          <div style={{ padding: '16px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Tapez au moins 2 caractères…
          </div>
        )}

        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          <span>↵ Ouvrir</span>
          <span>Échap Fermer</span>
        </div>
      </div>
    </>
  )
}
