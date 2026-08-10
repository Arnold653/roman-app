-- Migration : messages privés (DM) + stories éphémères
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

-- Conversations privées entre deux lecteurs (user_a < user_b en texte, pour éviter les doublons)
create table dm_conversations (
  id uuid default gen_random_uuid() primary key,
  user_a uuid references profiles(id) on delete cascade,
  user_b uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_a, user_b),
  check (user_a <> user_b)
);

create table dm_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references dm_conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  contenu text not null,
  lu boolean default false,
  created_at timestamptz default now()
);

alter table dm_conversations enable row level security;
alter table dm_messages enable row level security;

create policy "Voir ses propres conversations" on dm_conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);
create policy "Creer une conversation dont on fait partie" on dm_conversations for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "Voir les messages de ses conversations" on dm_messages for select
  using (exists (
    select 1 from dm_conversations c
    where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
  ));
create policy "Envoyer un message dans ses conversations" on dm_messages for insert
  with check (
    auth.uid() = sender_id and exists (
      select 1 from dm_conversations c
      where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );
create policy "Marquer les messages recus comme lus" on dm_messages for update
  using (exists (
    select 1 from dm_conversations c
    where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
  ));

create index dm_messages_conversation_idx on dm_messages (conversation_id, created_at);

-- Stories : mise à jour courte, visible seulement 24h
create table stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  contenu text not null,
  created_at timestamptz default now()
);

alter table stories enable row level security;

create policy "Stories des dernieres 24h visibles par tous" on stories for select
  using (created_at > now() - interval '24 hours');
create policy "Utilisateur publie sa propre story" on stories for insert
  with check (auth.uid() = user_id);
create policy "Utilisateur supprime sa propre story" on stories for delete
  using (auth.uid() = user_id);
