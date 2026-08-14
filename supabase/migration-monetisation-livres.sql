-- Migration : monétisation des livres, sans mur payant obligatoire.
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)
-- Complète migration-monetisation.sql (déjà appliquée), ne pas la relancer.

-- Un livre a un mode de monétisation explicite, choisi par l'admin :
--   'gratuit'   → comportement actuel, rien à payer, rien de spécial
--   'pourboire' → livre 100% gratuit + un bouton "Soutenir l'auteur" (montant libre choisi par le lecteur)
--   'payant'    → le livre entier est payant (prix_fcfa fait foi)
--   'bonus'     → le livre reste gratuit, mais un contenu bonus (postface, notes...) est payant à côté
alter table livres add column if not exists mode_monetisation text not null default 'gratuit'
  check (mode_monetisation in ('gratuit', 'pourboire', 'payant', 'bonus'));

-- Texte du bonus payant, affiché uniquement à ceux qui l'ont débloqué (mode 'bonus').
alter table livres add column if not exists bonus_contenu text;

-- Un déblocage peut être un vrai déblocage de contenu (prix fixe, débloque quelque chose) ou
-- un pourboire libre (montant choisi par le lecteur, ne débloque rien — pur soutien).
alter table deblocages add column if not exists type text not null default 'deblocage'
  check (type in ('deblocage', 'pourboire'));

-- L'ancien index empêchait un lecteur d'avoir plus d'un déblocage "réussi" par livre — correct
-- pour un vrai déblocage, mais un pourboire doit pouvoir être versé plusieurs fois. On restreint
-- donc la contrainte d'unicité aux seuls vrais déblocages.
drop index if exists deblocages_user_livre_reussi_idx;
create unique index deblocages_user_livre_reussi_idx on deblocages (user_id, livre_id)
  where statut = 'reussi' and livre_id is not null and type = 'deblocage';
