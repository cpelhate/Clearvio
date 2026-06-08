import { Header } from '@/components/layout/header'

export default function PolitiqueConfidentialitePage() {
  const sectionStyle: React.CSSProperties = {
    marginBottom: 32,
  }

  const h2Style: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    marginBottom: 10,
    letterSpacing: '-0.01em',
  }

  const pStyle: React.CSSProperties = {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.8,
    marginBottom: 8,
  }

  return (
    <>
      <Header title="Politique de confidentialité" />
      <div style={{ padding: 'var(--space-10)', maxWidth: 720 }}>

        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
        }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 32, fontFamily: 'var(--font-mono)' }}>
            Dernière mise à jour : juin 2026
          </p>

          <div style={sectionStyle}>
            <h2 style={h2Style}>1. Responsable du traitement</h2>
            <p style={pStyle}>
              Le responsable du traitement de vos données personnelles est <strong>Clearvio</strong>.
              Pour toute question relative à la protection de vos données, vous pouvez nous contacter
              à l&apos;adresse : <a href="mailto:support@clearvio.fr" style={{ color: 'var(--color-accent-default)', textDecoration: 'none' }}>support@clearvio.fr</a>.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>2. Données collectées</h2>
            <p style={pStyle}>
              Nous collectons uniquement les données nécessaires au fonctionnement du service :
            </p>
            <ul style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 8 }}>
              <li>Adresse email et mot de passe (pour l&apos;authentification)</li>
              <li>Prénom et nom (pour la personnalisation)</li>
              <li>Nom de l&apos;organisation</li>
              <li>Données de projets : titres, descriptions, tâches, jalons, risques, documents</li>
            </ul>
            <p style={pStyle}>
              Nous ne collectons pas de données sensibles, ne vendons pas vos données et ne les
              partageons pas avec des tiers à des fins commerciales.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>3. Finalité du traitement</h2>
            <p style={pStyle}>
              Vos données sont traitées exclusivement dans le but de vous fournir le service de
              gestion de projets professionnels Clearvio. Aucune finalité secondaire (publicité,
              profilage, revente) n&apos;est appliquée.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>4. Base légale</h2>
            <p style={pStyle}>
              Le traitement de vos données repose sur l&apos;exécution du contrat qui vous lie à Clearvio
              lors de la création de votre compte (Article 6.1.b du RGPD).
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>5. Durée de conservation</h2>
            <p style={pStyle}>
              Vos données sont conservées pendant toute la durée de vie de votre compte, puis supprimées
              dans un délai de <strong>30 jours</strong> suivant la suppression de votre compte.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>6. Vos droits</h2>
            <p style={pStyle}>
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 8 }}>
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
              <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de votre compte et de vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer à certains traitements</li>
            </ul>
            <p style={pStyle}>
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:support@clearvio.fr" style={{ color: 'var(--color-accent-default)', textDecoration: 'none' }}>support@clearvio.fr</a>.
              Vous disposez également du droit d&apos;introduire une réclamation auprès de la CNIL
              (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent-default)', textDecoration: 'none' }}>www.cnil.fr</a>).
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>7. Hébergement et transferts</h2>
            <p style={pStyle}>
              Clearvio est hébergé sur :
            </p>
            <ul style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 8 }}>
              <li><strong>Vercel</strong> — infrastructure cloud (Union Européenne et États-Unis), certifié ISO 27001</li>
              <li><strong>Supabase</strong> — base de données et authentification (Union Européenne)</li>
            </ul>
            <p style={pStyle}>
              Les transferts éventuels vers les États-Unis s&apos;effectuent dans le cadre du Data Privacy
              Framework UE-États-Unis.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
