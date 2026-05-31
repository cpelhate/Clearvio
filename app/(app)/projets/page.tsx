'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FolderKanban, Plus, Search, Calendar, Users } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { CreateProjectModal } from '@/components/projets/create-project-modal'
import { StatusBadge } from '@/components/projets/status-badge'
import { Project } from '@/types/project'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProjetsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/projects')
    if (res.ok) setProjects(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Header title="Projets" />
      <div style={{ padding: 'var(--space-10)' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={15} strokeWidth={1.5} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-tertiary)', pointerEvents: 'none',
            }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un projet..."
              style={{
                width: '100%', height: 36, padding: '0 12px 0 34px',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)', fontSize: 14,
                background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                outline: 'none', fontFamily: 'var(--font-primary)',
              }}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px',
              background: 'var(--color-accent-default)', border: 'none',
              borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', color: '#fff', flexShrink: 0, marginLeft: 12,
            }}
          >
            <Plus size={16} strokeWidth={1.5} /> Nouveau projet
          </button>
        </div>

        {/* Compteur */}
        {!loading && projects.length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
            {filtered.length} projet{filtered.length > 1 ? 's' : ''}
          </p>
        )}

        {/* État vide */}
        {!loading && projects.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 400, gap: 16,
          }}>
            <FolderKanban size={48} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Aucun projet
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 320 }}>
              Créez votre premier projet pour commencer à organiser votre travail.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px',
                background: 'var(--color-accent-default)', border: 'none',
                borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', color: '#fff',
              }}
            >
              <Plus size={16} strokeWidth={1.5} /> Créer un projet
            </button>
          </div>
        )}

        {/* Skeleton loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 160, background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* Grille de projets */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map(project => (
              <div
                key={project.id}
                onClick={() => router.push(`/projets/${project.id}`)}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20, cursor: 'pointer',
                  transition: 'all 150ms var(--ease-default)',
                  borderLeft: `4px solid ${project.color}`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-default)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-subtle)'
                }}
              >
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h3 style={{
                    fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)',
                    letterSpacing: '-0.01em', flex: 1, marginRight: 12,
                  }}>
                    {project.name}
                  </h3>
                  <StatusBadge status={project.status} />
                </div>

                {/* Description */}
                {project.description && (
                  <p style={{
                    fontSize: 13, color: 'var(--color-text-secondary)',
                    marginBottom: 16, lineHeight: 1.6,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {project.description}
                  </p>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {project.endDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                      <Calendar size={13} strokeWidth={1.5} />
                      {formatDate(project.endDate)}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                    <Users size={13} strokeWidth={1.5} />
                    {project.members.length} membre{project.members.length > 1 ? 's' : ''}
                  </div>
                  {project.category && (
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)',
                    }}>
                      {project.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Résultat vide après filtre */}
        {!loading && projects.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
            <p style={{ fontSize: 15 }}>Aucun projet ne correspond à votre recherche.</p>
          </div>
        )}
      </div>

      <CreateProjectModal open={showModal} onClose={() => { setShowModal(false); load() }} />
    </>
  )
}
