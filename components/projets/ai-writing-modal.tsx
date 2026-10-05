'use client'

import { useState } from 'react'
import { X, Sparkles, BookOpen, FileText, ClipboardCheck, Copy, Check, RefreshCw, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

type WriteMode = 'user-stories' | 'spec' | 'test-plan'

interface UserStory {
  title: string
  asA: string
  iWant: string
  soThat: string
  acceptanceCriteria: string[]
  priority: 'HAUTE' | 'NORMALE' | 'BASSE'
  estimate: string
}

interface SpecSection {
  heading: string
  content: string
}

interface TestCase {
  id: string
  title: string
  preconditions: string
  steps: string[]
  expectedResult: string
  priority: 'HAUTE' | 'NORMALE' | 'BASSE'
}

interface UserStoriesResult { stories: UserStory[] }
interface SpecResult { title: string; version: string; sections: SpecSection[] }
interface TestPlanResult { title: string; objective: string; testCases: TestCase[] }

type AiResult = UserStoriesResult | SpecResult | TestPlanResult

const MODES: { id: WriteMode; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'user-stories', label: 'User Stories', description: 'Génère des US agiles à partir d\'une fonctionnalité', icon: BookOpen },
  { id: 'spec', label: 'Spécification fonctionnelle', description: 'Document structuré avec règles métier et périmètre', icon: FileText },
  { id: 'test-plan', label: 'Cahier de recettes', description: 'Cas de tests avec critères d\'acceptance', icon: ClipboardCheck },
]

const PRIORITY_COLORS: Record<string, string> = {
  HAUTE: 'var(--color-danger-default)',
  NORMALE: 'var(--color-accent-default)',
  BASSE: 'var(--color-text-tertiary)',
}

const PLACEHOLDERS: Record<WriteMode, string> = {
  'user-stories': 'Ex : Système de notifications en temps réel pour les mises à jour de tâches — l\'utilisateur doit pouvoir choisir ses préférences de notification par projet.',
  'spec': 'Ex : Module de gestion des congés — les employés soumettent des demandes, les managers approuvent ou refusent, le solde est mis à jour automatiquement.',
  'test-plan': 'Ex : Fonctionnalité d\'export PDF des rapports de projet — tester les différents formats, la gestion des projets sans données, et les droits d\'accès.',
}

