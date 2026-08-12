-- Migration : cache de l'extraction du texte des livres PDF + reprise de lecture
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

-- Cache du résultat de l'extraction (sections + table des matières), calculé une seule fois
-- au premier chargement plutôt qu'à chaque ouverture de l'app.
alter table livres add column if not exists contenu_extrait jsonb;
alter table livres add column if not exists contenu_extrait_le timestamptz;

-- Progression de lecture des livres PDF, sur le même principe que lecture_progress pour les romans
create table if not exists lecture_progress_livres (
  user_id uuid references profiles(id) on delete cascade,
  livre_id uuid references livres(id) on delete cascade,
  derniere_section int default 0,
  updated_at timestamptz default now(),
  primary key (user_id, livre_id)
);

alter table lecture_progress_livres enable row level security;

create policy "Progression livres privée" on lecture_progress_livres for all using (auth.uid() = user_id);
