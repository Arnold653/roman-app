-- Migration : corrige les policies RLS de romans/chapitres/livres qui étaient "visibles par
-- tous" sans condition. Sans ce correctif, un brouillon ou un chapitre programmé (Premières)
-- reste lisible par n'importe qui via un appel direct à l'API Supabase (anon key), en
-- contournant complètement le filtrage fait côté app Next.js.
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

-- L'admin doit continuer à pouvoir prévisualiser un brouillon via la page publique normale
-- (app/roman/[slug]/page.js le fait déjà côté JS avec `estAdmin`), donc la policy RLS doit
-- elle aussi savoir reconnaître l'admin — sans quoi Supabase refuserait même de renvoyer la
-- ligne à ta propre session, brouillon ou pas. On ajoute un simple drapeau sur `profiles`
-- plutôt que de coller ton email admin en clair dans une policy SQL.
alter table profiles add column if not exists is_admin boolean not null default false;

-- ⚠️ Étape manuelle : marque TON compte comme admin (remplace l'email ci-dessous par le tien,
-- celui utilisé pour ADMIN_EMAIL dans les variables d'environnement Vercel) :
-- update profiles set is_admin = true
-- where id = (select id from auth.users where email = 'ton-email-admin@exemple.com');

drop policy if exists "Romans visibles par tous" on romans;
create policy "Romans publiés ou visibles par l'admin" on romans
  for select using (
    statut_visibilite = 'publie'
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "Chapitres visibles par tous" on chapitres;
create policy "Chapitres sortis ou visibles par l'admin" on chapitres
  for select using (
    (
      (publie_le is null or publie_le <= now())
      and exists (select 1 from romans r where r.id = chapitres.roman_id and r.statut_visibilite = 'publie')
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "Livres visibles par tous" on livres;
create policy "Livres publiés ou visibles par l'admin" on livres
  for select using (
    statut = 'publie'
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
