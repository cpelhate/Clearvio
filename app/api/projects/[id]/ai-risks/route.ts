import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAnthropicClient } from '@/lib/anthropic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const [project, tasks, milestones, existingRisks, objectives] = await Promise.all([
      prisma.project.findUnique({ where: { id }, select: { name: true, description: true, status: true, endDate: true } }),
      prisma.task.findMany({ where: { projectId: id }, select: { title: true, status: true, priority: true, dueDate: true }, orderBy: { order: 'asc' } }),
      prisma.milestone.findMany({ where: { projectId: id }, select: { title: true, plannedDate: true, status: true }, orderBy: { plannedDate: 'asc' } }),
      prisma.projectRisk.findMany({ where: { projectId: id }, select: { title: true, probability: true, impact: true, status: true } }),
      prisma.projectObjective.findMany({ where: { projectId: id }, select: { title: true, status: true } }),
    ])

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const now = new Date()
    const lateTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'TERMINE')
    const blockedTasks = tasks.filter(t => t.status === 'BLOQUE')
    const criticalTasks = tasks.filter(t => t.priority === 'CRITIQUE' && t.status !== 'TERMINE')
    const upcomingMilestones = milestones.filter(m => m.status === 'A_VENIR' && new Date(m.plannedDate) > now)

    const context = `Projet : ${project.name}
${project.description ? `Description : ${project.description}` : ''}
Statut : ${project.status}
${project.endDate ? `Échéance : ${new Date(project.endDate).toLocaleDateString('fr-FR')}` : ''}
Date d'analyse : ${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}

ÉTAT DES TÂCHES :
- Total : ${tasks.length} | En retard : ${lateTasks.length} | Bloquées : ${blockedTasks.length} | Critiques non terminées : ${criticalTasks.length}
${lateTasks.length > 0 ? `Tâches en retard :\n${lateTasks.slice(0, 5).map(t => `  - ${t.title}`).join('\n')}` : ''}
${blockedTasks.length > 0 ? `Tâches bloquées :\n${blockedTasks.slice(0, 5).map(t => `  - ${t.title}`).join('\n')}` : ''}

JALONS À VENIR :
${upcomingMilestones.slice(0, 5).map(m => `- ${m.title} (${new Date(m.plannedDate).toLocaleDateString('fr-FR')})`).join('\n') || 'Aucun'}

OBJECTIFS :
${objectives.map(o => `- [${o.status}] ${o.title}`).join('\n') || 'Aucun objectif défini'}

RISQUES DÉJÀ IDENTIFIÉS (à ne pas répéter) :
${existingRisks.map(r => `- [${r.probability}/${r.impact}] ${r.title}`).join('\n') || 'Aucun risque existant'}`

    const systemPrompt = `Tu es un expert en gestion des risques projet. Analyse le contexte fourni et identifie les risques potentiels non encore couverts.

Retourne UNIQUEMENT un objet JSON valide :
{
  "risks": [
    {
      "title": "Titre court et précis du risque",
      "description": "Description du risque et son origine dans le contexte projet",
      "probability": "FAIBLE" | "MOYEN" | "ELEVE",
      "impact": "FAIBLE" | "MOYEN" | "ELEVE",
      "mitigation": "Plan d'action concret pour réduire ou éliminer ce risque"
    }
  ]
}

Règles :
- Entre 3 et 7 risques pertinents et distincts
- Ne pas répéter les risques déjà identifiés
- Chaque risque doit être actionnable (mitigation concrète)
- Privilégier les risques à fort impact ou haute probabilité
- Ton professionnel, orienté prise de décision`

    const anthropic = getAnthropicClient()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: context }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Réponse inattendue du modèle' }, { status: 500 })
    }

    const cleaned = content.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    try {
      const parsed = JSON.parse(cleaned)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: 'Impossible de parser la réponse IA', raw: content.text.slice(0, 200) }, { status: 500 })
    }
  } catch (err: unknown) {
    console.error('[ai-risks]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
