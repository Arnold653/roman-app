-- Migration : section "Contes / Histoires Africaines", section à part entière (pas un genre
-- dans Livres) pour capter l'audience des contes africains, en forte croissance sur
-- YouTube/TikTok. Même mécanique que la table `livres` (upload + extraction + statut), avec
-- un champ `region` en plus pour l'origine du conte (Bénin, Sénégal, Mali...).
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

create table contes_africains (
  id uuid default gen_random_uuid() primary key,
  titre text not null,
  slug text unique not null,
  auteur text,
  description text,
  genre text,
  region text,
  fichier_url text not null,
  fichier_type text default 'pdf',
  genere_par_ia boolean default true,
  verifie_par text,
  statut text default 'brouillon' check (statut in ('brouillon', 'publie')),
  contenu_extrait jsonb,
  contenu_extrait_le timestamptz,
  created_at timestamptz default now()
);

alter table contes_africains enable row level security;

create policy "Contes africains visibles par tous" on contes_africains for select using (true);

insert into storage.buckets (id, name, public)
values ('contes-africains', 'contes-africains', true)
on conflict (id) do nothing;

create policy "Fichiers de contes africains visibles par tous"
on storage.objects for select
using (bucket_id = 'contes-africains');

-- Progression de lecture, même principe que lecture_progress_livres.
create table if not exists lecture_progress_contes_africains (
  user_id uuid references profiles(id) on delete cascade,
  conte_id uuid references contes_africains(id) on delete cascade,
  derniere_section int default 0,
  updated_at timestamptz default now(),
  primary key (user_id, conte_id)
);

alter table lecture_progress_contes_africains enable row level security;

create policy "Progression contes africains privée" on lecture_progress_contes_africains for all using (auth.uid() = user_id);
