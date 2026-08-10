-- Migration : chapitres programmés (système d'attente) + notifications push
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

alter table chapitres add column if not exists publie_le timestamptz default now();
alter table chapitres add column if not exists notifie boolean default true;
-- Les chapitres déjà publiés ne doivent pas redéclencher de notification via la tâche planifiée
update chapitres set notifie = true where notifie is null;

create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Utilisateur gere ses propres abonnements push" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
