# Clearvio

**Gestion de projet et portefeuille pour les PME, ETI et collectivités françaises.**

Clearvio permet de visualiser l'ensemble des projets sur une ligne de temps commune, de détecter les dépendances inter-projets et d'alerter les équipes avant qu'un retard ne se propage.

---

## Fonctionnalités principales

- **Vues multiples** — Gantt interactif, Kanban, liste, calendrier par projet
- **Portefeuille et roadmap** — vision transversale des projets, dépendances inter-projets, alertes sur les dérives
- **Jalons et livrables** — suivi des jalons avec dates planifiées/réelles, livrables associés
- **Risques** — registre et matrice probabilité/impact 3×3
- **Rapports d'avancement** — générés par IA (Claude), programmables, export PDF
- **IA intégrée** — génération de tâches et de rapports de statut via l'API Anthropic
- **Notifications** — alertes en temps réel sur les événements critiques
- **Gestion des équipes** — multi-organisations, invitations par email, rôles et permissions (RBAC)
- **Intégration GitHub** — synchronisation des tâches avec les issues GitHub via webhook
- **Facturation** — plans FREE / TRIAL / PRO / BUSINESS via Stripe
- **Interface tablette** — conçue pour être lisible en déplacement

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, TypeScript, Tailwind CSS 3, Radix UI |
| Auth | Supabase Auth |
| Base de données | PostgreSQL via Prisma ORM |
| IA | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Gantt | frappe-gantt |
| Paiement | Stripe |
| Email | Nodemailer + SMTP par organisation |
| Déploiement | Vercel |

---

## Prérequis

- Node.js ≥ 20
- pnpm ≥ 9
- Instance PostgreSQL (ou Supabase)
- Compte Supabase (auth)

---

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/cpelhate/clearvio.git
cd clearvio

# 2. Installer les dépendances
pnpm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# 4. Générer le client Prisma et appliquer les migrations
pnpm prisma generate
pnpm prisma migrate deploy

# 5. Lancer le serveur de développement
pnpm dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

---

## Variables d'environnement

Créer un fichier `.env.local` à la racine avec les variables suivantes :

```env
# Base de données (Prisma)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Anthropic (IA)
ANTHROPIC_API_KEY="sk-ant-..."

# Stripe (facturation)
STRIPE_SECRET_KEY="sk_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (SMTP par défaut — peut être surchargé par organisation)
SMTP_HOST="..."
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="noreply@clearvio.fr"

# GitHub (intégration webhook, optionnel)
GITHUB_WEBHOOK_SECRET="..."

# URL publique de l'application
NEXT_PUBLIC_APP_URL="https://app.clearvio.fr"
```

---

## Structure du projet

```
clearvio/
├── app/
│   ├── (app)/           # Routes authentifiées (dashboard, projets, roadmap…)
│   ├── (auth)/          # Pages d'authentification (connexion, inscription…)
│   ├── (public)/        # Pages publiques (invitations, tarifs)
│   └── api/             # API Routes Next.js
├── components/
│   ├── gantt/           # Composant Gantt
│   ├── taches/          # Vues tâches (Kanban, liste, drawer, commentaires)
│   ├── projets/         # Modales et vues projet
│   ├── layout/          # Header, sidebar, wrapper
│   └── ui/              # Composants de base (Button, Badge, Input, Skeleton)
├── lib/                 # Clients (Prisma, Supabase, Stripe, Anthropic, mailer…)
├── hooks/               # Hooks React (tâches, Gantt, plan)
├── types/               # Types TypeScript métier
├── styles/              # Tokens CSS, composants CSS, styles Gantt
├── prisma/
│   └── schema.prisma    # Schéma de données
├── docs/                # Documents de référence (brief éditorial…)
└── middleware.ts        # Protection des routes authentifiées
```

---

## Commandes utiles

```bash
pnpm dev              # Serveur de développement (Turbopack)
pnpm build            # Build de production (génère Prisma + compile Next.js)
pnpm start            # Démarrer le serveur de production
pnpm lint             # Lint ESLint
pnpm prisma studio    # Interface graphique de la base de données
pnpm prisma generate  # Regénérer le client Prisma après modification du schéma
```

---

## Déploiement

Le projet est configuré pour **Vercel**. Le fichier `vercel.json` surcharge la commande de build pour exécuter `prisma generate` avant la compilation Next.js.

Variables d'environnement à configurer dans le dashboard Vercel : toutes les variables listées ci-dessus.

Pour les webhooks Stripe et GitHub, pointer vers :
- `https://<domaine>/api/stripe/webhook`
- `https://<domaine>/api/github/webhook`

---

## Licence

Propriétaire — © 2026 NEVARIO. Tous droits réservés.
