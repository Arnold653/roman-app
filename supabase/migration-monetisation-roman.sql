-- Migration : "Roman en Première" — un roman entier peut être programmé avec une date de sortie
-- officielle + un prix d'accès anticipé, sur le même principe que les chapitres individuels.
-- À exécuter dans l'éditeur SQL de Supabase. Complète les migrations précédentes, ne pas les relancer.

-- Date de sortie officielle du roman (null = pas de programmation, comportement actuel inchangé :
-- visible dès que statut_visibilite = 'publie'). Avant cette date, avec un prix > 0, les lecteurs
-- peuvent payer pour accéder à tout ce qui est déjà écrit sans attendre.
alter table romans add column if not exists publie_le timestamptz;
alter table romans add column if not exists prix_fcfa integer not null default 0 check (prix_fcfa >= 0);

-- Un déblocage peut maintenant aussi cibler un roman entier (accès anticipé), en plus d'un
-- chapitre, d'un livre ou d'un pourboire.
alter table deblocages add column if not exists roman_id uuid references romans(id) on delete cascade;

alter table deblocages drop constraint if exists deblocage_une_seule_cible;
alter table deblocages add constraint deblocage_une_seule_cible check (
  (case when chapitre_id is not null then 1 else 0 end
 + case when livre_id is not null then 1 else 0 end
 + case when roman_id is not null then 1 else 0 end) = 1
);

create unique index if not exists deblocages_user_roman_reussi_idx on deblocages (user_id, roman_id)
  where statut = 'reussi' and roman_id is not null and type = 'deblocage';
