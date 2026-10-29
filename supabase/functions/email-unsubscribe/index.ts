// Abmeldung von E-Mails (Newsletter und Benachrichtigungen; Login-Mails kommen weiter).
// Supabase liefert HTML aus Edge Functions als text/plain aus, deshalb gibt es hier keine Seite:
//   GET  ?token=…                  → Weiterleitung auf criticore.cc/newsletter/abmelden
//   POST ?token=… (Formular)       → One-Click-Abmeldung aus dem Mail-Programm (RFC 8058)
//   POST { token, action }         → JSON für die Seite: action "status" oder "unsubscribe"
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SITE_URL } from '../_shared/email-templates/email-assets.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/** s***@example.com: enough to recognise the address, not enough to harvest it */
const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 1)}***@${domain ?? ''}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  let token = url.searchParams.get('token') ?? ''
  let action = 'unsubscribe'

  if (req.method === 'GET') {
    return new Response(null, {
      status: 302,
      headers: { Location: `${SITE_URL}/newsletter/abmelden?token=${encodeURIComponent(token)}` },
    })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // JSON from our page; anything else is the mail client's one-click form post
  if ((req.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      const body = await req.json()
      token = typeof body.token === 'string' ? body.token : token
      action = body.action === 'status' ? 'status' : 'unsubscribe'
    } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }
  }
  if (!token) return json({ error: 'invalid_token' }, 400)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: row } = await supabase
    .from('email_unsubscribe_tokens')
    .select('email, used_at')
    .eq('token', token)
    .maybeSingle()
  if (!row) return json({ error: 'invalid_token' }, 404)

  if (action === 'status') {
    return json({ email: maskEmail(row.email), unsubscribed: !!row.used_at })
  }

  const now = new Date().toISOString()
  await supabase
    .from('suppressed_emails')
    .upsert({ email: row.email, reason: 'unsubscribe' }, { onConflict: 'email', ignoreDuplicates: true })
  await supabase.from('email_unsubscribe_tokens').update({ used_at: now }).eq('token', token)
  // Otherwise the admin still counts the address as an active subscriber
  await supabase
    .from('newsletter_subscribers')
    .update({ subscribed: false, unsubscribed_at: now })
    .eq('email', row.email)

  return json({ success: true, email: maskEmail(row.email) })
})
