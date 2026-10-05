import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAnthropicClient } from '@/lib/anthropic'

type WriteMode = 'user-stories' | 'spec' | 'test-plan'

const SYSTEM_PROMPTS: Record<WriteMode, string> = {
  'user-stories': `Tu es un expert en gestion de produit agile. À partir d'une description de fonctionnalité, génère des user stories structurées en français.

Retourne UNIQUEMENT un objet JSON valide :
{
  "stories": [
    {
      "title": "Titre court de la story",
      "asA": "rôle utilisateur",
      "iWant": "action ou fonctionnalité souhaitée",
      "soThat": "bénéfice ou objectif",
      "acceptanceCriteria": ["critère 1", "critère 2", "critère 3"],
      "priority": "HAUTE" | "NORMALE" | "BASSE",
      "estimate": "XS" | "S" | "M" | "L" | "XL"
    }
  ]
}

Règles :
- Entre 3 et 8 user stories selon la complexité
- Chaque story est indépendante et livrable
- Les critères d'acceptance sont concrets et testables
- Ton professionnel, orienté utilisateur final`,

  'spec': `Tu es un expert en spécifications fonctionnelles. Génère une spécification fonctionnelle détaillée en français à partir du contexte projet et de la description fournie.

Retourne UNIQUEMENT un objet JSON valide :
{
  "title": "Titre du document",
  "version": "1.0",
  "sections": [
    {
      "heading": "1. Contexte et objectifs",
      "content": "..."
    },
    {
      "heading": "2. Périmètre fonctionnel",
      "content": "..."
    },
    {
      "heading": "3. Description détaillée",
      "content": "..."
    },
    {
      "heading": "4. Règles métier",
      "content": "..."
    },
    {
      "heading": "5. Interfaces et interactions",
      "content": "..."
    },
    {
      "heading": "6. Contraintes et exigences non fonctionnelles",
      "content": "..."
    }
  ]
}

Règles :
- Contenu structuré, précis et actionnable
- Langage professionnel, sans ambiguïté
- Chaque section est substantielle (pas de placeholders)`,

  'test-plan': `Tu es un expert en assurance qualité et recettes fonctionnelles. Génère un cahier de recettes structuré en français à partir du contexte projet.

Retourne UNIQUEMENT un objet JSON valide :
{
  "title": "Cahier de recettes — [nom fonctionnalité]",
  "objective": "Objectif du document en une phrase",
  "testCases": [
    {
      "id": "TC-001",
      "title": "Titre du cas de test",
      "preconditions": "État du système avant le test",
      "steps": ["Étape 1", "Étape 2", "Étape 3"],
      "expectedResult": "Résultat attendu",
      "priority": "HAUTE" | "NORMALE" | "BASSE"
    }
  ]
}

Règles :
- Entre 5 et 15 cas de test selon la complexité
- Chaque cas est indépendant et reproductible
- Les étapes sont précises et non ambiguës
- Couvrir les cas nominaux ET les cas aux limites`,
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { mode, prompt: userPrompt } = body as { mode: WriteMode; prompt: string }

    if (!mode || !userPrompt?.trim()) {
      return NextResponse.json({ error: 'Mode et description requis' }, { status: 400 })
    }

    if (!['user-stories', 'spec', 'test-plan'].includes(mode)) {
      return NextResponse.json({ error: 'Mode invalide' }, { status: 400 })
    }

    const [project, tasks, milestones] = await Promise.all([
      prisma.project.findUnique({ where: { id }, select: { name: true, description: true, status: true, endDate: true } }),
      prisma.task.findMany({ where: { projectId: id, parentId: null }, select: { title: true, status: true, priority: true }, take: 20, orderBy: { order: 'asc' } }),
      prisma.milestone.findMany({ where: { projectId: id }, select: { title: true, plannedDate: true, status: true }, take: 10, orderBy: { plannedDate: 'asc' } }),
    ])

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const context = `Projet : ${project.name}
${project.description ? `Description : ${project.description}` : ''}
Statut : ${project.status}
${project.endDate ? `Échéance : ${new Date(project.endDate).toLocaleDateString('fr-FR')}` : ''}

Tâches existantes (${tasks.length}) :
${tasks.slice(0, 10).map(t => `- [${t.status}] ${t.title}`).join('\n') || 'Aucune'}

Jalons (${milestones.length}) :
${milestones.map(m => `- ${m.title} (${new Date(m.plannedDate).toLocaleDateString('fr-FR')})`).join('\n') || 'Aucun'}

---
DEMANDE : ${userPrompt}`

    const anthropic = getAnthropicClient()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPTS[mode],
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
      return NextResponse.json({ mode, result: parsed })
    } catch {
      return NextResponse.json({ error: 'Impossible de parser la réponse IA', raw: content.text.slice(0, 200) }, { status: 500 })
    }
  } catch (err: unknown) {
    console.error('[ai-write]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
