-- Migration : section "Livres" (ouvrages complets publiés en un seul fichier PDF,
-- distincts des "Romans" publiés chapitre par chapitre)
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

-- Transparence : mêmes champs de divulgation sur les Romans (déjà existants)
alter table romans add column if not exists genere_par_ia boolean default true;
alter table romans add column if not exists verifie_par text;

create table livres (
  id uuid default gen_random_uuid() primary key,
  titre text not null,
  slug text unique not null,
  auteur text,
  description text,
  genre text,
  fichier_url text not null,
  genere_par_ia boolean default true,
  verifie_par text,
  created_at timestamptz default now()
);

alter table livres enable row level security;

create policy "Livres visibles par tous" on livres for select using (true);

insert into storage.buckets (id, name, public)
values ('livres', 'livres', true)
on conflict (id) do nothing;

create policy "Fichiers de livres visibles par tous"
on storage.objects for select
using (bucket_id = 'livres');
