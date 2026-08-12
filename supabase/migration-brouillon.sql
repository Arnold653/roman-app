-- Migration : workflow brouillon → publié pour romans et livres, upload multi-format
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

-- Un livre/roman en 'brouillon' n'est visible que dans l'admin, le temps de vérifier
-- l'extraction avant de le rendre public.
alter table livres add column if not exists statut text default 'brouillon' check (statut in ('brouillon', 'publie'));
alter table romans add column if not exists statut_visibilite text default 'brouillon' check (statut_visibilite in ('brouillon', 'publie'));

-- Format du fichier source uploadé, pour savoir comment le ré-extraire si besoin.
alter table livres add column if not exists fichier_type text default 'pdf' check (fichier_type in ('pdf', 'md', 'txt', 'epub'));

-- Les livres/romans déjà en ligne avant cette migration restent visibles (on ne casse rien
-- de ce qui existe déjà en production).
update livres set statut = 'publie' where statut = 'brouillon' and created_at < now();
update romans set statut_visibilite = 'publie' where statut_visibilite = 'brouillon' and created_at < now();
