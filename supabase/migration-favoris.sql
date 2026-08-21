-- Favoris / liste de lecture : un lecteur met un titre de côté (n'importe quel des 4 types)
-- pour y revenir plus tard, sans que ça ait de lien avec sa progression de lecture réelle.

create table if not exists favoris (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  roman_id uuid references romans(id) on delete cascade,
  livre_id uuid references livres(id) on delete cascade,
  conte_africain_id uuid references contes_africains(id) on delete cascade,
  conte_enfant_id uuid references contes_enfants(id) on delete cascade,
  created_at timestamptz default now(),
  constraint favori_une_seule_cible check (
    (case when roman_id is not null then 1 else 0 end
     + case when livre_id is not null then 1 else 0 end
     + case when conte_africain_id is not null then 1 else 0 end
     + case when conte_enfant_id is not null then 1 else 0 end) = 1
  )
);

-- Un seul favori par lecteur et par cible (pas de doublon si on clique deux fois par erreur).
create unique index if not exists favoris_user_roman_idx on favoris (user_id, roman_id) where roman_id is not null;
create unique index if not exists favoris_user_livre_idx on favoris (user_id, livre_id) where livre_id is not null;
create unique index if not exists favoris_user_conte_africain_idx on favoris (user_id, conte_africain_id) where conte_africain_id is not null;
create unique index if not exists favoris_user_conte_enfant_idx on favoris (user_id, conte_enfant_id) where conte_enfant_id is not null;

alter table favoris enable row level security;

create policy "Lecteur gere ses propres favoris" on favoris
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
