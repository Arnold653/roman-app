-- La contrainte posée par migration-brouillon.sql autorisait déjà 'epub' mais pas 'docx'.
-- À exécuter dans Supabase SQL Editor après la mise en prod du support DOCX.
alter table livres drop constraint if exists livres_fichier_type_check;
alter table livres add constraint livres_fichier_type_check
  check (fichier_type in ('pdf', 'md', 'txt', 'epub', 'docx'));
