// ─── Documents légaux — CGU & Politique de confidentialité ───────────────────
// Contenu repris des documents officiels LearnI (Ottawa, Ontario, Canada).
import { useState } from 'react'
import { ChevronLeft, FileText, ShieldCheck } from 'lucide-react'

type Tab = 'terms' | 'privacy'

const CONTACT = 'contact@learni.ca'
const LAST_UPDATE = '6 juillet 2026'

// ─── Styles partagés ──────────────────────────────────────────────────────────
const H2: React.CSSProperties = {
  fontFamily: 'var(--font-head)', fontSize: '1.05rem', fontWeight: 700,
  color: 'var(--white)', marginTop: '2rem', marginBottom: '.6rem',
}
const H3: React.CSSProperties = {
  fontSize: '.95rem', fontWeight: 700, color: 'var(--text)',
  marginTop: '1.1rem', marginBottom: '.4rem',
}
const P: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.8, color: 'var(--muted)', marginBottom: '.75rem',
}
const UL: React.CSSProperties = {
  margin: '0 0 .75rem', paddingLeft: '1.2rem',
  display: 'flex', flexDirection: 'column', gap: 6,
}
const LI: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }

function Mail() {
  return <a href={`mailto:${CONTACT}`} style={{ color: '#a78bfa' }}>{CONTACT}</a>
}

