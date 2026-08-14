-- Migration : monétisation à l'unité (chapitres et livres payants) via KKiaPay.
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

-- Prix en FCFA. 0 = gratuit (comportement actuel inchangé pour tout contenu existant).
alter table chapitres add column if not exists prix_fcfa integer not null default 0 check (prix_fcfa >= 0);
alter table livres add column if not exists prix_fcfa integer not null default 0 check (prix_fcfa >= 0);

-- Un déblocage = une tentative de paiement pour un chapitre OU un livre (jamais les deux).
create table if not exists deblocages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  chapitre_id uuid references chapitres(id) on delete cascade,
  livre_id uuid references livres(id) on delete cascade,
  montant_fcfa integer not null check (montant_fcfa > 0),
  transaction_id text,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'reussi', 'echoue')),
  created_at timestamptz default now(),
  constraint deblocage_une_seule_cible check (
    (chapitre_id is not null and livre_id is null) or (chapitre_id is null and livre_id is not null)
  )
);

-- Une transaction KKiaPay ne doit débloquer qu'une seule fois (idempotence webhook + confirmation client).
create unique index if not exists deblocages_transaction_id_idx on deblocages (transaction_id) where transaction_id is not null;

-- Empêche un lecteur d'avoir deux déblocages "réussi" pour le même chapitre/livre (au cas où).
create unique index if not exists deblocages_user_chapitre_reussi_idx on deblocages (user_id, chapitre_id) where statut = 'reussi' and chapitre_id is not null;
create unique index if not exists deblocages_user_livre_reussi_idx on deblocages (user_id, livre_id) where statut = 'reussi' and livre_id is not null;

alter table deblocages enable row level security;

-- Le lecteur ne voit que ses propres déblocages (pour afficher "déjà débloqué" côté app).
drop policy if exists "Lecteur voit ses propres deblocages" on deblocages;
create policy "Lecteur voit ses propres deblocages" on deblocages
  for select using (auth.uid() = user_id);

-- Aucune policy insert/update pour les clients : toute écriture passe par les routes API
-- (service_role, via lib/supabase/admin.js) pour empêcher un lecteur de se déclarer
-- lui-même "reussi" sans paiement vérifié côté serveur.
