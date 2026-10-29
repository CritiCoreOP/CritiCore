import { createClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { t, getLangFromCode } from '../_shared/email-templates/email-i18n.ts'
import { renderEmail } from '../_shared/email-templates/render.ts'
import { getOrCreateUnsubscribeToken } from '../_shared/unsubscribe-token.ts'
import { kickEmailQueue } from '../_shared/kick-email-queue.ts'
import { NewsletterConfirmEmail } from './_templates/newsletter-email.tsx'

const h = React.createElement

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'criti'
const SENDER_DOMAIN = 'notify.criticore.cc'
const FROM_DOMAIN = 'criticore.cc'
const ROOT_DOMAIN = 'criticore.cc'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email: rawEmail, lang: rawLang } = await req.json()
    // One spelling per address: "Max@Example.de" and "max@example.de" are the same inbox
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const lang = getLangFromCode(rawLang)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // At most one confirmation mail per address and 10 minutes; otherwise the form could be
    // used to flood someone else's inbox. Answer "success" either way.
    const { data: recent } = await supabase
      .from('email_send_log')
      .select('id')
      .eq('template_name', 'newsletter_confirm')
      .eq('recipient_email', email)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(1)
    if (recent?.length) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Don't reset or re-spam already-confirmed subscribers. Return success so the
    // endpoint can't be used to probe which addresses are subscribed.
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('confirmed, subscribed')
      .eq('email', email)
      .maybeSingle()
    // Unsubscribed people start over with a fresh confirmation
    if (existing?.confirmed && existing.subscribed) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = crypto.randomUUID()

    const { error: dbErr } = await supabase.from('newsletter_subscribers').upsert(
      { email, confirm_token: token, confirmed: false, subscribed: true, unsubscribed_at: null },
      { onConflict: 'email' }
    )
    if (dbErr) {
      console.error('DB error', dbErr)
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const confirmUrl = `https://${ROOT_DOMAIN}/newsletter/confirm?token=${token}`

    const { html, text } = renderEmail(h(NewsletterConfirmEmail, { confirmUrl, lang }))

    const messageId = crypto.randomUUID()

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'newsletter_confirm',
      recipient_email: email,
      status: 'pending',
    })

    const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, email)

    const { error: enqErr } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        idempotency_key: messageId,
        to: email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: t('newsletter.subject', lang),
        html,
        text,
        purpose: 'transactional',
        label: 'newsletter_confirm',
        unsubscribe_token: unsubscribeToken,
        // Requested just now by the recipient; must arrive even after an earlier unsubscribe
        bypass_suppression: true,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqErr) {
      console.error('Enqueue error', enqErr)
      return new Response(JSON.stringify({ error: 'Failed to send confirmation' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    await kickEmailQueue(supabase)

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Error', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
