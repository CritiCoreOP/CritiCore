// Release-day mails for reminders set on game, film, series and anime pages (release_subscriptions).
// Runs once a day from pg_cron (supabase/manual/cron-release-reminders.sql) with the service role.
// Picks reminders for today (German time) and the two days before, in case a run was missed, puts
// one mail per reminder into the transactional queue and marks the reminder as sent.
import React from 'npm:react@18.3.1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ReleaseReminderEmail } from '../_shared/email-templates/release-reminder.tsx'
import { getLangFromCode, t, type EmailLang } from '../_shared/email-templates/email-i18n.ts'
import { renderEmail } from '../_shared/email-templates/render.ts'
import { SITE_URL } from '../_shared/email-templates/email-assets.ts'
import { getOrCreateUnsubscribeToken } from '../_shared/unsubscribe-token.ts'

const SENDER_DOMAIN = 'notify.criticore.cc'
const FROM = 'CritiCore <noreply@criticore.cc>'
const LOCALES: Record<EmailLang, string> = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', th: 'th-TH' }
// First path segment per language, as in src/lib/routeTranslations.ts
const SEGMENTS: Record<string, Partial<Record<EmailLang, string>>> = {
  games: { fr: 'jeux', es: 'juegos' },
  filme: { en: 'movies', fr: 'films', es: 'peliculas' },
  serien: { en: 'series', fr: 'series', es: 'series' },
  anime: {},
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function jwtRole(token: string): unknown {
  try {
    const part = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))).role
  } catch {
    return null
  }
}

const berlinDay = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })

function pageUrl(path: string, lang: EmailLang): string {
  const [, section, id] = path.split('/')
  return `${SITE_URL}/${LOCALES[lang]}/${SEGMENTS[section]?.[lang] ?? section}/${id}`
}

Deno.serve(async (req) => {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (jwtRole(token) !== 'service_role') return json({ error: 'Forbidden' }, 403)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const now = new Date()
  const today = berlinDay(now)
  const from = berlinDay(new Date(now.getTime() - 2 * 86_400_000))

  const { data: due, error } = await supabase
    .from('release_subscriptions')
    .select('id, user_id, title, image_url, path, release_date, lang')
    .is('notified_at', null)
    .gte('release_date', from)
    .lte('release_date', today)
    .not('path', 'is', null)
    .limit(500)
  if (error) {
    console.error('release-reminders: loading failed', error.message)
    return json({ error: 'load_failed' }, 500)
  }

  const emails = new Map<string, string | null>()
  let queued = 0
  let skipped = 0
  for (const row of due ?? []) {
    if (!emails.has(row.user_id)) {
      const { data } = await supabase.auth.admin.getUserById(row.user_id)
      emails.set(row.user_id, data?.user?.email ?? null)
    }
    const to = emails.get(row.user_id)
    const title = (row.title ?? '').trim()
    if (!to || !title) {
      skipped++
      await supabase.from('release_subscriptions').update({ notified_at: now.toISOString() }).eq('id', row.id)
      continue
    }

    const lang = getLangFromCode(row.lang)
    const date = new Date(`${row.release_date}T12:00:00Z`).toLocaleDateString(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    const { html, text } = renderEmail(
      React.createElement(ReleaseReminderEmail, { lang, title, date, url: pageUrl(row.path!, lang), image: row.image_url?.startsWith('https://') ? row.image_url : null }),
    )
    const messageId = crypto.randomUUID()
    const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, to)
    await supabase.from('email_send_log').insert({ message_id: messageId, template_name: 'release_reminder', recipient_email: to, status: 'pending' })
    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        // One mail per reminder and release day, even if two runs overlap
        idempotency_key: `release-${row.id}-${row.release_date}`,
        to,
        from: FROM,
        sender_domain: SENDER_DOMAIN,
        subject: t('release.subject', lang).replace('{title}', title),
        html,
        text,
        purpose: 'transactional',
        label: 'release_reminder',
        unsubscribe_token: unsubscribeToken,
        queued_at: now.toISOString(),
      },
    })
    if (enqueueError) {
      console.error('release-reminders: enqueue failed', row.id, enqueueError.message)
      await supabase.from('email_send_log').insert({ message_id: messageId, template_name: 'release_reminder', recipient_email: to, status: 'failed', error_message: 'Failed to enqueue email' })
      continue
    }
    await supabase.from('release_subscriptions').update({ notified_at: now.toISOString() }).eq('id', row.id)
    queued++
  }

  return json({ due: due?.length ?? 0, queued, skipped })
})
