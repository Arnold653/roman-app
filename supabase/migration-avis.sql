-- Notes et avis des lecteurs, sur les 4 types de contenu (même schéma que favoris.sql :
-- une seule cible parmi les 4 colonnes, contrainte en base).

create table if not exists avis (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  roman_id uuid references romans(id) on delete cascade,
  livre_id uuid references livres(id) on delete cascade,
  conte_africain_id uuid references contes_africains(id) on delete cascade,
  conte_enfant_id uuid references contes_enfants(id) on delete cascade,
  note smallint not null check (note between 1 and 5),
  commentaire text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint avis_une_seule_cible check (
    (case when roman_id is not null then 1 else 0 end
     + case when livre_id is not null then 1 else 0 end
     + case when conte_africain_id is not null then 1 else 0 end
     + case when conte_enfant_id is not null then 1 else 0 end) = 1
  )
);

-- Un seul avis par lecteur et par titre — un nouvel envoi met à jour l'avis existant (upsert).
create unique index if not exists avis_user_roman_idx on avis (user_id, roman_id) where roman_id is not null;
create unique index if not exists avis_user_livre_idx on avis (user_id, livre_id) where livre_id is not null;
create unique index if not exists avis_user_conte_africain_idx on avis (user_id, conte_africain_id) where conte_africain_id is not null;
create unique index if not exists avis_user_conte_enfant_idx on avis (user_id, conte_enfant_id) where conte_enfant_id is not null;

alter table avis enable row level security;

drop policy if exists "Avis visibles par tous" on avis;
create policy "Avis visibles par tous" on avis for select using (true);
drop policy if exists "Lecteur gere son propre avis" on avis;
create policy "Lecteur gere son propre avis" on avis
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
