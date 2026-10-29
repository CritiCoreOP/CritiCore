-- The email worker only ran when the auth or transactional queue had mail. The newsletter queue was
-- missing from that condition, so newsletters (test mails included) stayed queued until some other
-- mail happened to start the worker. First noticed on 2026-10-07 with the first newsletter issue.
--
-- The job's command holds the project URL and reads the key from the vault; it is changed in place
-- instead of being written out here, so no project ref ends up in the migrations.
-- kick_email_queue() runs the same command, so instant kicks now include newsletters as well.

select cron.alter_job(
  job_id := jobid,
  command := replace(
    command,
    'OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails)',
    'OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails)
      OR EXISTS (SELECT 1 FROM pgmq.q_newsletter_emails)'
  )
)
from cron.job
where jobname = 'process-email-queue'
  and command not like '%q_newsletter_emails%';

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'process-email-queue' and command like '%q_newsletter_emails%') then
    raise warning 'process-email-queue does not check the newsletter queue; see supabase/manual/cron-email-queue.sql';
  end if;
end $$;
