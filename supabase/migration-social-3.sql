-- Migration : bio sur le profil + stockage des photos de profil
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

alter table profiles add column if not exists bio text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars visibles par tous"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Utilisateur televerse son propre avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Utilisateur remplace son propre avatar"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Utilisateur supprime son propre avatar"
on storage.objects for delete
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
