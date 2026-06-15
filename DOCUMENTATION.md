# LearnI — Documentation complète

**Auteur :** David Nasial Basola  
**Stack :** React 19 · TypeScript · Vite 8 · Supabase · Anthropic Claude · Stripe  
**Démo :** https://learni-three.vercel.app  
**GitHub :** https://github.com/David-Nasial/learni (privé)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Plans et accès](#3-plans-et-accès)
4. [Fonctionnalités](#4-fonctionnalités)
5. [Edge Functions Supabase](#5-edge-functions-supabase)
6. [Base de données](#6-base-de-données)
7. [Paiements Stripe](#7-paiements-stripe)
8. [Déploiement](#8-déploiement)
9. [Guide d'utilisation](#9-guide-dutilisation)
10. [Sécurité](#10-sécurité)

---

## 1. Vue d'ensemble

LearnI est une plateforme SaaS d'apprentissage alimentée par l'IA, conçue pour deux types d'utilisateurs :

- **Usage personnel** — étudiants autodidactes qui veulent apprendre seuls
- **Établissement scolaire** — professeurs qui gèrent des classes et suivent leurs élèves

### Flux principal

```
Utilisateur importe un PDF
        ↓
L'IA génère un quiz (10 ou 20 questions)
        ↓
L'utilisateur répond et consulte ses résultats
        ↓
Historique, statistiques, plan d'étude
```

---

## 2. Architecture technique

```
Frontend (React + TypeScript + Vite)
    │
    ├── Supabase Auth       → connexion / inscription
    ├── Supabase Database   → PostgreSQL + RLS
    ├── Supabase Edge Fns   → IA (Anthropic Claude) côté serveur
    └── Stripe Checkout     → paiements et abonnements
```

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/App.tsx` | Routage central, gestion du plan, superadmin |
| `src/utils/supabase.ts` | Toutes les fonctions base de données |
| `src/utils/stripe.ts` | Lancement du checkout Stripe |
| `src/hooks/useAuth.tsx` | Contexte Auth + profil utilisateur |
| `src/pages/HomePage.tsx` | Page d'accueil |
| `src/pages/PricingPage.tsx` | Plans et tarification |
| `src/pages/TutorPage.tsx` | Tuteur IA conversationnel |
| `src/pages/StudyPlanPage.tsx` | Calendrier d'étude |
| `src/pages/CoursesPage.tsx` | Génération de cours complets |
| `src/pages/CommunityPage.tsx` | Communautés Discord-like |
| `src/pages/TeacherDashboard.tsx` | Tableau de bord professeur |
| `src/pages/StudentDashboard.tsx` | Tableau de bord élève |
| `supabase/SCHEMA_COMPLET.sql` | Toutes les tables SQL |

---

## 3. Plans et accès

### Plans disponibles

| Plan | Prix | Accès |
|------|------|-------|
| **Gratuit** | 0$ | 2 quiz/jour, 10 questions max |
| **Starter** | 9.99$/mois | 5 quiz/jour, explications IA basiques |
| **Pro** | 22.99$/mois | Quiz illimités, flashcards, caméra, export PDF |
| **Autodidacte** | 35.99$/mois | Tout Pro + Tuteur IA + Cours + Plan d'étude |
| **Enseignant** | 35.99$/mois | Tout Pro + Gestion de classes + Suivi élèves |

### Matrice des fonctionnalités

| Fonctionnalité | Gratuit | Starter | Pro | Autodidacte | Enseignant |
|----------------|---------|---------|-----|-------------|------------|
| Quiz PDF | ✅ (2/j) | ✅ (5/j) | ✅ ∞ | ✅ ∞ | ✅ ∞ |
| Explications IA | ❌ | Basiques | Complètes | Complètes | Complètes |
| Flashcards IA | ❌ | ❌ | ✅ | ✅ | ✅ |
| Tuteur IA | ❌ | ❌ | ❌ | ✅ | ❌ |
| Plan d'étude | ❌ | ❌ | ✅ | ✅ | ❌ |
| Génération de cours | ❌ | ❌ | ❌ | ✅ | ❌ |
| Communautés | ❌ | ❌ | ✅ | ✅ | ✅ |
| Gestion de classes | ❌ | ❌ | ❌ | ❌ | ✅ |
| Superadmin | — accès total, assigné via SQL uniquement — |

---

## 4. Fonctionnalités

### 4.1 Génération de quiz

- Import PDF ou TXT
- L'IA génère 10 ou 20 questions à choix multiples
- Limite journalière selon le plan (2 pour gratuit, 5 pour Starter, illimité pour Pro+)
- Réinitialisation automatique à minuit

### 4.2 Tuteur IA (Autodidacte uniquement)

Trois modes de conversation :

| Mode | Couleur | Comportement |
|------|---------|--------------|
| **Débutant** | Vert | Explications simples, encourageant |
| **Professeur** | Violet | Rigoureux, questions de contrôle |
| **Examen** | Rouge | Pression d'examen, délais simulés |

**Règle anti-triche :** le tuteur ne complète jamais un devoir intégralement — il guide, explique, mais l'élève doit faire lui-même.

### 4.3 Communautés (Discord-like)

**Mode Autodidacte :**
- 8 communautés par matière (Mathématiques, Sciences, Informatique, etc.)
- Rejoindre / quitter librement
- Canaux : `#général`, `#questions`, `#ressources`, `#classement`, `#défis`
- Classement basé sur les scores de quiz
- Challenges de la semaine générés par l'IA

**Mode Scolaire :**
- Un professeur crée une communauté par classe
- Canaux : `#général`, `#questions`, `#ressources`
- `#ressources` : écriture réservée au professeur
- Badges : PROF (violet), ADMIN (rouge)

### 4.4 Challenge de la semaine

- Généré par l'IA sur le thème de la communauté
- 3 niveaux : débutant, intermédiaire, expert
- Durée : 2 semaines
- Les membres partagent leur solution dans le channel
- Créé par les professeurs ou le superadmin

### 4.5 Calendrier d'étude

- L'IA génère un plan personnalisé selon l'objectif et la date d'examen
- Vue calendrier semaine par semaine
- Chaque item : matière, description, durée estimée
- Cochage des tâches terminées
- **Accès :** Pro, Autodidacte, Élèves scolaires

### 4.6 Mes Cours (Autodidacte uniquement)

Flux en 3 étapes :
1. **Évaluation** — 5 questions pour déterminer le niveau (débutant / intermédiaire / expert)
2. **Génération** — l'IA crée un cours complet avec modules et leçons
3. **Apprentissage** — interface style TryHackMe : sidebar modules + contenu + exercices

### 4.7 Tableau de bord Professeur

- Créer et gérer des classes
- Générer un code de classe (6 lettres) à partager aux élèves
- Voir les résultats de toute la classe
- Créer une communauté Discord-like par classe

### 4.8 Tableau de bord Élève

- Rejoindre une classe avec un code
- Voir ses résultats et son plan d'étude

---

## 5. Edge Functions Supabase

Toutes les fonctions sont dans `supabase/functions/` et tournent sur Deno.

| Fonction | Route | Rôle |
|----------|-------|------|
| `generate-quiz` | `/functions/v1/generate-quiz` | Génère les questions QCM depuis un PDF |
| `tutor-chat` | `/functions/v1/tutor-chat` | Répond comme tuteur IA |
| `generate-study-plan` | `/functions/v1/generate-study-plan` | Génère le calendrier d'étude |
| `generate-course` | `/functions/v1/generate-course` | Évaluation + génération de cours complet |
| `generate-challenge` | `/functions/v1/generate-challenge` | Génère un challenge de la semaine |
| `create-checkout` | `/functions/v1/create-checkout` | Crée une session Stripe Checkout |
| `billing-portal` | `/functions/v1/billing-portal` | Accès au portail de facturation Stripe |
| `stripe-webhook` | `/functions/v1/stripe-webhook` | Reçoit les événements Stripe |

### Secrets Supabase nécessaires

À configurer dans Supabase → Settings → Edge Functions → Secrets :

```
ANTHROPIC_API_KEY          = sk-ant-...
STRIPE_SECRET_KEY          = sk_live_...  (ou sk_test_... en test)
STRIPE_WEBHOOK_SECRET      = whsec_...
STRIPE_PRICE_STARTER       = price_...
STRIPE_PRICE_PRO           = price_...
STRIPE_PRICE_AUTODIDACTE   = price_...
STRIPE_PRICE_TEACHER       = price_...
APP_URL                    = https://learni-three.vercel.app
```

### Déployer les edge functions

```bash
supabase functions deploy generate-quiz
supabase functions deploy tutor-chat
supabase functions deploy generate-study-plan
supabase functions deploy generate-course
supabase functions deploy generate-challenge
supabase functions deploy create-checkout
supabase functions deploy billing-portal
supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 6. Base de données

Voir le fichier complet : `supabase/SCHEMA_COMPLET.sql`

### Tables et leurs rôles

| Table | Description |
|-------|-------------|
| `profiles` | Un profil par utilisateur (role, plan, Stripe IDs) |
| `quiz_results` | Résultats de chaque quiz complété |
| `classrooms` | Classes créées par les enseignants |
| `classroom_members` | Relation élève ↔ classe |
| `communities` | Communautés autodidacte et scolaires |
| `community_members` | Relation utilisateur ↔ communauté |
| `community_channels` | Canaux dans chaque communauté |
| `community_messages` | Messages dans chaque canal |
| `study_plans` | Plans d'étude générés |
| `study_plan_items` | Items journaliers du plan d'étude |
| `user_courses` | Cours générés par l'IA |
| `course_modules` | Modules dans chaque cours |
| `course_lessons` | Leçons dans chaque module |
| `challenges` | Challenges de la semaine |
| `challenge_submissions` | Réponses des membres aux challenges |

### Assigner le rôle Superadmin

Ne jamais faire via l'app. Uniquement via SQL :

```sql
UPDATE public.profiles SET role = 'superadmin' WHERE email = 'ton@email.com';
```

---

## 7. Paiements Stripe

### Flux de paiement

```
Utilisateur clique "S'abonner"
        ↓
create-checkout → crée une session Stripe
        ↓
Redirection vers Stripe Checkout
        ↓
Paiement réussi → redirection vers /?payment=success
        ↓
stripe-webhook reçoit checkout.session.completed
        ↓
Mise à jour du plan dans profiles
        ↓
Page se recharge, plan activé
```

### Événements Stripe gérés

| Événement | Action |
|-----------|--------|
| `checkout.session.completed` | Active le plan dans profiles |
| `customer.subscription.updated` | Met à jour le plan |
| `customer.subscription.deleted` | Remet à free |
| `invoice.payment_failed` | Log l'erreur |

### Configuration Webhook Stripe

- URL : `https://wjbkizdzyllveypcngqq.supabase.co/functions/v1/stripe-webhook`
- Événements à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## 8. Déploiement

### Variables d'environnement (.env.local)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Important :** La clé Anthropic NE va PAS dans `.env.local`. Elle appartient dans les secrets Supabase Edge Functions sous le nom `ANTHROPIC_API_KEY`.

### Déployer sur Vercel

1. Connecte ton repo GitHub à Vercel
2. Ajoute les variables d'environnement dans Vercel → Settings → Environment Variables
3. Chaque push sur `main` redéploie automatiquement

### Commandes utiles

```bash
# Démarrer en local
npm run dev

# Build production
npm run build

# Lier le projet Supabase
supabase link --project-ref wjbkizdzyllveypcngqq

# Déployer une edge function
supabase functions deploy NOM_FONCTION

# Pousser sur GitHub
git add .
git commit -m "message"
git push origin main
```

---

## 9. Guide d'utilisation

### Pour un utilisateur (Usage personnel)

**Créer un compte :**
1. Aller sur learni-three.vercel.app
2. Choisir "Usage personnel"
3. Cliquer "Se connecter" → "Créer un compte"
4. Entrer email + mot de passe

**Générer un quiz :**
1. Cliquer "Importer un document"
2. Uploader un PDF ou fichier texte
3. Choisir le nombre de questions (10 ou 20)
4. Attendre quelques secondes — le quiz se génère automatiquement
5. Répondre aux questions et consulter les résultats

**Utiliser le Tuteur IA (plan Autodidacte) :**
1. Aller dans "Tuteur IA" via le menu
2. Choisir un mode : Débutant, Professeur, ou Examen
3. Optionnel : indiquer la matière
4. Poser sa question et converser

**Générer un cours (plan Autodidacte) :**
1. Aller dans "Mes Cours"
2. Entrer le sujet (ex : "Linux", "Cybersécurité", "Python")
3. Passer le quiz d'évaluation (5 questions)
4. Attendre la génération du cours complet
5. Naviguer dans les modules et leçons

**Rejoindre une communauté (plan Autodidacte) :**
1. Aller dans "Communautés"
2. Choisir une matière et cliquer "Rejoindre"
3. Discuter dans les canaux, partager des ressources
4. Relever les challenges de la semaine dans `#défis`

---

### Pour un Professeur

**Créer une classe :**
1. Créer un compte avec le rôle "Établissement scolaire"
2. Aller dans le Tableau de bord Professeur
3. Cliquer "Nouvelle classe" et entrer le nom
4. Copier le code de 6 lettres généré automatiquement
5. Partager ce code aux élèves

**Partager des ressources :**
1. Aller dans "Communautés" → ouvrir la communauté de la classe
2. Aller dans le canal `#ressources`
3. Envoyer un message — seuls les professeurs peuvent écrire ici

**Suivre les élèves :**
1. Dans le Tableau de bord Professeur
2. Section "Résultats de la classe" — voir tous les résultats par élève

---

### Pour un Élève (mode scolaire)

**Rejoindre une classe :**
1. Créer un compte avec le rôle "Établissement scolaire"
2. Aller dans le Tableau de bord Élève
3. Entrer le code de classe reçu du professeur
4. Accès aux ressources partagées et au plan d'étude

---

## 10. Sécurité

### Principes appliqués

- **Clés API côté serveur uniquement** — `ANTHROPIC_API_KEY` dans Supabase Secrets, jamais dans le frontend
- **Row Level Security (RLS)** — chaque utilisateur ne voit que ses propres données
- **Superadmin via SQL uniquement** — impossible d'élever son propre rôle via l'app
- **Webhook Stripe signé** — vérification HMAC-SHA256 native Deno, sans librairie externe
- **`.env.local` ignoré par Git** — couvert par `*.local` dans `.gitignore`
- **Repo GitHub privé** — code source non public

### Ce qui protège les données

| Couche | Protection |
|--------|------------|
| Auth Supabase | JWT tokens, sessions sécurisées |
| RLS PostgreSQL | Isolation des données par utilisateur |
| Edge Functions | Clés API jamais exposées au client |
| Stripe Webhooks | Signature vérifiée avant tout traitement |
| HTTPS | Vercel + Supabase forcent HTTPS |
