import * as React from 'npm:react@18.3.1'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { EMAIL_SUBJECTS_I18N, getLangFromCode, type EmailLang } from '../_shared/email-templates/email-i18n.ts'
import { renderEmail } from '../_shared/email-templates/render.ts'
import { kickEmailQueue } from '../_shared/kick-email-queue.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function getEmailSubject(emailType: string, lang: EmailLang): string {
  return EMAIL_SUBJECTS_I18N[emailType]?.[lang] ?? EMAIL_SUBJECTS_I18N[emailType]?.['de'] ?? 'Notification'
}

// Template mapping
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration
const SITE_NAME = "criti"
const SENDER_DOMAIN = "notify.criticore.cc"
const ROOT_DOMAIN = "criticore.cc"
const FROM_DOMAIN = "criticore.cc" // Domain shown in From address (may be root or sender subdomain)

// Supabase "Send Email Hook" (Authentication → Hooks).
// Secret: SEND_EMAIL_HOOK_SECRET (Format "v1,whsec_…", wird beim Anlegen des Hooks angezeigt)
interface HookPayload {
  user: { email: string; new_email?: string; user_metadata?: Record<string, any> }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

function verifyUrl(tokenHash: string, type: string, redirectTo: string): string {
  const base = Deno.env.get('SUPABASE_URL')!
  const params = new URLSearchParams({ token: tokenHash, type, redirect_to: redirectTo || `https://${ROOT_DOMAIN}` })
  return `${base}/auth/v1/verify?${params}`
}

async function handleWebhook(req: Request): Promise<Response> {
  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  if (!hookSecret) {
    console.error('SEND_EMAIL_HOOK_SECRET not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let payload: HookPayload
  const rawBody = await req.text()
  try {
    const wh = new Webhook(hookSecret.replace('v1,whsec_', ''))
    payload = wh.verify(rawBody, Object.fromEntries(req.headers)) as HookPayload
  } catch (error) {
    console.error('Invalid webhook signature', { error: String(error) })
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { user, email_data } = payload
  const actionType = email_data.email_action_type
  // "email" = OTP-Login per Mail → Magic-Link-Template
  const emailType = actionType === 'email' ? 'magiclink' : actionType

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType })
    return new Response(
      JSON.stringify({ error: `Unknown email type: ${emailType}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const userLang: EmailLang = getLangFromCode(user.user_metadata?.locale || user.user_metadata?.language)

  // Bei E-Mail-Änderung mit "Secure email change" gehen zwei Mails raus:
  // token_hash_new → aktuelle Adresse, token_hash → neue Adresse (Supabase-Konvention).
  const jobs: { to: string; tokenHash: string; token: string }[] = []
  if (actionType === 'email_change' && user.new_email) {
    if (email_data.token_hash_new) {
      jobs.push({ to: user.email, tokenHash: email_data.token_hash_new, token: email_data.token_new ?? '' })
    }
    jobs.push({ to: user.new_email, tokenHash: email_data.token_hash, token: email_data.token })
  } else {
    jobs.push({ to: user.email, tokenHash: email_data.token_hash, token: email_data.token })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  for (const job of jobs) {
    const templateProps = {
      siteName: SITE_NAME,
      siteUrl: `https://${ROOT_DOMAIN}`,
      recipient: job.to,
      confirmationUrl: verifyUrl(job.tokenHash, actionType, email_data.redirect_to),
      token: job.token,
      email: user.email,
      newEmail: user.new_email,
      lang: userLang,
    }
    const { html, text } = renderEmail(React.createElement(EmailTemplate, templateProps))
    const ok = await enqueue(supabase, emailType, job.to, userLang, html, text)
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// deno-lint-ignore no-explicit-any
async function enqueue(
  supabase: any,
  emailType: string,
  to: string,
  userLang: EmailLang,
  html: string,
  text: string,
): Promise<boolean> {
  // Enqueue email for async processing by the dispatcher (process-email-queue).
  const messageId = crypto.randomUUID()

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: to,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      message_id: messageId,
      to: to,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: getEmailSubject(emailType, userLang),
      html,
      text,
      purpose: 'transactional',
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue auth email', { error: enqueueError, emailType })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: to,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return false
  }

  // Der Versand steht in email_send_log, ein Log mit der Adresse braucht es nicht
  await kickEmailQueue(supabase)
  return true
}

Deno.serve(async (req) => {
  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
