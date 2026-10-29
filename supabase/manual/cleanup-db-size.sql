-- Einmalige Bereinigung nach der Migration 20261002120000_db_size_cleanup.sql.
-- Im SQL-Editor ausführen. Löscht nur den API-Cache und das Cron-Protokoll, keine Inhalte.

-- Vorher: Größen ansehen
SELECT c.oid::regclass AS tabelle, pg_size_pretty(pg_total_relation_size(c.oid)) AS groesse
FROM pg_class c
WHERE c.oid IN ('public.api_cache'::regclass, 'cron.job_run_details'::regclass, 'public.media_enrichment'::regclass);

-- 1) API-Cache leeren (~450 MB). Er füllt sich beim nächsten Aufruf wieder, dann mit den gekürzten
--    Antworten. TRUNCATE gibt den Platz sofort frei, ein VACUUM FULL ist danach nicht nötig.
TRUNCATE public.api_cache;

-- 2) Cron-Protokoll leeren (~100 MB). DELETE + VACUUM FULL geht hier nicht: Die Tabelle gehört
--    supabase_admin, und VACUUM FULL darf nur der Eigentümer. TRUNCATE darf die Rolle postgres.
TRUNCATE cron.job_run_details;

-- Nachher: Datenbankgröße
SELECT pg_size_pretty(pg_database_size(current_database())) AS datenbank;

-- Alternative zu 1), falls die noch gültigen Cache-Einträge bleiben sollen.
-- VACUUM FULL einzeln ausführen (nicht zusammen mit anderen Befehlen), es sperrt die Tabelle kurz:
--   DELETE FROM public.api_cache WHERE expires_at < now();
--   VACUUM FULL public.api_cache;
