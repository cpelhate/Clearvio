'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Settings2, Users, LayoutList, Columns3, GanttChart as GanttChartIcon, CalendarDays, ShieldAlert, Diamond, Package, Target } from 'lucide-react'
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

const tabs = [
  { id: 'liste', label: 'Liste', icon: LayoutList },
  { id: 'kanban', label: 'Kanban', icon: Columns3 },
  { id: 'gantt', label: 'Gantt', icon: GanttChartIcon },
  { id: 'calendrier', label: 'Calendrier', icon: CalendarDays },
  { id: 'risques', label: 'Risques', icon: ShieldAlert },
  { id: 'jalons', label: 'Jalons', icon: Diamond },
  { id: 'livrables', label: 'Livrables', icon: Package },
  { id: 'objectifs', label: 'Objectifs', icon: Target },
  { id: 'membres', label: 'Membres', icon: Users },
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
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
              background: 'transparent', border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer',
              color: 'var(--color-text-secondary)',
            }}>
              <Settings2 size={14} strokeWidth={1.5} /> Paramètres
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--color-border-subtle)',
          marginTop: 0, gap: 0,
        }}>
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

      {/* Contenu de l'onglet */}
      <div style={{ padding: 'var(--space-8) var(--space-10)' }}>
        <TabContent tab={activeTab} projectId={id} />
      </div>
    </>
  )
}

function TabContent({ tab, projectId }: { tab: string; projectId: string }) {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId)

  const comingSoon = (label: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</p>
      <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>Cette vue sera disponible prochainement.</p>
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 40, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
    </div>
  )

  switch (tab) {
    case 'liste':
      return (
        <TaskListView
          tasks={tasks}
          projectId={projectId}
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
        />
      )
    case 'kanban':
      return (
        <TaskKanbanView
          tasks={tasks}
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
        />
      )
    case 'gantt':    return <GanttViewTab projectId={projectId} />
    case 'calendrier': return comingSoon('Vue Calendrier')
    case 'risques':  return comingSoon('Registre des risques')
    case 'jalons':   return <MilestonesView projectId={projectId} />
    case 'livrables': return <DeliverablesView projectId={projectId} />
    case 'objectifs': return <ObjectivesView projectId={projectId} />
    case 'membres':  return comingSoon('Membres du projet')
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
