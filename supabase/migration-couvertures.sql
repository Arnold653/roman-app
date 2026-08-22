-- Vraies couvertures (image uploadée) pour les 4 sections.
-- romans a déjà couverture_url (voir schema.sql) : rien à faire pour cette table.

alter table livres add column if not exists couverture_url text;
alter table contes_africains add column if not exists couverture_url text;
alter table contes_enfants add column if not exists couverture_url text;

-- Bucket dédié, partagé par les 4 sections (un sous-dossier par section : romans/, livres/,
-- contes-africains/, contes-enfants/), pour ne pas multiplier les buckets.
insert into storage.buckets (id, name, public)
values ('couvertures', 'couvertures', true)
on conflict (id) do nothing;

drop policy if exists "Couvertures visibles par tous" on storage.objects;
create policy "Couvertures visibles par tous"
on storage.objects for select
using (bucket_id = 'couvertures');
