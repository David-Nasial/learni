const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, BorderStyle, PageNumber,
  Header, Footer, ExternalHyperlink,
} = require('docx')
const fs = require('fs')
const path = require('path')

const TODAY = '6 juillet 2026'
const COMPANY = 'LearnI'
const URL = 'https://learni-three.vercel.app'
const EMAIL = 'davidbasola56@gmail.com'

const border = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' }

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Arial', color: '1a1a2e' })],
  })
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Arial', color: '3d2b6b' })],
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 22, font: 'Arial', ...opts })],
  })
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
  })
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e0e0e0', space: 1 } },
    spacing: { after: 200 },
    children: [],
  })
}

function link(text, url) {
  return new ExternalHyperlink({
    link: url,
    children: [new TextRun({ text, style: 'Hyperlink', size: 22, font: 'Arial' })],
  })
}

// ─── DOCUMENT 1 : CONDITIONS D'UTILISATION ───────────────────────────────────

const cgus = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e0e0e0', space: 1 } },
          children: [new TextRun({ text: `${COMPANY} — Conditions d\'utilisation`, size: 18, font: 'Arial', color: '888888' })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 18, font: 'Arial', color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '888888' }),
            new TextRun({ text: ' — LearnI © 2026 — Tous droits réservés', size: 18, font: 'Arial', color: '888888' }),
          ],
        })],
      }),
    },
    children: [
      // Titre
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: 'CONDITIONS D\'UTILISATION', bold: true, size: 40, font: 'Arial', color: '1a1a2e' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: COMPANY, bold: true, size: 30, font: 'Arial', color: '3d2b6b' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: `Dernière mise à jour : ${TODAY}`, size: 20, font: 'Arial', color: '888888' })],
      }),
      divider(),

      // 1. Acceptation
      heading1('1. Acceptation des conditions'),
      para('En accédant à la plateforme LearnI, disponible à l\'adresse '),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'En accédant à la plateforme ', size: 22, font: 'Arial' }),
          link(URL, URL),
          new TextRun({ text: ', vous acceptez d\'être lié par les présentes Conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser la plateforme.', size: 22, font: 'Arial' }),
        ],
      }),

      // 2. Description du service
      heading1('2. Description du service'),
      para('LearnI est une plateforme d\'apprentissage en ligne alimentée par l\'intelligence artificielle permettant :'),
      bullet('La génération automatique de quiz à partir de documents PDF ou texte'),
      bullet('La création et la sauvegarde de cartes de révision (flashcards) générées par l\'IA'),
      bullet('« Mon Cartable » : l\'organisation de cahiers et d\'unités d\'apprentissage (UA), le téléversement et la conservation de documents de cours, et la génération d\'exercices de révision'),
      bullet('« Mon Agenda » et la génération de plans d\'étude personnalisés tenant compte de votre emploi du temps (examens, travail, disponibilités) et de vos résultats de quiz'),
      bullet('L\'accès à un tuteur IA conversationnel (plan Autodidacte)'),
      bullet('La création de cours personnalisés générés par l\'IA (plan Autodidacte)'),
      bullet('La participation à des communautés d\'apprentissage en ligne'),
      bullet('La gestion de classes pour les enseignants (plan Enseignant)'),
      para(''),

      // 3. Comptes
      heading1('3. Comptes utilisateurs'),
      heading2('3.1 Création de compte'),
      para('Pour accéder aux fonctionnalités de LearnI, vous devez créer un compte en fournissant une adresse courriel valide et un mot de passe sécurisé. Vous êtes responsable de maintenir la confidentialité de vos identifiants.'),
      heading2('3.2 Exactitude des informations'),
      para('Vous vous engagez à fournir des informations exactes et à les maintenir à jour. LearnI se réserve le droit de suspendre ou supprimer tout compte contenant des informations fausses ou trompeuses.'),
      heading2('3.3 Responsabilité du compte'),
      para('Vous êtes entièrement responsable de toutes les activités effectuées sous votre compte. Veuillez nous contacter immédiatement à '),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Veuillez nous contacter immédiatement à ', size: 22, font: 'Arial' }),
          link(EMAIL, `mailto:${EMAIL}`),
          new TextRun({ text: ' si vous soupçonnez une utilisation non autorisée de votre compte.', size: 22, font: 'Arial' }),
        ],
      }),

      // 4. Plans et paiements
      heading1('4. Plans d\'abonnement et paiements'),
      heading2('4.1 Plans disponibles'),
      para('LearnI propose les plans suivants :'),
      bullet('Gratuit — accès limité à 2 quiz par jour'),
      bullet('Starter — 9,99 $/mois — 5 quiz par jour, explications IA'),
      bullet('Pro — 22,99 $/mois — quiz illimités, toutes les fonctionnalités de révision'),
      bullet('Autodidacte — 35,99 $/mois — tout Pro + tuteur IA, cours et plan d\'étude'),
      bullet('Enseignant — 35,99 $/mois — gestion de classes et suivi des élèves'),
      para(''),
      heading2('4.2 Facturation'),
      para('Les abonnements sont facturés mensuellement via Stripe, notre prestataire de paiement sécurisé. En vous abonnant, vous autorisez LearnI à débiter votre moyen de paiement de manière récurrente jusqu\'à l\'annulation.'),
      heading2('4.3 Annulation'),
      para('Vous pouvez annuler votre abonnement à tout moment depuis votre espace compte. L\'annulation prend effet à la fin de la période de facturation en cours. Aucun remboursement partiel n\'est accordé pour la période restante.'),
      heading2('4.4 Modifications tarifaires'),
      para('LearnI se réserve le droit de modifier ses tarifs. Tout changement sera communiqué par courriel avec un préavis minimum de 30 jours.'),

      // 5. Utilisation acceptable
      heading1('5. Utilisation acceptable'),
      para('En utilisant LearnI, vous vous engagez à ne pas :'),
      bullet('Utiliser la plateforme à des fins illégales ou non autorisées'),
      bullet('Tenter d\'accéder aux comptes d\'autres utilisateurs sans autorisation'),
      bullet('Télécharger ou partager du contenu protégé par des droits d\'auteur sans permission'),
      bullet('Utiliser des robots, scripts ou autres moyens automatisés pour accéder à la plateforme'),
      bullet('Contourner les mesures de sécurité ou les limites d\'utilisation'),
      bullet('Partager vos identifiants de connexion avec d\'autres personnes'),
      bullet('Soumettre du contenu inapproprié, offensant ou illégal dans les communautés'),
      para(''),

      // 6. Contenu
      heading1('6. Contenu et propriété intellectuelle'),
      heading2('6.1 Contenu utilisateur'),
      para('En téléchargeant des documents sur LearnI, vous confirmez détenir les droits nécessaires sur ce contenu. Vous accordez à LearnI une licence limitée pour traiter ce contenu dans le seul but de fournir le service.'),
      heading2('6.2 Propriété de la plateforme'),
      para('LearnI, son code source, son interface, ses algorithmes et son contenu généré sont la propriété exclusive de David Nasial Basola. Toute reproduction, distribution ou utilisation commerciale sans autorisation écrite préalable est strictement interdite.'),
      heading2('6.3 Contenu généré par l\'IA'),
      para('Le contenu généré par l\'IA (quiz, cours, plans d\'étude) est fourni à titre éducatif uniquement. LearnI ne garantit pas l\'exactitude absolue de ce contenu et vous encourageons à vérifier les informations importantes auprès de sources officielles.'),

      // 7. Confidentialité
      heading1('7. Confidentialité et données personnelles'),
      para('La collecte et le traitement de vos données personnelles sont régis par notre Politique de confidentialité, disponible séparément. En utilisant LearnI, vous consentez à la collecte et au traitement de vos données conformément à cette politique.'),

      // 8. Limitation de responsabilité
      heading1('8. Limitation de responsabilité'),
      para('LearnI est fourni "tel quel" sans garantie d\'aucune sorte. Dans toute la mesure permise par la loi applicable, LearnI et ses créateurs ne sauraient être tenus responsables de :'),
      bullet('L\'exactitude, l\'exhaustivité ou l\'utilité du contenu généré par l\'IA'),
      bullet('Toute interruption ou indisponibilité du service'),
      bullet('La perte de données due à des défaillances techniques'),
      bullet('Tout dommage indirect résultant de l\'utilisation de la plateforme'),
      para(''),

      // 9. Résiliation
      heading1('9. Résiliation'),
      para('LearnI se réserve le droit de suspendre ou résilier votre accès à la plateforme, avec ou sans préavis, en cas de violation des présentes Conditions d\'utilisation ou de comportement préjudiciable à la communauté ou à la plateforme.'),

      // 10. Droit applicable
      heading1('10. Droit applicable'),
      para('Les présentes Conditions d\'utilisation sont régies par les lois de la province d\'Ontario, Canada. Tout litige sera soumis à la juridiction exclusive des tribunaux compétents de la province d\'Ontario.'),

      // 11. Contact
      heading1('11. Nous contacter'),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Pour toute question concernant ces Conditions d\'utilisation, veuillez nous contacter à : ', size: 22, font: 'Arial' }),
          link(EMAIL, `mailto:${EMAIL}`),
        ],
      }),
      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `LearnI — ${TODAY} — Ottawa, Ontario, Canada`, size: 18, font: 'Arial', color: '888888' })],
      }),
    ],
  }],
})

