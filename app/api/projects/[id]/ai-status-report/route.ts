import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAnthropicClient } from '@/lib/anthropic'
import { PLAN_LIMITS } from '@/lib/plans'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: { select: { plan: true } } },
  })
  const plan = (member?.organization?.plan ?? 'FREE') as keyof typeof PLAN_LIMITS
  if (!PLAN_LIMITS[plan].ai) {
    return NextResponse.json({ error: 'Fonctionnalité réservée au plan Pro ou Business' }, { status: 403 })
  }

  const [project, tasks, milestones, risks, objectives] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.task.findMany({ where: { projectId: id }, orderBy: { order: 'asc' } }),
    prisma.milestone.findMany({ where: { projectId: id }, orderBy: { plannedDate: 'asc' } }),
    prisma.projectRisk.findMany({ where: { projectId: id }, orderBy: { order: 'asc' } }),
    prisma.projectObjective.findMany({ where: { projectId: id }, orderBy: { order: 'asc' } }),
  ])

  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

  const now = new Date()

  // Build concise context for the AI
  const taskStats = {
    total: tasks.length,
    aFaire: tasks.filter(t => t.status === 'A_FAIRE').length,
    enCours: tasks.filter(t => t.status === 'EN_COURS').length,
    enRevue: tasks.filter(t => t.status === 'EN_REVUE').length,
    termine: tasks.filter(t => t.status === 'TERMINE').length,
    bloque: tasks.filter(t => t.status === 'BLOQUE').length,
    enRetard: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'TERMINE').length,
  }

  const upcomingMilestones = milestones
    .filter(m => m.status === 'A_VENIR')
    .slice(0, 5)
    .map(m => `- ${m.title} (prévu le ${new Date(m.plannedDate).toLocaleDateString('fr-FR')})`)
    .join('\n')

  const openRisks = risks
    .filter(r => r.status === 'OUVERT' || r.status === 'EN_COURS')
    .map(r => `- [${r.probability}/${r.impact}] ${r.title}`)
    .join('\n')

  const objectivesProgress = objectives
    .map(o => `- [${o.status}] ${o.title}`)
    .join('\n')

  const progressPct = tasks.length > 0
    ? Math.round((taskStats.termine / tasks.length) * 100)
    : 0

  const context = `Projet : ${project.name}
Statut : ${project.status}
Date de fin prévue : ${project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : 'non définie'}
Date du rapport : ${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}

AVANCEMENT DES TÂCHES :
- Total : ${taskStats.total} tâches (${progressPct}% terminées)
- À faire : ${taskStats.aFaire} | En cours : ${taskStats.enCours} | En révision : ${taskStats.enRevue} | Terminées : ${taskStats.termine} | Bloquées : ${taskStats.bloque}
- En retard : ${taskStats.enRetard} tâche(s)

JALONS À VENIR :
${upcomingMilestones || 'Aucun jalon à venir'}

RISQUES OUVERTS :
${openRisks || 'Aucun risque ouvert'}

OBJECTIFS :
${objectivesProgress || 'Aucun objectif défini'}`

  const systemPrompt = `Tu es un assistant de gestion de projet expert. Tu génères des rapports de statut hebdomadaires clairs, concis et actionnables en français.

Retourne UNIQUEMENT un objet JSON valide avec cette structure :
{
  "resume": "2-3 phrases de résumé exécutif pour un sponsor ou un comité de pilotage",
  "avancement": "Paragraphe décrivant l'avancement global avec les chiffres clés",
  "pointsAttention": ["point critique 1", "point critique 2", ...],
  "prochainesEtapes": ["action prioritaire 1", "action prioritaire 2", ...],
  "tendance": "POSITIVE" | "NEUTRE" | "ATTENTION" | "CRITIQUE",
  "tendanceRaison": "Une phrase expliquant la tendance"
}

Règles :
- Maximum 3 points d'attention et 4 prochaines étapes
- Ton professionnel, concis, orienté décision
- La tendance reflète honnêtement l'état du projet`

  const anthropic = getAnthropicClient()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: context }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Réponse inattendue du modèle' }, { status: 500 })
  }

  try {
    const cleaned = content.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    const parsed = JSON.parse(cleaned)
    return NextResponse.json({ ...parsed, generatedAt: now.toISOString(), projectName: project.name, taskStats, progressPct })
  } catch {
    return NextResponse.json({ error: 'Impossible de parser la réponse IA' }, { status: 500 })
  }
}
