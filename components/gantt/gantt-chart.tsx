'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Calendar } from 'lucide-react'
import { Task } from '@/types/task'
import { Milestone } from '@/types/milestone'

interface GanttChartProps {
  tasks: Task[]
  milestones: Milestone[]
  projectId: string
}

type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter Year'

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  'Day': 'Jour',
  'Week': 'Semaine',
  'Month': 'Mois',
  'Quarter Year': 'Trimestre',
}

function taskToGantt(task: Task) {
  const start = task.startDate
    ? new Date(task.startDate)
    : new Date()
  const end = task.dueDate
    ? new Date(task.dueDate)
    : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Garantir que end >= start
  if (end <= start) end.setDate(start.getDate() + 1)

  return {
    id: task.id,
    name: task.title,
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    progress: task.status === 'TERMINE' ? 100 : task.status === 'EN_COURS' ? 50 : task.status === 'EN_REVUE' ? 75 : 0,
    dependencies: '',
    custom_class: task.status === 'BLOQUE' ? 'bar-blocked' : task.level > 0 ? 'bar-subtask' : '',
  }
}

function milestoneToGantt(milestone: Milestone) {
  const date = new Date(milestone.plannedDate)
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + 1)
  return {
    id: `milestone-${milestone.id}`,
    name: `◆ ${milestone.title}`,
    start: date.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
    progress: milestone.status === 'ATTEINT' ? 100 : 0,
    dependencies: '',
    custom_class: 'bar-milestone',
  }
}

export function GanttChart({ tasks, milestones }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ganttRef = useRef<any>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('Week')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Injection dynamique du CSS frappe-gantt (servi depuis /public)
    const cssId = 'frappe-gantt-css'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = '/frappe-gantt.css'
      document.head.appendChild(link)
    }
  }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return

    const rootTasks = tasks.filter(t => !t.parentId)
    if (rootTasks.length === 0 && milestones.length === 0) return

    const ganttTasks = [
      ...rootTasks.map(taskToGantt),
      ...milestones.map(milestoneToGantt),
    ]

    if (ganttTasks.length === 0) return

    // Cleanup précédent
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    import('frappe-gantt').then(({ default: Gantt }) => {
      if (!containerRef.current) return
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ganttRef.current = new (Gantt as any)(containerRef.current, ganttTasks, {
          view_mode: viewMode,
          language: 'fr',
          popup_trigger: 'click',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          custom_popup_html: (task: any) => {
            const isMilestone = task.name.startsWith('◆')
            return `
              <div>
                <p class="title">${task.name}</p>
                <p class="subtitle">
                  ${task._start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  ${!isMilestone ? ` → ${task._end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}
                </p>
                ${!isMilestone ? `<p class="subtitle" style="margin-top:4px">Avancement : ${task.progress}%</p>` : ''}
              </div>
            `
          },
        })
      } catch (e) {
        console.error('Erreur Gantt:', e)
      }
    })
  }, [mounted, tasks, milestones, viewMode])

  const handleExport = async () => {
    if (!containerRef.current) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim() || '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = 'gantt-clearvio.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      // Fallback : SVG export
      const svg = containerRef.current.querySelector('svg')
      if (!svg) return
      const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = 'gantt-clearvio.svg'
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!mounted) return null

  const hasTasks = tasks.filter(t => !t.parentId).length > 0 || milestones.length > 0

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        {/* Sélecteur de vue */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', padding: 3 }}>
          {(['Day', 'Week', 'Month', 'Quarter Year'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                height: 28, padding: '0 12px',
                background: viewMode === mode ? 'var(--color-bg-elevated)' : 'transparent',
                border: viewMode === mode ? '1px solid var(--color-border-default)' : 'none',
                borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer',
                color: viewMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-primary)',
                fontWeight: viewMode === mode ? 500 : 400,
                transition: 'all 150ms',
                boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {VIEW_MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Légende */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginRight: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 24, height: 10, background: 'var(--color-accent-default)', borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Tâche</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, background: 'var(--color-warning-default)', transform: 'rotate(45deg)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Jalon</span>
            </div>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)',
            }}
          >
            <Download size={14} strokeWidth={1.5} />
            Exporter PNG
          </button>
        </div>
      </div>

      {/* Zone Gantt */}
      {!hasTasks ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
          <Calendar size={40} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Aucune donnée à afficher</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', maxWidth: 340 }}>
            Créez des tâches avec des dates de début et fin, ou des jalons, pour visualiser le planning.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'auto',
          padding: 8,
        }}>
          <div ref={containerRef} style={{ minWidth: 600 }} />
        </div>
      )}
    </div>
  )
}
