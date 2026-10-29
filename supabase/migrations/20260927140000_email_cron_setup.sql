-- E-Mail-Versand wieder lauffähig machen.
-- Der Dump hat pg_cron und die Auth-Queues nicht mitgenommen, die alten
-- Migrations sind nur als "applied" markiert und liefen hier nie.
-- Der Cron-Job selbst braucht den Service-Role-Key und bleibt deshalb in
-- supabase/manual/cron-email-queue.sql.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;

DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
