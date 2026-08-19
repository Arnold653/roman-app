-- Migration : sous-titre des livres (affiché sous le titre, sous la même page de garde)
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → coller → Run)

alter table livres add column if not exists sous_titre text;
