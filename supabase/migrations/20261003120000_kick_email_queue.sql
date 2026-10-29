-- Startet process-email-queue sofort, statt auf den Cron (jede Minute) zu warten.
-- Der direkte HTTP-Aufruf aus den Functions kam nicht an (Test 2026-10-03: Login-Code erst nach
-- 39 s vom Cron verschickt). Diese Funktion führt deshalb den Befehl des Cron-Jobs aus: Er enthält
-- die Function-URL und den Vault-Key und funktioniert nachweislich. Dadurch steht hier keine
-- Project-URL. pg_net schickt den Request im Hintergrund, der Aufrufer wartet nicht auf den Versand.
CREATE OR REPLACE FUNCTION public.kick_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cmd text;
BEGIN
  SELECT regexp_replace(command, ';\s*$', '') INTO cmd
  FROM cron.job
  WHERE jobname = 'process-email-queue';

  IF cmd IS NOT NULL THEN
    EXECUTE cmd;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.kick_email_queue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kick_email_queue() TO service_role;
