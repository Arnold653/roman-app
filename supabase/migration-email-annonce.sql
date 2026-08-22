-- Livres et Contes n'ont pas de lecteurs déjà engagés au moment de la publication (contrairement
-- aux Romans, où on notifie les lecteurs qui suivent déjà une progression) : l'email d'annonce
-- part donc à toute la base de lecteurs, une seule fois par titre — ce flag évite un renvoi à
-- chaque bascule brouillon/publié (dépublier puis republier ne doit pas spammer une 2e fois).

alter table livres add column if not exists email_annonce_envoye boolean default false;
alter table contes_africains add column if not exists email_annonce_envoye boolean default false;
alter table contes_enfants add column if not exists email_annonce_envoye boolean default false;
