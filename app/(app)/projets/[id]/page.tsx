'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings2, Users, LayoutList, Columns3, GanttChart as GanttChartIcon, CalendarDays, ShieldAlert, Diamond, Package, Target, FileText, Paperclip, GitFork } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/projets/status-badge'
import { Project } from '@/types/project'
import { useTasks } from '@/hooks/use-tasks'
import { TaskListView } from '@/components/taches/task-list-view'
import { TaskKanbanView } from '@/components/taches/task-kanban-view'
import { MilestonesView } from '@/components/jalons/milestones-view'
import { DeliverablesView } from '@/components/jalons/deliverables-view'
import { ObjectivesView } from '@/components/jalons/objectives-view'
import { GanttChart } from '@/components/gantt/gantt-chart'
import { useGanttData } from '@/hooks/use-gantt-data'
import { EditProjectModal } from '@/components/projets/edit-project-modal'
import { RisksView } from '@/components/risques/risks-view'
import { MembersView } from '@/components/projets/members-view'
import { DocumentsView } from '@/components/documents/documents-view'
import { DependenciesView } from '@/components/dependencies/dependencies-view'
import { CalendarView } from '@/components/calendrier/calendar-view'
import { ProjectMember } from '@/types/project'
import { Milestone } from '@/types/milestone'

const tabs = [
  { id: 'liste', label: 'Liste', icon: LayoutList },
  { id: 'kanban', label: 'Kanban', icon: Columns3 },
  { id: 'gantt', label: 'Gantt', icon: GanttChartIcon },
  { id: 'calendrier', label: 'Calendrier', icon: CalendarDays },
  { id: 'risques', label: 'Risques', icon: ShieldAlert },
  { id: 'jalons', label: 'Jalons', icon: Diamond },
  { id: 'livrables', label: 'Livrables', icon: Package },
  { id: 'objectifs', label: 'Objectifs', icon: Target },
  { id: 'dependances', label: 'Dépendances', icon: GitFork },
  { id: 'membres', label: 'Membres', icon: Users },
  { id: 'documents', label: 'Documents', icon: Paperclip },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProjetPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('liste')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setProject(data); setLoading(false) })
  }, [id])

  if (loading) return (
    <>
      <Header title="Chargement..." />
      <div style={{ padding: 'var(--space-10)' }}>
        <div style={{ height: 120, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: 16 }} />
        <div style={{ height: 48, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }} />
      </div>
    </>
  )

  if (!project) return (
    <>
      <Header title="Projet introuvable" />
      <div style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Ce projet n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        <button onClick={() => router.push('/projets')} style={{ marginTop: 16, color: 'var(--color-accent-default)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          ← Retour aux projets
        </button>
      </div>
    </>
  )

  return (
    <>
      <Header
        title={project.name}
        breadcrumbs={[{ label: 'Projets', href: '/projets' }]}
      />

      <div style={{ padding: 'var(--space-10) var(--space-10) 0' }}>
        {/* Retour */}
        <button
          onClick={() => router.push('/projets')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-tertiary)', fontSize: 13,
          }}
        >
          <ArrowLeft size={15} strokeWidth={1.5} /> Retour aux projets
        </button>

        {/* Header projet */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          borderLeft: `4px solid ${project.color}`,
          padding: 24, marginBottom: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                  {project.name}
                </h1>
                <StatusBadge status={project.status} />
              </div>
              {project.description && (
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 600 }}>
                  {project.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                {project.startDate && (
                  <div>
                    <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                      Début
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {formatDate(project.startDate)}
                    </p>
                  </div>
                )}
                {project.endDate && (
                  <div>
                    <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                      Fin prévue
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {formatDate(project.endDate)}
                    </p>
                  </div>
                )}
                {project.category && (
                  <div>
                    <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                      Catégorie
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{project.category}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                    Membres
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {project.members.length} membre{project.members.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                href={`/projets/${id}/rapport`}
                target="_blank"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
                  background: 'transparent', border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer',
                  color: 'var(--color-text-secondary)', textDecoration: 'none',
                }}
              >
                <FileText size={14} strokeWidth={1.5} /> Rapport
              </Link>
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
                  background: 'transparent', border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}>
                <Settings2 size={14} strokeWidth={1.5} /> Paramètres
              </button>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--color-border-subtle)',
          marginTop: 0, gap: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}>
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  height: 44, padding: '0 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--color-accent-default)' : 'var(--color-text-tertiary)',
                  borderBottom: isActive ? '2px solid var(--color-accent-default)' : '2px solid transparent',
                  transition: 'all 150ms',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} strokeWidth={1.5} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {project && showSettings && (
        <EditProjectModal
          project={project}
          open={showSettings}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false)
            fetch(`/api/projects/${id}`).then(r => r.ok ? r.json() : null).then(data => { if (data) setProject(data) })
          }}
          onDeleted={() => router.push('/projets')}
        />
      )}

      {/* Contenu de l'onglet */}
      <div style={{ padding: 'var(--space-8) var(--space-10)' }}>
        <TabContent tab={activeTab} projectId={id} members={project.members} />
      </div>
    </>
  )
}

function TabContent({ tab, projectId, members }: { tab: string; projectId: string; members: ProjectMember[] }) {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId)
  const [milestones, setMilestones] = useState<Milestone[]>([])

  useEffect(() => {
    if (tab === 'calendrier') {
      fetch(`/api/projects/${projectId}/milestones`)
        .then(r => r.ok ? r.json() : [])
        .then(setMilestones)
    }
  }, [tab, projectId])

  const comingSoon = (label: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</p>
      <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>Cette vue sera disponible prochainement.</p>
    </div>
  )

  const taskLoadingSkeleton = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 40, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
    </div>
  )

  switch (tab) {
    case 'liste':
      return loading ? taskLoadingSkeleton : (
        <TaskListView
          tasks={tasks}
          projectId={projectId}
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
        />
      )
    case 'kanban':
      return loading ? taskLoadingSkeleton : (
        <TaskKanbanView
          tasks={tasks}
          projectId={projectId}
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
        />
      )
    case 'gantt':    return <GanttViewTab projectId={projectId} />
    case 'calendrier': return <CalendarView tasks={tasks} milestones={milestones} />
    case 'risques':  return <RisksView projectId={projectId} />
    case 'jalons':   return <MilestonesView projectId={projectId} />
    case 'livrables': return <DeliverablesView projectId={projectId} />
    case 'objectifs': return <ObjectivesView projectId={projectId} />
    case 'dependances': return <DependenciesView projectId={projectId} />
    case 'membres':  return <MembersView members={members} />
    case 'documents': return <DocumentsView projectId={projectId} />
    default: return null
  }
}

function GanttViewTab({ projectId }: { projectId: string }) {
  const { tasks, milestones, loading } = useGanttData(projectId)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 48, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  return <GanttChart tasks={tasks} milestones={milestones} projectId={projectId} />
}
