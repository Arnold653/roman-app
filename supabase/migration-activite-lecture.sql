-- Un enregistrement par lecteur et par jour où il a ouvert une page de lecture — sert
-- uniquement à calculer la série de lecture (streak), pas une progression détaillée.

create table if not exists activite_lecture (
  user_id uuid references profiles(id) on delete cascade not null,
  jour date not null,
  primary key (user_id, jour)
);

alter table activite_lecture enable row level security;

create policy "Activite de lecture privee" on activite_lecture for all using (auth.uid() = user_id);
