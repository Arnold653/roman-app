-- Migration : suppression des tables mortes discussions/messages (fils de forum jamais
-- utilisés — aucune policy d'insertion, aucune UI de création, jamais référencées dans le
-- code de l'app). La page Communauté a été reconstruite avec de vraies données (stats,
-- classements, réactions) sans en avoir besoin.
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)
-- ⚠️ Irréversible — mais les tables sont vides en pratique, donc rien à perdre.

drop table if exists messages cascade;
drop table if exists discussions cascade;
