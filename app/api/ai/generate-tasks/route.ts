import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const { description, projectName } = body

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description requise' }, { status: 400 })
  }

  const anthropic = getAnthropicClient()

  const systemPrompt = `Tu es un assistant spécialisé en gestion de projet. Tu génères des listes de tâches structurées en JSON à partir d'une description de projet ou de fonctionnalité.

Retourne UNIQUEMENT un objet JSON valide avec la structure suivante, sans aucun texte autour :
{
  "tasks": [
    {
      "title": "Titre de la tâche",
      "description": "Description optionnelle courte",
      "priority": "NORMALE" | "HAUTE" | "BASSE" | "CRITIQUE",
      "children": [
        {
          "title": "Sous-tâche",
          "description": "Description optionnelle",
          "priority": "NORMALE"
        }
      ]
    }
  ]
}

Règles :
- Entre 3 et 8 tâches principales
- Chaque tâche peut avoir 0 à 3 sous-tâches
- Titres courts et actionnables (verbe à l'infinitif)
- Priorités cohérentes avec l'importance métier
- Langue : français`

  const userMessage = projectName
    ? `Projet : "${projectName}"\n\nDescription : ${description}`
    : description

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Réponse inattendue du modèle' }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(content.text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Impossible de parser la réponse IA' }, { status: 500 })
  }
}
