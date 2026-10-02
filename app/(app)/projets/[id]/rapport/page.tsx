'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Project, PROJECT_STATUS_LABELS } from '@/types/project'
import { Task, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/task'
import { Milestone, MILESTONE_STATUS_LABELS, Deliverable, DELIVERABLE_STATUS_LABELS, ProjectObjective, OBJECTIVE_STATUS_LABELS } from '@/types/milestone'
import { ProjectRisk, RISK_PROBABILITY_LABELS, RISK_IMPACT_LABELS, RISK_LEVEL_LABELS, getRiskLevel } from '@/types/risk'
import { useBreakpoint } from '@/lib/hooks/use-breakpoint'

interface ReportData {
  project: Project
  tasks: Task[]
  milestones: Milestone[]
  risks: ProjectRisk[]
  objectives: ProjectObjective[]
  deliverables: Deliverable[]
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-tertiary)',
  marginBottom: 12,
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-tertiary)',
  borderBottom: '1px solid var(--color-border-subtle)',
  background: 'var(--color-bg-secondary)',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-border-subtle)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 32,
}

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border-subtle)',
  margin: '28px 0',
}

export default function RapportPage() {
  const { id } = useParams<{ id: string }>()
  const bp = useBreakpoint()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}/report`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [id])

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const reportPadding = bp === 'mobile' ? '24px 16px' : '40px 32px'

  if (loading) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: reportPadding }}>
      <style>{`@media print { .no-print { display: none !important; } body { font-size: 11pt; color: #000; } .page-break { page-break-before: always; } }`}</style>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ height: 32, width: 120, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }} />
        <div style={{ height: 32, width: 160, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }} />
      </div>
      {[160, 100, 80, 200, 150].map((h, i) => (
        <div key={i} style={{ height: h, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: 16 }} />
      ))}
    </div>
  )

  if (error || !data) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: reportPadding, textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>Impossible de charger le rapport.</p>
      <Link href={`/projets/${id}`} style={{ color: 'var(--color-accent-default)', fontSize: 14 }}>← Retour au projet</Link>
    </div>
  )

  const { project, tasks, milestones, risks, objectives, deliverables } = data
  const completedTasks = tasks.filter(t => t.status === 'TERMINE').length
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: reportPadding, background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <style>{`@media print { .no-print { display: none !important; } body { font-size: 11pt; color: #000; background: #fff; } .page-break { page-break-before: always; } }`}</style>

      {/* Barre d'action */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <Link
          href={`/projets/${id}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--color-text-secondary)', textDecoration: 'none',
            fontSize: 13,
          }}
        >
          <ArrowLeft size={15} strokeWidth={1.5} /> Retour au projet
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px',
            background: 'var(--color-accent-default)', border: 'none',
            borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer',
            color: '#fff', fontWeight: 500,
          }}
        >
          <Printer size={14} strokeWidth={1.5} /> Imprimer / Enregistrer en PDF
        </button>
      </div>

      {/* En-tête rapport */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
            Rapport de projet
          </p>
          <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            Clearvio
          </p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Généré le {today}</p>
      </div>

      <div style={dividerStyle} />

      {/* Infos projet */}
      <div style={sectionStyle}>
        <p style={sectionTitleStyle}>Informations du projet</p>
        <div style={{ borderLeft: `4px solid ${project.color}`, paddingLeft: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            {project.name}
          </h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Statut : <strong>{PROJECT_STATUS_LABELS[project.status]}</strong>
            </span>
            {project.category && (
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Catégorie : <strong>{project.category}</strong>
              </span>
            )}
            {project.startDate && (
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Début : <strong>{formatDate(project.startDate)}</strong>
              </span>
            )}
            {project.endDate && (
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Fin prévue : <strong>{formatDate(project.endDate)}</strong>
              </span>
            )}
          </div>
          {project.description && (
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div style={dividerStyle} />

      {/* Résumé */}
      <div style={sectionStyle}>
        <p style={sectionTitleStyle}>Résumé</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Tâches', value: tasks.length },
            { label: 'Jalons', value: milestones.length },
            { label: 'Risques', value: risks.length },
            { label: 'Avancement', value: `${completionRate}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{value}</p>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tâches */}
      {tasks.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Tâches ({tasks.length})</p>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Titre</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Priorité</th>
                  <th style={thStyle}>Échéance</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td style={tdStyle}>{task.title}</td>
                    <td style={tdStyle}>{TASK_STATUS_LABELS[task.status]}</td>
                    <td style={tdStyle}>{TASK_PRIORITY_LABELS[task.priority]}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(task.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Jalons */}
      {milestones.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Jalons ({milestones.length})</p>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Titre</th>
                  <th style={thStyle}>Date prévue</th>
                  <th style={thStyle}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map(m => (
                  <tr key={m.id}>
                    <td style={tdStyle}>{m.title}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(m.plannedDate)}</td>
                    <td style={tdStyle}>{MILESTONE_STATUS_LABELS[m.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Risques */}
      {risks.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Risques ({risks.length})</p>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Titre</th>
                  <th style={thStyle}>Probabilité</th>
                  <th style={thStyle}>Impact</th>
                  <th style={thStyle}>Niveau</th>
                </tr>
              </thead>
              <tbody>
                {risks.map(r => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.title}</td>
                    <td style={tdStyle}>{RISK_PROBABILITY_LABELS[r.probability]}</td>
                    <td style={tdStyle}>{RISK_IMPACT_LABELS[r.impact]}</td>
                    <td style={tdStyle}>{RISK_LEVEL_LABELS[getRiskLevel(r.probability, r.impact)]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Objectifs */}
      {objectives.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Objectifs ({objectives.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {objectives.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: 16, lineHeight: 1 }}>●</span>
                  <span style={{ fontSize: 14, color: 'var(--color-text-primary)', flex: 1 }}>{o.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{OBJECTIVE_STATUS_LABELS[o.status]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Livrables */}
      {deliverables.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Livrables ({deliverables.length})</p>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Titre</th>
                  <th style={thStyle}>Date prévue</th>
                  <th style={thStyle}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map(d => (
                  <tr key={d.id}>
                    <td style={tdStyle}>{d.title}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(d.plannedDate)}</td>
                    <td style={tdStyle}>{DELIVERABLE_STATUS_LABELS[d.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
