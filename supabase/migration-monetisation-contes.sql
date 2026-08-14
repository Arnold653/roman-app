-- Migration : monétisation des Contes Africains et Contes Enfants, même modèle que les Livres
-- (gratuit / pourboire / payant / bonus). Complète migration-monetisation.sql,
-- migration-monetisation-livres.sql et migration-monetisation-roman.sql (déjà appliquées),
-- ne pas les relancer.
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

-- Mêmes 4 modes que pour les livres :
--   'gratuit'   → comportement actuel, rien à payer, rien de spécial
--   'pourboire' → conte 100% gratuit + un bouton "Soutenir l'auteur" (montant libre)
--   'payant'    → le conte entier est payant (prix_fcfa fait foi)
--   'bonus'     → le conte reste gratuit, un contenu bonus à côté est payant
alter table contes_africains add column if not exists mode_monetisation text not null default 'gratuit'
  check (mode_monetisation in ('gratuit', 'pourboire', 'payant', 'bonus'));
alter table contes_africains add column if not exists prix_fcfa integer not null default 0 check (prix_fcfa >= 0);
alter table contes_africains add column if not exists bonus_contenu text;

alter table contes_enfants add column if not exists mode_monetisation text not null default 'gratuit'
  check (mode_monetisation in ('gratuit', 'pourboire', 'payant', 'bonus'));
alter table contes_enfants add column if not exists prix_fcfa integer not null default 0 check (prix_fcfa >= 0);
alter table contes_enfants add column if not exists bonus_contenu text;

-- Un déblocage peut maintenant cibler aussi un conte africain ou un conte enfant,
-- en plus d'un chapitre, d'un livre ou d'un roman (accès anticipé).
alter table deblocages add column if not exists conte_africain_id uuid references contes_africains(id) on delete cascade;
alter table deblocages add column if not exists conte_enfant_id uuid references contes_enfants(id) on delete cascade;

alter table deblocages drop constraint if exists deblocage_une_seule_cible;
alter table deblocages add constraint deblocage_une_seule_cible check (
  (case when chapitre_id is not null then 1 else 0 end
 + case when livre_id is not null then 1 else 0 end
 + case when roman_id is not null then 1 else 0 end
 + case when conte_africain_id is not null then 1 else 0 end
 + case when conte_enfant_id is not null then 1 else 0 end) = 1
);

-- Un pourboire doit pouvoir être versé plusieurs fois ; seul un vrai déblocage doit être unique
-- par lecteur et par conte (même logique que pour les livres).
create unique index if not exists deblocages_user_conte_africain_reussi_idx on deblocages (user_id, conte_africain_id)
  where statut = 'reussi' and conte_africain_id is not null and type = 'deblocage';
create unique index if not exists deblocages_user_conte_enfant_reussi_idx on deblocages (user_id, conte_enfant_id)
  where statut = 'reussi' and conte_enfant_id is not null and type = 'deblocage';
