-- Migration : section "Contes pour Enfants" (Storybooks), section à part entière — même
-- mécanique que contes_africains (upload + extraction + statut), avec un champ `tranche_age`
-- au lieu de `region`, pour cibler l'âge du lecteur plutôt que l'origine géographique.
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

create table contes_enfants (
  id uuid default gen_random_uuid() primary key,
  titre text not null,
  slug text unique not null,
  auteur text,
  description text,
  genre text,
  tranche_age text,
  fichier_url text not null,
  fichier_type text default 'pdf',
  genere_par_ia boolean default true,
  verifie_par text,
  statut text default 'brouillon' check (statut in ('brouillon', 'publie')),
  contenu_extrait jsonb,
  contenu_extrait_le timestamptz,
  created_at timestamptz default now()
);

alter table contes_enfants enable row level security;

create policy "Contes enfants visibles par tous" on contes_enfants for select using (true);

insert into storage.buckets (id, name, public)
values ('contes-enfants', 'contes-enfants', true)
on conflict (id) do nothing;

create policy "Fichiers de contes enfants visibles par tous"
on storage.objects for select
using (bucket_id = 'contes-enfants');

-- Progression de lecture, même principe que lecture_progress_contes_africains.
create table if not exists lecture_progress_contes_enfants (
  user_id uuid references profiles(id) on delete cascade,
  conte_id uuid references contes_enfants(id) on delete cascade,
  derniere_section int default 0,
  updated_at timestamptz default now(),
  primary key (user_id, conte_id)
);

alter table lecture_progress_contes_enfants enable row level security;

create policy "Progression contes enfants privée" on lecture_progress_contes_enfants for all using (auth.uid() = user_id);
