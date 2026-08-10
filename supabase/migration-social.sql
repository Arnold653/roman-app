-- Migration : fonctionnalités communautaires (likes)
-- À exécuter dans l'éditeur SQL de Supabase (Supabase → SQL Editor → New query → coller → Run)

create table likes (
  chapitre_id uuid references chapitres(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (chapitre_id, user_id)
);

alter table likes enable row level security;

create policy "Likes visibles par tous" on likes for select using (true);
create policy "Utilisateur like avec son propre compte" on likes for insert with check (auth.uid() = user_id);
create policy "Utilisateur retire son propre like" on likes for delete using (auth.uid() = user_id);
