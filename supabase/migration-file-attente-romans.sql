-- La colonne romans.statut (en_cours/termine/a_venir) existe depuis le schéma d'origine mais
-- n'a jamais été utilisée par l'app jusqu'ici — tous les romans existants portent donc la valeur
-- par défaut 'en_cours', qu'ils soient publiés ou non. On la réaligne sur la réalité avant
-- d'activer la file d'attente automatique (max 5 romans "en_cours" à la fois) :
--   - romans déjà publiés -> 'en_cours' (ils comptent dans la limite, comme c'est déjà le cas
--     dans les faits : aucun n'est dépublié par cette migration)
--   - romans en brouillon -> null (hors file, comme avant)
update romans set statut = case when statut_visibilite = 'publie' then 'en_cours' else null end;

alter table romans alter column statut drop default;