// ─── Conditions d'utilisation ────────────────────────────────────────────────
function Terms() {
  return (
    <div>
      <h2 style={{ ...H2, marginTop: 0 }}>1. Acceptation des conditions</h2>
      <p style={P}>
        En accédant à la plateforme LearnI, vous acceptez d'être lié par les présentes Conditions
        d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser la plateforme.
      </p>

      <h2 style={H2}>2. Description du service</h2>
      <p style={P}>
        LearnI est une plateforme d'apprentissage en ligne alimentée par l'intelligence artificielle permettant :
      </p>
      <ul style={UL}>
        <li style={LI}>La génération automatique de quiz à partir de documents PDF ou texte</li>
        <li style={LI}>La création et la sauvegarde de cartes de révision (flashcards) générées par l'IA</li>
        <li style={LI}>« Mon Cartable » : l'organisation de cahiers et d'unités d'apprentissage (UA), le téléversement et la conservation de documents de cours, et la génération d'exercices de révision</li>
        <li style={LI}>La lecture à voix haute de vos documents par une voix de synthèse</li>
        <li style={LI}>« Mon Agenda » et la génération de plans d'étude personnalisés tenant compte de votre emploi du temps et de vos résultats de quiz</li>
        <li style={LI}>L'accès à un tuteur IA conversationnel et à l'aide aux devoirs</li>
        <li style={LI}>La création de cours personnalisés générés par l'IA (plan Autodidacte)</li>
        <li style={LI}>La participation à des communautés d'apprentissage en ligne</li>
        <li style={LI}>La gestion de classes pour les enseignants (plan Enseignant)</li>
      </ul>

      <h2 style={H2}>3. Comptes utilisateurs</h2>
      <h3 style={H3}>3.1 Création de compte</h3>
      <p style={P}>
        Pour accéder aux fonctionnalités de LearnI, vous devez créer un compte en fournissant une adresse
        courriel valide et un mot de passe sécurisé. Vous êtes responsable de maintenir la confidentialité
        de vos identifiants.
      </p>
      <h3 style={H3}>3.2 Exactitude des informations</h3>
      <p style={P}>
        Vous vous engagez à fournir des informations exactes et à les maintenir à jour. LearnI se réserve
        le droit de suspendre ou supprimer tout compte contenant des informations fausses ou trompeuses.
      </p>
      <h3 style={H3}>3.3 Responsabilité du compte</h3>
      <p style={P}>
        Vous êtes entièrement responsable de toutes les activités effectuées sous votre compte. Veuillez
        nous contacter immédiatement à <Mail /> si vous soupçonnez une utilisation non autorisée.
      </p>

      <h2 style={H2}>4. Plans d'abonnement et paiements</h2>
      <h3 style={H3}>4.1 Plans disponibles</h3>
      <ul style={UL}>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Gratuit</strong> — accès limité à 2 quiz par jour</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Starter</strong> — 9,99 $/mois — 5 quiz par jour, explications IA</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Pro</strong> — 22,99 $/mois — quiz illimités, flashcards, plan d'étude avec agenda, Mon Cartable</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Autodidacte</strong> — 35,99 $/mois — quiz illimités, flashcards, plan d'étude avec agenda, tuteur IA, cours générés par l'IA, communautés</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Enseignant</strong> — 35,99 $/mois — gestion de classes et suivi des élèves</li>
      </ul>
      <h3 style={H3}>4.2 Facturation</h3>
      <p style={P}>
        Les abonnements sont facturés mensuellement via Stripe, notre prestataire de paiement sécurisé.
        En vous abonnant, vous autorisez LearnI à débiter votre moyen de paiement de manière récurrente
        jusqu'à l'annulation.
      </p>
      <h3 style={H3}>4.3 Annulation</h3>
      <p style={P}>
        Vous pouvez annuler votre abonnement à tout moment depuis votre espace compte. L'annulation prend
        effet à la fin de la période de facturation en cours. Aucun remboursement partiel n'est accordé
        pour la période restante.
      </p>
      <h3 style={H3}>4.4 Modifications tarifaires</h3>
      <p style={P}>
        LearnI se réserve le droit de modifier ses tarifs. Tout changement sera communiqué par courriel
        avec un préavis minimum de 30 jours.
      </p>

      <h2 style={H2}>5. Utilisation acceptable</h2>
      <p style={P}>En utilisant LearnI, vous vous engagez à ne pas :</p>
      <ul style={UL}>
        <li style={LI}>Utiliser la plateforme à des fins illégales ou non autorisées</li>
        <li style={LI}>Tenter d'accéder aux comptes d'autres utilisateurs sans autorisation</li>
        <li style={LI}>Télécharger ou partager du contenu protégé par des droits d'auteur sans permission</li>
        <li style={LI}>Utiliser des robots, scripts ou autres moyens automatisés pour accéder à la plateforme</li>
        <li style={LI}>Contourner les mesures de sécurité ou les limites d'utilisation</li>
        <li style={LI}>Partager vos identifiants de connexion avec d'autres personnes</li>
        <li style={LI}>Soumettre du contenu inapproprié, offensant ou illégal dans les communautés</li>
      </ul>

      <h2 style={H2}>6. Contenu et propriété intellectuelle</h2>
      <h3 style={H3}>6.1 Contenu utilisateur</h3>
      <p style={P}>
        En téléchargeant des documents sur LearnI, vous confirmez détenir les droits nécessaires sur ce
        contenu. Vous accordez à LearnI une licence limitée pour traiter ce contenu dans le seul but de
        fournir le service.
      </p>
      <h3 style={H3}>6.2 Propriété de la plateforme</h3>
      <p style={P}>
        LearnI, son code source, son interface, ses algorithmes et son contenu généré sont la propriété
        exclusive de David Nasial Basola. Toute reproduction, distribution ou utilisation commerciale sans
        autorisation écrite préalable est strictement interdite.
      </p>
      <h3 style={H3}>6.3 Contenu généré par l'IA</h3>
      <p style={P}>
        Le contenu généré par l'IA (quiz, cours, plans d'étude) est fourni à titre éducatif uniquement.
        LearnI ne garantit pas l'exactitude absolue de ce contenu et vous encourage à vérifier les
        informations importantes auprès de sources officielles.
      </p>

      <h2 style={H2}>7. Confidentialité et données personnelles</h2>
      <p style={P}>
        La collecte et le traitement de vos données personnelles sont régis par notre Politique de
        confidentialité. En utilisant LearnI, vous consentez à la collecte et au traitement de vos données
        conformément à cette politique.
      </p>

      <h2 style={H2}>8. Limitation de responsabilité</h2>
      <p style={P}>
        LearnI est fourni « tel quel » sans garantie d'aucune sorte. Dans toute la mesure permise par la
        loi applicable, LearnI et ses créateurs ne sauraient être tenus responsables de :
      </p>
      <ul style={UL}>
        <li style={LI}>L'exactitude, l'exhaustivité ou l'utilité du contenu généré par l'IA</li>
        <li style={LI}>Toute interruption ou indisponibilité du service</li>
        <li style={LI}>La perte de données due à des défaillances techniques</li>
        <li style={LI}>Tout dommage indirect résultant de l'utilisation de la plateforme</li>
      </ul>

      <h2 style={H2}>9. Résiliation</h2>
      <p style={P}>
        LearnI se réserve le droit de suspendre ou résilier votre accès à la plateforme, avec ou sans
        préavis, en cas de violation des présentes Conditions d'utilisation ou de comportement
        préjudiciable à la communauté ou à la plateforme.
      </p>

      <h2 style={H2}>10. Droit applicable</h2>
      <p style={P}>
        Les présentes Conditions d'utilisation sont régies par les lois de la province d'Ontario, Canada.
        Tout litige sera soumis à la juridiction exclusive des tribunaux compétents de la province d'Ontario.
      </p>

      <h2 style={H2}>11. Nous contacter</h2>
      <p style={P}>
        Pour toute question concernant ces Conditions d'utilisation, veuillez nous contacter à : <Mail />
      </p>
    </div>
  )
}

