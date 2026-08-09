# Récits — plateforme de romans + communauté

Next.js + Supabase. Publie un roman par semaine, les lecteurs le lisent, commentent et discutent.

## Démarrer en local

1. `npm install`
2. Crée un projet sur https://supabase.com
3. Dans l'éditeur SQL de Supabase, exécute le contenu de `supabase/schema.sql`
4. Copie `.env.local.example` en `.env.local` et renseigne l'URL et la clé anonyme du projet Supabase (Project Settings → API)
5. `npm run dev` puis ouvre http://localhost:3000

## Publier un nouveau chapitre

Pour l'instant, ajoute les romans et chapitres directement dans les tables Supabase
(`romans`, `chapitres`) via l'éditeur de table. Une interface d'administration
pourra être ajoutée ensuite pour que ce soit plus rapide chaque semaine.

## Déployer depuis un téléphone (sans PC)

1. Crée un dépôt GitHub vide (juste le nom, sans fichiers) depuis l'appli GitHub ou github.com sur ton téléphone
2. Crée un token d'accès personnel : github.com → Settings → Developer settings → Personal access tokens → génère-en un avec les droits "repo"
3. Donne-moi ce dépôt (nom + token) et je pousse tout le code directement dedans pour toi, sans que tu aies à manipuler de fichiers
4. Sur vercel.com (dans le navigateur du téléphone), importe ce dépôt GitHub — l'interface fonctionne bien sur mobile
5. Ajoute les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`) dans les réglages du projet Vercel
6. Déploie — Vercel fait tout le `npm install` / build automatiquement

## Publier un chapitre chaque semaine

Une fois déployé, connecte-toi avec ton compte admin (celui qui correspond à `ADMIN_EMAIL`)
et va sur `/admin` — un formulaire simple pour publier un roman/chapitre depuis ton téléphone,
aucune manipulation technique nécessaire.

## Structure

- `app/page.js` — liste des romans (accueil)
- `app/roman/[slug]/page.js` — page de lecture d'un roman (dernier chapitre + commentaires)
- `app/login/page.js` — connexion / inscription
- `app/communaute/page.js` — fils de discussion
- `supabase/schema.sql` — schéma de base de données, y compris le champ `niveau_theme`
  sur chaque roman (1 = valeurs universelles, 2 = citations de fin de chapitre,
  3 = thématique plus ouverte pour les lecteurs engagés) et `engagement_scores`
  pour repérer les lecteurs les plus actifs.

## Prochaines étapes suggérées

- Interface d'administration pour publier un chapitre sans passer par Supabase
- Notifications par email à la publication d'un nouveau chapitre
- Historique de lecture par utilisateur (reprendre où on s'est arrêté)
- Page de profil public des lecteurs