// ─── DOCUMENT 2 : POLITIQUE DE CONFIDENTIALITÉ ───────────────────────────────

const privacy = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e0e0e0', space: 1 } },
          children: [new TextRun({ text: `${COMPANY} — Politique de confidentialité`, size: 18, font: 'Arial', color: '888888' })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 18, font: 'Arial', color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '888888' }),
            new TextRun({ text: ' — LearnI © 2026 — Tous droits réservés', size: 18, font: 'Arial', color: '888888' }),
          ],
        })],
      }),
    },
    children: [
      // Titre
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: 'POLITIQUE DE CONFIDENTIALITÉ', bold: true, size: 40, font: 'Arial', color: '1a1a2e' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: COMPANY, bold: true, size: 30, font: 'Arial', color: '3d2b6b' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: `Dernière mise à jour : ${TODAY}`, size: 20, font: 'Arial', color: '888888' })],
      }),
      divider(),

      // Introduction
      para('Chez LearnI, la protection de vos données personnelles est une priorité. La présente Politique de confidentialité explique quelles données nous collectons, comment nous les utilisons et quels sont vos droits conformément à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada.'),

      // 1. Responsable
      heading1('1. Responsable du traitement des données'),
      para('Le responsable du traitement des données personnelles collectées via LearnI est :'),
      para('David Nasial Basola', { bold: true }),
      para('Ottawa, Ontario, Canada'),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Courriel : ', size: 22, font: 'Arial' }),
          link(EMAIL, `mailto:${EMAIL}`),
        ],
      }),

      // 2. Données collectées
      heading1('2. Données que nous collectons'),
      heading2('2.1 Données que vous nous fournissez'),
      bullet('Adresse courriel et mot de passe lors de la création de votre compte'),
      bullet('Nom d\'affichage (optionnel)'),
      bullet('Documents PDF ou texte que vous importez pour générer des quiz ou des cartes de révision'),
      bullet('Documents de cours que vous téléversez dans « Mon Cartable » (cahiers et unités d\'apprentissage), dont le contenu textuel est conservé pour permettre la révision et la génération d\'exercices'),
      bullet('Les événements que vous ajoutez à « Mon Agenda » : dates d\'examens, horaires de travail, journées occupées (anniversaires, sorties, voyages) et créneaux d\'étude disponibles'),
      bullet('Messages envoyés dans les communautés de la plateforme'),
      bullet('Informations de paiement (traitées exclusivement par Stripe — jamais stockées par LearnI)'),
      para(''),
      heading2('2.2 Données collectées automatiquement'),
      bullet('Résultats de vos quiz et historique d\'apprentissage'),
      bullet('Cartes de révision (flashcards) et séries d\'exercices que vous générez et sauvegardez'),
      bullet('Progression dans les cours et plans d\'étude'),
      bullet('Données d\'utilisation de la plateforme (fonctionnalités utilisées, fréquence)'),
      bullet('Adresse IP et type de navigateur (à des fins de sécurité uniquement)'),
      para(''),
      heading2('2.3 Données que nous ne collectons PAS'),
      bullet('Numéro de carte de crédit (géré entièrement par Stripe)'),
      bullet('Documents biométriques ou données de santé'),
      bullet('Données de localisation précise'),
      para(''),

      // 3. Utilisation des données
      heading1('3. Utilisation de vos données'),
      para('Vos données sont utilisées exclusivement pour :'),
      bullet('Fournir et améliorer les services de la plateforme LearnI'),
      bullet('Traiter vos paiements et gérer votre abonnement'),
      bullet('Personnaliser votre expérience d\'apprentissage'),
      bullet('Générer vos quiz, cours et plans d\'étude via l\'IA'),
      bullet('Vous envoyer des communications importantes concernant votre compte'),
      bullet('Assurer la sécurité et prévenir la fraude'),
      bullet('Respecter nos obligations légales'),
      para('Nous ne vendons jamais vos données personnelles à des tiers.', { bold: true }),

      // 4. Partage des données
      heading1('4. Partage des données avec des tiers'),
      para('LearnI fait appel aux prestataires de services suivants, qui peuvent accéder à certaines données dans le cadre de leur mission :'),
      bullet('Supabase (Supabase Inc.) — hébergement de la base de données et authentification. Données stockées sur des serveurs sécurisés.'),
      bullet('Anthropic — traitement du contenu par l\'IA pour la génération de quiz et de cours. Vos documents sont transmis de manière sécurisée et ne sont pas utilisés pour entraîner les modèles.'),
      bullet('Stripe — traitement des paiements. Stripe est conforme aux normes PCI DSS.'),
      bullet('Vercel — hébergement de l\'application web.'),
      para('Tous nos prestataires sont contractuellement tenus de protéger vos données et de ne pas les utiliser à d\'autres fins.'),

      // 5. Conservation
      heading1('5. Conservation des données'),
      para('Nous conservons vos données aussi longtemps que votre compte est actif ou que nécessaire pour vous fournir nos services. Plus précisément :'),
      bullet('Données de compte : conservées jusqu\'à la suppression de votre compte'),
      bullet('Résultats de quiz, flashcards et plans d\'étude : conservés pendant la durée de vie de votre compte'),
      bullet('Documents importés uniquement pour générer un quiz ou des flashcards : traités en temps réel et non conservés de façon permanente sur nos serveurs'),
      bullet('Documents téléversés dans « Mon Cartable » : leur contenu textuel est conservé de façon permanente tant que vous ne les supprimez pas, afin de vous permettre de réviser et de générer des exercices. Vous pouvez les supprimer à tout moment depuis l\'application.'),
      bullet('Événements de « Mon Agenda » : conservés jusqu\'à ce que vous les supprimiez ou que vous supprimiez votre compte'),
      bullet('Données de facturation : conservées 7 ans conformément aux obligations fiscales canadiennes'),
      para(''),

      // 6. Sécurité
      heading1('6. Sécurité des données'),
      para('LearnI met en oeuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :'),
      bullet('Chiffrement HTTPS de toutes les communications'),
      bullet('Authentification sécurisée via Supabase Auth avec tokens JWT'),
      bullet('Isolation des données par utilisateur via Row Level Security (RLS) PostgreSQL'),
      bullet('Clés API et secrets stockés exclusivement côté serveur, jamais exposés au client'),
      bullet('Accès aux données restreint aux seuls employés qui en ont besoin'),
      para(''),

      // 7. Droits
      heading1('7. Vos droits'),
      para('Conformément à la LPRPDE, vous disposez des droits suivants :'),
      bullet('Droit d\'accès — vous pouvez demander une copie de vos données personnelles'),
      bullet('Droit de rectification — vous pouvez corriger des données inexactes'),
      bullet('Droit à l\'effacement — vous pouvez demander la suppression de votre compte et de vos données'),
      bullet('Droit de retrait du consentement — vous pouvez retirer votre consentement à tout moment'),
      bullet('Droit à la portabilité — vous pouvez demander vos données dans un format lisible par machine'),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Pour exercer ces droits, contactez-nous à : ', size: 22, font: 'Arial' }),
          link(EMAIL, `mailto:${EMAIL}`),
          new TextRun({ text: '. Nous répondrons dans un délai de 30 jours.', size: 22, font: 'Arial' }),
        ],
      }),

      // 8. Cookies
      heading1('8. Cookies et technologies similaires'),
      para('LearnI utilise des cookies techniques essentiels au fonctionnement de la plateforme (authentification, préférences). Nous n\'utilisons pas de cookies publicitaires ou de traçage à des fins commerciales.'),

      // 9. Mineurs
      heading1('9. Protection des mineurs'),
      para('LearnI est accessible aux utilisateurs de tous âges, y compris les élèves du secondaire. Pour les utilisateurs de moins de 16 ans, nous recommandons que l\'inscription soit faite avec le consentement d\'un parent ou tuteur légal. Nous ne collectons pas sciemment des données d\'enfants de moins de 13 ans sans consentement parental.'),

      // 10. Modifications
      heading1('10. Modifications de la politique'),
      para('Nous nous réservons le droit de modifier cette Politique de confidentialité. En cas de changement important, nous vous en informerons par courriel avec un préavis de 30 jours. La date de la dernière mise à jour est toujours indiquée en haut de ce document.'),

      // 11. Contact
      heading1('11. Nous contacter'),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Pour toute question concernant cette Politique de confidentialité ou pour exercer vos droits, contactez-nous à : ', size: 22, font: 'Arial' }),
          link(EMAIL, `mailto:${EMAIL}`),
        ],
      }),
      para('Vous avez également le droit de déposer une plainte auprès du Commissariat à la protection de la vie privée du Canada (www.priv.gc.ca).'),
      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `LearnI — ${TODAY} — Ottawa, Ontario, Canada`, size: 18, font: 'Arial', color: '888888' })],
      }),
    ],
  }],
})

// ─── Écrire les fichiers ──────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'documents-legaux')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

Promise.all([
  Packer.toBuffer(cgus).then(buf => fs.writeFileSync(path.join(outDir, 'LearnI_Conditions_Utilisation.docx'), buf)),
  Packer.toBuffer(privacy).then(buf => fs.writeFileSync(path.join(outDir, 'LearnI_Politique_Confidentialite.docx'), buf)),
]).then(() => {
  console.log('✅ Documents créés :')
  console.log('   → documents-legaux/LearnI_Conditions_Utilisation.docx')
  console.log('   → documents-legaux/LearnI_Politique_Confidentialite.docx')
}).catch(err => {
  console.error('❌ Erreur :', err)
  process.exit(1)
})
