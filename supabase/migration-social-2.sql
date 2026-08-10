-- Migration : abonnements entre lecteurs + notifications
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  suivi_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, suivi_id),
  check (follower_id <> suivi_id)
);

alter table follows enable row level security;

create policy "Abonnements visibles par tous" on follows for select using (true);
create policy "Utilisateur s'abonne avec son propre compte" on follows for insert with check (auth.uid() = follower_id);
create policy "Utilisateur se desabonne lui-meme" on follows for delete using (auth.uid() = follower_id);

create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,  -- destinataire
  type text not null,                                       -- 'nouveau_chapitre' | 'nouveau_follower' | 'nouveau_commentaire'
  contenu text not null,                                     -- texte affiché
  lien text not null,                                        -- URL de destination
  lu boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "Utilisateur voit ses propres notifications" on notifications for select using (auth.uid() = user_id);
create policy "Utilisateur marque ses notifications comme lues" on notifications for update using (auth.uid() = user_id);
-- Pas de policy d'insertion cote client : seule la cle service_role (routes API) cree des notifications.

create index notifications_user_id_idx on notifications (user_id, lu, created_at desc);