export function AiWritingModal({
  projectId,
  onClose,
  onImportTasks,
}: {
  projectId: string
  onClose: () => void
  onImportTasks?: (tasks: { title: string; description: string; priority: string }[]) => void
}) {
  const [mode, setMode] = useState<WriteMode>('user-stories')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiResult | null>(null)
  const [resultMode, setResultMode] = useState<WriteMode | null>(null)
  const [copied, setCopied] = useState(false)
  const [importing, setImporting] = useState(false)
  const { toast } = useToast()

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, prompt }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur IA', 'error'); return }
      setResult(data.result)
      setResultMode(mode)
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!result) return
    const text = buildPlainText(result, resultMode!)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Impossible de copier', 'error')
    }
  }

  const importAsTasks = async () => {
    if (!result || resultMode !== 'user-stories') return
    const r = result as UserStoriesResult
    setImporting(true)
    try {
      const tasks = r.stories.map(s => ({
        title: s.title,
        description: `**En tant que** ${s.asA}, **je veux** ${s.iWant}, **afin de** ${s.soThat}\n\n**Critères d'acceptance :**\n${s.acceptanceCriteria.map(c => `- ${c}`).join('\n')}`,
        priority: s.priority,
      }))
      if (onImportTasks) {
        onImportTasks(tasks)
        toast(`${tasks.length} user stories importées comme tâches`, 'success')
        onClose()
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 301, width: 680, maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh',
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Sparkles size={18} strokeWidth={1.5} style={{ color: 'var(--color-accent-default)' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Rédaction assistée par IA</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Génère des livrables projet à partir d'une description</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex' }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Mode selector */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Type de document</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MODES.map(m => {
                const Icon = m.icon
                const isActive = mode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setResult(null) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: isActive ? 'var(--color-accent-subtle)' : 'var(--color-bg-secondary)',
                      border: `1px solid ${isActive ? 'var(--color-accent-default)' : 'var(--color-border-subtle)'}`,
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <Icon size={16} strokeWidth={1.5} style={{ color: isActive ? 'var(--color-accent-default)' : 'var(--color-text-tertiary)', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--color-accent-default)' : 'var(--color-text-primary)', marginBottom: 1 }}>{m.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{m.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Description</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={PLACEHOLDERS[mode]}
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)',
                lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'var(--font-primary)',
              }}
            />
          </div>

          {/* Results */}
          {result && resultMode && (
            <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)' }}>Résultat</p>
                <button
                  onClick={copyToClipboard}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                >
                  {copied ? <><Check size={12} strokeWidth={1.5} /> Copié</> : <><Copy size={12} strokeWidth={1.5} /> Copier</>}
                </button>
              </div>

              {resultMode === 'user-stories' && <UserStoriesResult result={result as UserStoriesResult} />}
              {resultMode === 'spec' && <SpecResult result={result as SpecResult} />}
              {resultMode === 'test-plan' && <TestPlanResult result={result as TestPlanResult} />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onClose} style={{ height: 34, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-primary)' }}>
            Fermer
          </button>
          {result && resultMode === 'user-stories' && onImportTasks && (
            <button
              onClick={importAsTask}
              disabled={importing}
              style={{ height: 34, padding: '0 14px', background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: importing ? 'not-allowed' : 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-primary)', opacity: importing ? 0.6 : 1 }}
            >
              <Plus size={13} strokeWidth={1.5} /> {importing ? 'Import…' : 'Importer comme tâches'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            style={{ height: 34, padding: '0 16px', background: 'var(--color-accent-default)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', color: '#fff', opacity: loading || !prompt.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-primary)' }}
          >
            {result
              ? <><RefreshCw size={13} strokeWidth={1.5} />{loading ? 'Génération…' : 'Régénérer'}</>
              : <><Sparkles size={13} strokeWidth={1.5} />{loading ? 'Génération…' : 'Générer'}</>
            }
          </button>
        </div>
      </div>
    </>
  )

  function importAsTask() { importAsTasks() }
}

function UserStoriesResult({ result }: { result: UserStoriesResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {result.stories?.map((story, i) => (
        <div key={i} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{story.title}</p>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>{story.estimate}</span>
              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--color-bg-tertiary)', color: PRIORITY_COLORS[story.priority] ?? 'var(--color-text-tertiary)', fontWeight: 500 }}>{story.priority}</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
            <span style={{ color: 'var(--color-text-tertiary)' }}>En tant que</span> {story.asA},{' '}
            <span style={{ color: 'var(--color-text-tertiary)' }}>je veux</span> {story.iWant},{' '}
            <span style={{ color: 'var(--color-text-tertiary)' }}>afin de</span> {story.soThat}.
          </p>
          {story.acceptanceCriteria?.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {story.acceptanceCriteria.map((c, j) => (
                <li key={j} style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

function SpecResult({ result }: { result: SpecResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{result.title}</p>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', padding: '2px 7px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)' }}>v{result.version}</span>
      </div>
      {result.sections?.map((section, i) => (
        <div key={i}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>{section.heading}</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{section.content}</p>
        </div>
      ))}
    </div>
  )
}

function TestPlanResult({ result }: { result: TestPlanResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{result.title}</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{result.objective}</p>
      </div>
      {result.testCases?.map((tc, i) => (
        <div key={i} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{tc.id}</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{tc.title}</p>
            </div>
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--color-bg-tertiary)', color: PRIORITY_COLORS[tc.priority] ?? 'var(--color-text-tertiary)', fontWeight: 500, flexShrink: 0 }}>{tc.priority}</span>
          </div>
          {tc.preconditions && (
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
              <strong>Préconditions :</strong> {tc.preconditions}
            </p>
          )}
          <ol style={{ margin: '0 0 6px', paddingLeft: 16 }}>
            {tc.steps?.map((step, j) => (
              <li key={j} style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{step}</li>
            ))}
          </ol>
          <p style={{ fontSize: 12, color: 'var(--color-success-default)' }}>
            <strong>Résultat attendu :</strong> {tc.expectedResult}
          </p>
        </div>
      ))}
    </div>
  )
}

function buildPlainText(result: AiResult, mode: WriteMode): string {
  if (mode === 'user-stories') {
    const r = result as UserStoriesResult
    return r.stories?.map(s =>
      `## ${s.title} [${s.priority}] (${s.estimate})\n\nEn tant que ${s.asA}, je veux ${s.iWant}, afin de ${s.soThat}.\n\nCritères d'acceptance :\n${s.acceptanceCriteria.map(c => `- ${c}`).join('\n')}`
    ).join('\n\n---\n\n') ?? ''
  }
  if (mode === 'spec') {
    const r = result as SpecResult
    return `# ${r.title} — v${r.version}\n\n${r.sections?.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n') ?? ''}`
  }
  if (mode === 'test-plan') {
    const r = result as TestPlanResult
    return `# ${r.title}\n\n${r.objective}\n\n${r.testCases?.map(tc =>
      `## ${tc.id} — ${tc.title} [${tc.priority}]\n\nPréconditions : ${tc.preconditions}\n\nÉtapes :\n${tc.steps?.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nRésultat attendu : ${tc.expectedResult}`
    ).join('\n\n---\n\n') ?? ''}`
  }
  return ''
}
