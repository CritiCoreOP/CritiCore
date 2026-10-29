-- E-Mail-Queue-Worker (hat Lovable außerhalb der Migrations angelegt).
-- Nach der Migration im SQL-Editor ausführen. Platzhalter vorher ersetzen.

-- 1. Service-Role-Key im Vault ablegen
SELECT vault.create_secret('<SERVICE-ROLE-KEY>', 'email_queue_service_role_key');

-- 2. Jede Minute prüfen und nur aufrufen, wenn Mails in der Queue liegen.
--    Eilige Mails stoßen den Worker selbst an (_shared/kick-email-queue.ts). Früher lief der Job
--    alle 5 Sekunden und füllte cron.job_run_details mit 17 280 Zeilen am Tag.
SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT-REF>.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  )
  WHERE (
      EXISTS (SELECT 1 FROM pgmq.q_auth_emails)
      OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails)
      OR EXISTS (SELECT 1 FROM pgmq.q_newsletter_emails)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.email_send_state WHERE retry_after_until > now()
    );
  $$
);
