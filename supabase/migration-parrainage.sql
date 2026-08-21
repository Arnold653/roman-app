-- Parrainage : chaque lecteur peut partager son pseudo comme code ("?ref=pseudo"). À
-- l'inscription, si ce paramètre était présent, on relie le nouveau compte au parrain.
-- Pas de récompense automatique pour l'instant — juste le lien et le compteur affiché sur le
-- profil ; une mécanique de récompense pourra se brancher plus tard sur cette même colonne.

alter table profiles add column if not exists parraine_par uuid references profiles(id);

create or replace function public.handle_new_user()
returns trigger as $$
declare
  id_parrain uuid;
begin
  if new.raw_user_meta_data->>'parraine_par_pseudo' is not null then
    select id into id_parrain from public.profiles
    where pseudo = new.raw_user_meta_data->>'parraine_par_pseudo'
    limit 1;
  end if;

  insert into public.profiles (id, pseudo, parraine_par)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'pseudo', 'Lecteur' || substr(new.id::text, 1, 4)),
    id_parrain
  );
  return new;
end;
$$ language plpgsql security definer;
