-- Schéma de base pour la plateforme de romans + communauté
-- À exécuter dans l'éditeur SQL de ton projet Supabase

-- Profils lecteurs (lié à auth.users de Supabase)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  pseudo text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Romans
create table romans (
  id uuid default gen_random_uuid() primary key,
  titre text not null,
  slug text unique not null,
  resume text,
  genre text,                          -- ex: 'aventure', 'romance', 'drame', 'suspense'...
  couverture_url text,
  -- niveau_theme: intensité du message porté par le roman, du plus discret au plus explicite
  -- 1 = valeurs universelles seulement (pardon, courage, sens)
  -- 2 = citations/réflexions de fin de chapitre
  -- 3 = thématique plus ouverte, proposée aux lecteurs engagés
  niveau_theme smallint default 1 check (niveau_theme between 1 and 3),
  statut text default 'en_cours' check (statut in ('en_cours','termine','a_venir')),
  created_at timestamptz default now()
);

-- Chapitres
create table chapitres (
  id uuid default gen_random_uuid() primary key,
  roman_id uuid references romans(id) on delete cascade,
  numero int not null,
  titre text,
  contenu text not null,
  citation_fin text,                   -- courte réflexion/citation optionnelle en fin de chapitre
  publie_le timestamptz default now(),
  unique (roman_id, numero)
);

-- Progression de lecture par utilisateur
create table lecture_progress (
  user_id uuid references profiles(id) on delete cascade,
  roman_id uuid references romans(id) on delete cascade,
  dernier_chapitre int default 0,
  updated_at timestamptz default now(),
  primary key (user_id, roman_id)
);

-- Engagement lecteur (sert à calculer qui est prêt pour du contenu plus explicite)
create table engagement_scores (
  user_id uuid references profiles(id) on delete cascade primary key,
  chapitres_lus int default 0,
  commentaires_postes int default 0,
  score int generated always as (chapitres_lus + commentaires_postes * 3) stored,
  updated_at timestamptz default now()
);

-- Commentaires (par chapitre, alimente la communauté)
create table commentaires (
  id uuid default gen_random_uuid() primary key,
  chapitre_id uuid references chapitres(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  contenu text not null,
  created_at timestamptz default now()
);

-- Fils de discussion communauté (clubs de lecture, discussions générales)
create table discussions (
  id uuid default gen_random_uuid() primary key,
  roman_id uuid references romans(id) on delete set null,
  titre text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  discussion_id uuid references discussions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  contenu text not null,
  created_at timestamptz default now()
);

-- Création automatique du profil (avec pseudo) à l'inscription
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, coalesce(new.raw_user_meta_data->>'pseudo', 'Lecteur' || substr(new.id::text, 1, 4)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security (à activer et affiner selon tes besoins)
alter table romans enable row level security;
alter table chapitres enable row level security;
alter table discussions enable row level security;

create policy "Romans visibles par tous" on romans for select using (true);
create policy "Chapitres visibles par tous" on chapitres for select using (true);
create policy "Discussions visibles par tous" on discussions for select using (true);
-- Pas de policy d'insertion : seule la clé service_role (utilisée par la page admin
-- côté serveur) peut ajouter des romans/chapitres, en contournant RLS.

alter table profiles enable row level security;
alter table lecture_progress enable row level security;
alter table engagement_scores enable row level security;
alter table commentaires enable row level security;
alter table messages enable row level security;

create policy "Profils visibles par tous" on profiles for select using (true);
create policy "Utilisateur modifie son profil" on profiles for update using (auth.uid() = id);

create policy "Progression privée" on lecture_progress for all using (auth.uid() = user_id);
create policy "Score privé" on engagement_scores for all using (auth.uid() = user_id);

create policy "Commentaires visibles par tous" on commentaires for select using (true);
create policy "Utilisateur poste ses commentaires" on commentaires for insert with check (auth.uid() = user_id);

create policy "Messages visibles par tous" on messages for select using (true);
create policy "Utilisateur poste ses messages" on messages for insert with check (auth.uid() = user_id);