// ─── Politique de confidentialité ────────────────────────────────────────────
function Privacy() {
  return (
    <div>
      <p style={{ ...P, marginTop: 0 }}>
        Chez LearnI, la protection de vos données personnelles est une priorité. La présente Politique de
        confidentialité explique quelles données nous collectons, comment nous les utilisons et quels sont
        vos droits conformément à la <em>Loi sur la protection des renseignements personnels et les
        documents électroniques</em> (LPRPDE) du Canada.
      </p>

      <h2 style={H2}>1. Responsable du traitement des données</h2>
      <p style={P}>
        David Nasial Basola — Ottawa, Ontario, Canada<br />
        Courriel : <Mail />
      </p>

      <h2 style={H2}>2. Données que nous collectons</h2>
      <h3 style={H3}>2.1 Données que vous nous fournissez</h3>
      <ul style={UL}>
        <li style={LI}>Adresse courriel et mot de passe lors de la création de votre compte</li>
        <li style={LI}>Nom d'affichage (optionnel)</li>
        <li style={LI}>Documents PDF ou texte que vous importez pour générer des quiz ou des cartes de révision</li>
        <li style={LI}>Documents de cours que vous téléversez dans « Mon Cartable », dont le contenu textuel est conservé pour permettre la révision et la génération d'exercices</li>
        <li style={LI}>Photos de documents ou de manuels que vous prenez, dont le texte est transcrit automatiquement</li>
        <li style={LI}>Notes personnelles que vous ajoutez à vos cours</li>
        <li style={LI}>Les événements que vous ajoutez à « Mon Agenda » : dates d'examens, horaires de travail, journées occupées et créneaux d'étude disponibles</li>
        <li style={LI}>Messages envoyés dans les communautés, au tuteur IA et à l'aide aux devoirs</li>
        <li style={LI}>Retours et suggestions que vous nous envoyez volontairement</li>
        <li style={LI}>Informations de paiement (traitées exclusivement par Stripe — jamais stockées par LearnI)</li>
      </ul>

      <h3 style={H3}>2.2 Données collectées automatiquement</h3>
      <ul style={UL}>
        <li style={LI}>Résultats de vos quiz et historique d'apprentissage</li>
        <li style={LI}>Cartes de révision et séries d'exercices que vous générez et sauvegardez</li>
        <li style={LI}>Progression dans les cours et plans d'étude</li>
        <li style={LI}>Données d'utilisation de la plateforme (fonctionnalités utilisées, fréquence)</li>
        <li style={LI}>Adresse IP et type de navigateur (à des fins de sécurité uniquement)</li>
      </ul>

      <h3 style={H3}>2.3 Données que nous ne collectons PAS</h3>
      <ul style={UL}>
        <li style={LI}>Numéro de carte de crédit (géré entièrement par Stripe)</li>
        <li style={LI}>Documents biométriques ou données de santé</li>
        <li style={LI}>Données de localisation précise</li>
      </ul>

      <h2 style={H2}>3. Utilisation de vos données</h2>
      <p style={P}>Vos données sont utilisées exclusivement pour :</p>
      <ul style={UL}>
        <li style={LI}>Fournir et améliorer les services de la plateforme LearnI</li>
        <li style={LI}>Traiter vos paiements et gérer votre abonnement</li>
        <li style={LI}>Personnaliser votre expérience d'apprentissage</li>
        <li style={LI}>Générer vos quiz, cours, plans d'étude et lectures audio via l'IA</li>
        <li style={LI}>Vous envoyer des communications importantes concernant votre compte</li>
        <li style={LI}>Assurer la sécurité et prévenir la fraude</li>
        <li style={LI}>Respecter nos obligations légales</li>
      </ul>
      <p style={{ ...P, color: 'var(--text)', fontWeight: 600 }}>
        Nous ne vendons jamais vos données personnelles à des tiers.
      </p>

      <h2 style={H2}>4. Partage des données avec des tiers</h2>
      <p style={P}>
        LearnI fait appel aux prestataires de services suivants, qui peuvent accéder à certaines données
        dans le cadre de leur mission :
      </p>
      <ul style={UL}>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Supabase</strong> — hébergement de la base de données et authentification. Données stockées sur des serveurs sécurisés.</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Anthropic</strong> — traitement du contenu par l'IA pour la génération de quiz, de cours et de résumés. Vos documents sont transmis de manière sécurisée et ne sont pas utilisés pour entraîner les modèles.</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>OpenAI</strong> — synthèse vocale de vos documents (lecture à voix haute) et transcription du texte présent sur les photos que vous importez. Les contenus transmis ne sont pas utilisés pour entraîner les modèles.</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Stripe</strong> — traitement des paiements. Stripe est conforme aux normes PCI DSS.</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Vercel</strong> — hébergement de l'application web.</li>
      </ul>
      <p style={P}>
        Tous nos prestataires sont contractuellement tenus de protéger vos données et de ne pas les
        utiliser à d'autres fins.
      </p>

      <h2 style={H2}>5. Conservation des données</h2>
      <p style={P}>
        Nous conservons vos données aussi longtemps que votre compte est actif ou que nécessaire pour vous
        fournir nos services. Plus précisément :
      </p>
      <ul style={UL}>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Données de compte</strong> : conservées jusqu'à la suppression de votre compte</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Résultats de quiz, flashcards et plans d'étude</strong> : conservés pendant la durée de vie de votre compte</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Documents importés uniquement pour générer un quiz ou des flashcards</strong> : traités en temps réel et non conservés de façon permanente</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Documents de « Mon Cartable »</strong> : leur contenu textuel, ainsi que les résumés et fichiers audio générés à partir d'eux, sont conservés tant que vous ne les supprimez pas. Vous pouvez les supprimer à tout moment depuis l'application.</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Événements de « Mon Agenda »</strong> : conservés jusqu'à ce que vous les supprimiez ou que vous supprimiez votre compte</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Données de facturation</strong> : conservées 7 ans conformément aux obligations fiscales canadiennes</li>
      </ul>

      <h2 style={H2}>6. Sécurité des données</h2>
      <ul style={UL}>
        <li style={LI}>Chiffrement HTTPS de toutes les communications</li>
        <li style={LI}>Authentification sécurisée via Supabase Auth avec jetons JWT</li>
        <li style={LI}>Isolation des données par utilisateur via Row Level Security (RLS) PostgreSQL</li>
        <li style={LI}>Clés API et secrets stockés exclusivement côté serveur, jamais exposés au navigateur</li>
        <li style={LI}>Accès aux données restreint aux seules personnes qui en ont besoin</li>
      </ul>

      <h2 style={H2}>7. Vos droits</h2>
      <p style={P}>Conformément à la LPRPDE, vous disposez des droits suivants :</p>
      <ul style={UL}>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Droit d'accès</strong> — vous pouvez demander une copie de vos données personnelles</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Droit de rectification</strong> — vous pouvez corriger des données inexactes</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Droit à l'effacement</strong> — vous pouvez demander la suppression de votre compte et de vos données</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Droit de retrait du consentement</strong> — vous pouvez retirer votre consentement à tout moment</li>
        <li style={LI}><strong style={{ color: 'var(--text)' }}>Droit à la portabilité</strong> — vous pouvez demander vos données dans un format lisible par machine</li>
      </ul>
      <p style={P}>
        Pour exercer ces droits, contactez-nous à : <Mail />. Nous répondrons dans un délai de 30 jours.
      </p>

      <h2 style={H2}>8. Cookies et technologies similaires</h2>
      <p style={P}>
        LearnI utilise des cookies techniques essentiels au fonctionnement de la plateforme
        (authentification, préférences). Nous n'utilisons pas de cookies publicitaires ou de traçage à des
        fins commerciales.
      </p>

      <h2 style={H2}>9. Protection des mineurs</h2>
      <p style={P}>
        LearnI est accessible aux utilisateurs de tous âges, y compris les élèves du secondaire. Pour les
        utilisateurs de moins de 16 ans, nous recommandons que l'inscription soit faite avec le
        consentement d'un parent ou tuteur légal. Nous ne collectons pas sciemment des données d'enfants
        de moins de 13 ans sans consentement parental.
      </p>

      <h2 style={H2}>10. Modifications de la politique</h2>
      <p style={P}>
        Nous nous réservons le droit de modifier cette Politique de confidentialité. En cas de changement
        important, nous vous en informerons par courriel avec un préavis de 30 jours.
      </p>

      <h2 style={H2}>11. Nous contacter</h2>
      <p style={P}>
        Pour toute question concernant cette Politique de confidentialité ou pour exercer vos droits,
        contactez-nous à : <Mail />
      </p>
      <p style={P}>
        Vous avez également le droit de déposer une plainte auprès du Commissariat à la protection de la
        vie privée du Canada (<a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa' }}>www.priv.gc.ca</a>).
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function LegalPage({ initialTab = 'terms', onBack }: {
  initialTab?: Tab
  onBack?: () => void
}) {
  const [tab, setTab] = useState<Tab>(initialTab)

  const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'terms',   label: 'Conditions d\'utilisation', icon: FileText },
    { id: 'privacy', label: 'Confidentialité',           icon: ShieldCheck },
  ]

  return (
    <div className="fade-in" style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem',
        }}>
          <ChevronLeft size={15} /> Retour
        </button>
      )}

      <h1 style={{
        fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800,
        color: 'var(--white)', marginBottom: '.3rem',
      }}>
        {tab === 'terms' ? 'Conditions d\'utilisation' : 'Politique de confidentialité'}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: '1.5rem' }}>
        LearnI · Ottawa, Ontario, Canada · Dernière mise à jour : {LAST_UPDATE}
      </p>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: active ? '#2d1b69' : 'var(--bg2)',
                border: `1px solid ${active ? '#a78bfa' : 'var(--border)'}`,
                color: active ? '#a78bfa' : 'var(--muted)',
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '1.75rem',
      }}>
        {tab === 'terms' ? <Terms /> : <Privacy />}
      </div>
    </div>
  )
}
