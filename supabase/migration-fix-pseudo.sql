-- Migration : correction du bug "Lecteur introuvable" causé par des pseudos non nettoyés
-- (espaces en début/fin, ou uniquement des espaces) qui ne correspondent plus à l'URL /profil/...
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

-- 1) Nettoie les pseudos existants qui contiennent des espaces superflus
update profiles set pseudo = trim(regexp_replace(pseudo, '\s+', ' ', 'g'))
where pseudo <> trim(regexp_replace(pseudo, '\s+', ' ', 'g'));

-- 2) Si un nettoyage laisse un pseudo vide (ou en cas de doublon après nettoyage),
-- on retombe sur un pseudo généré à partir de l'identifiant, comme le fait le déclencheur.
update profiles set pseudo = 'Lecteur' || substr(id::text, 1, 4)
where trim(pseudo) = '';

-- 3) Durcit le déclencheur de création automatique du profil à l'inscription : il nettoie
-- désormais lui-même le pseudo transmis, au cas où le nettoyage côté formulaire serait
-- un jour contourné (appel direct à l'API, ancienne version de l'app encore en cache, etc.)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  pseudo_nettoye text := trim(regexp_replace(coalesce(new.raw_user_meta_data->>'pseudo', ''), '\s+', ' ', 'g'));
begin
  insert into public.profiles (id, pseudo)
  values (new.id, nullif(pseudo_nettoye, ''));

  update public.profiles set pseudo = 'Lecteur' || substr(new.id::text, 1, 4)
  where id = new.id and pseudo is null;

  return new;
end;
$$ language plpgsql security definer;
