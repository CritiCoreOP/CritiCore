-- Release-Erinnerungen: jeden Morgen um 06:00 UTC (07:00/08:00 deutscher Zeit) die Mails für
-- heutige Releases in die Queue legen. Einmalig im SQL-Editor ausführen, <PROJECT-REF> vorher
-- ersetzen. Nutzt den Service-Role-Key, der für die E-Mail-Queue schon im Vault liegt
-- (cron-email-queue.sql, Schritt 1). Die Function wird nur aufgerufen, wenn etwas fällig ist.
SELECT cron.schedule(
  'release-reminders',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT-REF>.supabase.co/functions/v1/release-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  )
  WHERE EXISTS (
    SELECT 1 FROM public.release_subscriptions
    WHERE notified_at IS NULL
      AND release_date BETWEEN (now() AT TIME ZONE 'Europe/Berlin')::date - 2 AND (now() AT TIME ZONE 'Europe/Berlin')::date
  );
  $$
);
