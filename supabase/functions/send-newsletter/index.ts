// Newsletter-Versand aus dem Admin-Bereich.
// POST { mode: 'preview' | 'test' | 'send', subject, preheader?, intro?, blocks[], lang? }
//   blocks: { type: 'text', heading, body, linkLabel?, linkUrl? }
//         | { type: 'articles', heading, layout: 'card' | 'list', articleIds[] }
//   Artikel lädt die Function selbst (nur veröffentlichte), Titel und Teaser in der
//   Sprache des Newsletters, wenn es dafür eine Übersetzung gibt.
//   preview → { html }                       (nichts wird verschickt)
//   test    → Mail nur an den eingeloggten Admin
//   send    → je eine Mail an alle bestätigten Abonnenten, außer abgemeldeten Adressen
// Nur für Admins. Die Mails laufen über die eigene Queue `newsletter_emails`, die
// process-email-queue nach Auth- und Transaktions-Mails abarbeitet.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { getLangFromCode, type EmailLang } from '../_shared/email-templates/email-i18n.ts'
import { renderEmail } from '../_shared/email-templates/render.ts'
import { SITE_URL } from '../_shared/email-templates/email-assets.ts'
import { NewsletterIssueEmail, type NewsletterArticle, type NewsletterBlock } from '../_shared/email-templates/newsletter-issue.tsx'
import { t } from '../_shared/email-templates/email-i18n.ts'
import { getOrCreateUnsubscribeToken } from '../_shared/unsubscribe-token.ts'
import { kickEmailQueue } from '../_shared/kick-email-queue.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const QUEUE = 'newsletter_emails'
const FROM = 'CritiCore <newsletter@criticore.cc>'
const SENDER_DOMAIN = 'notify.criticore.cc'
// Platzhalter im gerenderten HTML, pro Empfänger durch den eigenen Abmeldelink ersetzt
const UNSUB_PLACEHOLDER = 'https://criticore.cc/__UNSUBSCRIBE__'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const safeUrl = (v: unknown) => {
  if (typeof v !== 'string') return ''
  try {
    const url = new URL(v.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

const LOCALES: Record<EmailLang, string> = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', th: 'th-TH' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const plainText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
const shorten = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()} …` : s)

type ArticleRow = { id: string; title: string; excerpt: string | null; content: string; slug: string; cover_image_url: string | null; category: string | null }

/** Published articles by id, in the order asked for, with title and teaser in the newsletter language if translated */
async function loadArticles(supabase: SupabaseClient, ids: string[], lang: EmailLang): Promise<Map<string, NewsletterArticle>> {
  const out = new Map<string, NewsletterArticle>()
  if (!ids.length) return out
  const { data } = await supabase
    .from('articles')
    .select('id, title, excerpt, content, slug, cover_image_url, category, language')
    .in('id', ids)
    .eq('published', true)
  const { data: translations } = await supabase
    .from('article_translations')
    .select('article_id, title, excerpt')
    .in('article_id', ids)
    .eq('target_lang', lang)
  const translated = new Map((translations ?? []).map((tr) => [tr.article_id as string, tr as { title: string; excerpt: string | null }]))
  for (const row of (data ?? []) as (ArticleRow & { language: string })[]) {
    const tr = row.language === lang ? null : translated.get(row.id)
    const excerpt = (tr?.excerpt || row.excerpt || '').trim() || shorten(plainText(row.content), 180)
    out.set(row.id, {
      title: (tr?.title || row.title).trim(),
      excerpt,
      url: `${SITE_URL}/${LOCALES[lang]}/news/${encodeURIComponent(row.slug)}`,
      image: safeUrl(row.cover_image_url) || null,
      category: t(`newsletterIssue.category.${row.category ?? 'general'}`, lang),
    })
  }
  return out
}

async function parseContent(supabase: SupabaseClient, body: Record<string, unknown>) {
  const lang = getLangFromCode(typeof body.lang === 'string' ? body.lang : 'de') as EmailLang
  const raw = (Array.isArray(body.blocks) ? body.blocks : []).slice(0, 12) as Record<string, unknown>[]
  const ids = raw.flatMap((b) => (b?.type === 'articles' && Array.isArray(b.articleIds) ? (b.articleIds as unknown[]) : []))
    .filter((id): id is string => typeof id === 'string' && UUID.test(id))
    .slice(0, 40)
  const articles = await loadArticles(supabase, [...new Set(ids)], lang)

  const blocks: NewsletterBlock[] = raw
    .map((b): NewsletterBlock => {
      const heading = clip(b?.heading, 120)
      if (b?.type === 'articles') {
        const list = (Array.isArray(b.articleIds) ? b.articleIds : []).flatMap((id) => (typeof id === 'string' && articles.has(id) ? [articles.get(id)!] : []))
        return { type: 'articles', heading, layout: b.layout === 'list' ? 'list' : 'card', articles: list.slice(0, 10) }
      }
      // Ohne type: Abschnitt aus einem Editor vor dem 2026-10-07
      return { type: 'text', heading, body: clip(b?.body, 4000), linkLabel: clip(b?.linkLabel, 60), linkUrl: safeUrl(b?.linkUrl) }
    })
    .filter((b) => (b.type === 'articles' ? b.articles.length > 0 : b.heading.trim() || b.body.trim()))
  return {
    subject: clip(body.subject, 120).trim(),
    preheader: clip(body.preheader, 160),
    intro: clip(body.intro, 3000),
    blocks,
    lang,
  }
}

const unsubscribeUrl = (token: string) => `${SITE_URL}/newsletter/abmelden?token=${encodeURIComponent(token)}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)
  const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (!isAdmin) return json({ error: 'Forbidden' }, 403)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const mode = body.mode
  const content = await parseContent(supabase, body)
  if (!content.subject) return json({ error: 'Betreff fehlt' }, 400)
  if (!content.intro.trim() && content.blocks.length === 0) return json({ error: 'Inhalt fehlt' }, 400)

  const { html, text } = renderEmail(
    React.createElement(NewsletterIssueEmail, { ...content, unsubscribeUrl: UNSUB_PLACEHOLDER }),
  )

  if (mode === 'preview') {
    return json({ html: html.replaceAll(UNSUB_PLACEHOLDER, '#') })
  }
  if (mode !== 'test' && mode !== 'send') return json({ error: 'Unknown mode' }, 400)

  // Empfänger: beim Test nur der Admin selbst, sonst alle bestätigten, nicht abgemeldeten Abonnenten
  let recipients: string[]
  if (mode === 'test') {
    if (!user.email) return json({ error: 'Dein Konto hat keine E-Mail-Adresse' }, 400)
    recipients = [user.email.trim().toLowerCase()]
  } else {
    const { data: subs, error: subsError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('confirmed', true)
      .eq('subscribed', true)
    if (subsError) return json({ error: subsError.message }, 500)
    const { data: suppressed } = await supabase.from('suppressed_emails').select('email')
    const blocked = new Set((suppressed ?? []).map((s) => String(s.email).trim().toLowerCase()))
    recipients = [...new Set((subs ?? []).map((s) => String(s.email).trim().toLowerCase()))].filter((e) => e && !blocked.has(e))
  }
  if (recipients.length === 0) return json({ queued: 0 })

  const campaignId = crypto.randomUUID()
  const subject = mode === 'test' ? `[Test] ${content.subject}` : content.subject
  const label = mode === 'test' ? 'newsletter_test' : 'newsletter'
  let queued = 0
  const failed: string[] = []

  for (const to of recipients) {
    try {
      const unsubToken = await getOrCreateUnsubscribeToken(supabase, to)
      const link = unsubscribeUrl(unsubToken)
      const messageId = crypto.randomUUID()
      await supabase.from('email_send_log').insert({ message_id: messageId, template_name: label, recipient_email: to, status: 'pending' })
      const { error } = await supabase.rpc('enqueue_email', {
        queue_name: QUEUE,
        payload: {
          message_id: messageId,
          idempotency_key: `${label}-${campaignId}-${to}`,
          to,
          from: FROM,
          sender_domain: SENDER_DOMAIN,
          subject,
          html: html.replaceAll(UNSUB_PLACEHOLDER, link),
          text: text.replaceAll(UNSUB_PLACEHOLDER, link),
          purpose: 'marketing',
          label,
          campaign_id: campaignId,
          unsubscribe_token: unsubToken,
          queued_at: new Date().toISOString(),
        },
      })
      if (error) throw error
      queued++
    } catch (err) {
      console.error('Newsletter enqueue failed', { to, err: String(err) })
      failed.push(to)
    }
  }

  // Start the worker now instead of waiting for the next cron minute; the test mail arrives in seconds
  if (queued) await kickEmailQueue(supabase)

  console.log('Newsletter queued', { mode, campaignId, queued, failed: failed.length })
  return json({ queued, failed: failed.length, campaignId })
})
