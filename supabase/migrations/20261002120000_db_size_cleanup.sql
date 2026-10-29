-- Datenbank wieder unter das Free-Plan-Limit bringen (Stand 2026-10-02: 674 von 500 MB).
--
-- api_cache (448 MB): Abgelaufene Einträge wurden nie gelöscht. cleanup_expired_cache() gab es,
-- aber keinen Cron-Job dafür. 88 % der Zeilen waren abgelaufen, fast alle von einem Crawler, der
-- über "Ähnliche Titel" tausende Detailseiten in allen fünf Sprachen abruft (~5 000 neue Keys pro Stunde).
-- cron.job_run_details (101 MB): process-email-queue lief alle 5 Sekunden, 17 280 Zeilen am Tag.
--
-- Die einmalige Bereinigung (TRUNCATE) steht in supabase/manual/cleanup-db-size.sql.

-- 1) api_cache: expires_at und der Index darauf gibt es schon seit 20260228105857.
--    idx_api_cache_key ist doppelt, der UNIQUE-Constraint auf cache_key bringt einen eigenen Index mit.
DROP INDEX IF EXISTS public.idx_api_cache_key;

-- 2) Abgelaufene Cache-Einträge löschen. AniList-Einträge bleiben einen Tag länger liegen:
--    Die Function fällt bei 429/5xx von AniList auf den abgelaufenen Eintrag zurück.
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.api_cache WHERE expires_at < now() AND cache_key NOT LIKE 'anilist:%';
  DELETE FROM public.api_cache WHERE expires_at < now() - interval '1 day' AND cache_key LIKE 'anilist:%';
$$;

-- Lief bisher für jeden über /rest/v1/rpc
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_cache() FROM PUBLIC, anon, authenticated;

-- 3) Aufräum-Jobs. cron.schedule mit Namen ersetzt einen vorhandenen Job gleichen Namens.
--    Der Cache wird stündlich geleert, nicht täglich: Bei ~5 000 neuen Keys pro Stunde lägen sonst
--    bis zu 24 Stunden abgelaufene Einträge in der Tabelle.
SELECT cron.schedule(
  'cleanup-api-cache',
  '17 * * * *',
  $$SELECT public.cleanup_expired_cache()$$
);

SELECT cron.schedule(
  'cleanup-cron-run-details',
  '23 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE start_time < now() - interval '3 days'$$
);

-- 4) E-Mail-Queue jede Minute statt alle 5 Sekunden (17 280 → 1 440 Läufe am Tag).
--    Mails, auf die jemand wartet (Login-Code, Passwort-Reset, Newsletter-Bestätigung), stoßen den
--    Worker direkt an (supabase/functions/_shared/kick-email-queue.ts). Der Cron fängt nur noch
--    Wiederholungen und Newsletter-Batches auf. Der Job selbst ist in supabase/manual/cron-email-queue.sql
--    angelegt, weil er den Service-Role-Key braucht; hier wird nur der Takt geändert.
SELECT cron.alter_job(job_id := jobid, schedule := '* * * * *')
FROM cron.job
WHERE jobname = 'process-email-queue';

-- 5) media_enrichment ist schlank (KI-Tags und Kurzbeschreibung, keine Roh-Payloads, keine Duplikate
--    dank UNIQUE (media_type, source_id)). Drei Indizes wurden aber nie benutzt (idx_scan = 0):
--    Kein Code filtert nach tags oder categories, und Abfragen nach media_type deckt der UNIQUE-Index ab.
DROP INDEX IF EXISTS public.idx_media_enrichment_type;
DROP INDEX IF EXISTS public.idx_media_enrichment_tags;
DROP INDEX IF EXISTS public.idx_media_enrichment_categories;
