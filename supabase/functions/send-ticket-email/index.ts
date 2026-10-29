import React from 'npm:react@18.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { TicketEmail } from './_templates/ticket-email.tsx'
import { t, getLangFromCode } from '../_shared/email-templates/email-i18n.ts'
import { renderEmail } from '../_shared/email-templates/render.ts'
import { getOrCreateUnsubscribeToken } from '../_shared/unsubscribe-token.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'CritiCore'
const SENDER_DOMAIN = 'notify.criticore.cc'
const FROM_DOMAIN = 'criticore.cc'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { email, ticketId, ticketType, subject, lang: requestLang } = await req.json()

    if (!email || !ticketId || !ticketType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, ticketId, ticketType' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Validate ticketId as UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ticketId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ticket ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    if (!['support', 'dmca'].includes(ticketType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ticketType. Must be "support" or "dmca"' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Verify the ticket exists and the supplied email matches the submitter.
    // This prevents the endpoint from being abused to send branded emails to
    // arbitrary addresses.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const ticketTable = ticketType === 'dmca' ? 'dmca_requests' : 'support_tickets'
    const { data: ticketRow } = await supabaseAdmin
      .from(ticketTable)
      .select('email')
      .eq('id', ticketId)
      .maybeSingle()

    if (!ticketRow || ticketRow.email?.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Determine language
    const lang = getLangFromCode(requestLang)

    // Sanitize subject
    const sanitizedSubject = typeof subject === 'string'
      ? subject.substring(0, 200).replace(/[<>]/g, '')
      : ''

    const shortId = ticketId.slice(0, 8).toUpperCase()

    const { html, text } = renderEmail(
      React.createElement(TicketEmail, {
        ticketId: shortId,
        fullTicketId: ticketId,
        ticketType,
        subject: sanitizedSubject,
        lang,
      })
    )

    const isDmca = ticketType === 'dmca'
    const emailSubject = isDmca
      ? t('ticket.subjectDmca', lang).replace('{id}', shortId)
      : t('ticket.subjectSupport', lang).replace('{id}', shortId)

    // Enqueue via Lovable Email queue (reuses supabaseAdmin from above)

    const messageId = crypto.randomUUID()

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: `ticket_${ticketType}`,
      recipient_email: email,
      status: 'pending',
    })

    const unsubscribeToken = await getOrCreateUnsubscribeToken(supabaseAdmin, email)

    const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        idempotency_key: messageId,
        to: email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: emailSubject,
        html,
        text,
        purpose: 'transactional',
        label: `ticket_${ticketType}`,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue ticket email:', enqueueError)
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: `ticket_${ticketType}`,
        recipient_email: email,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      throw new Error('Failed to enqueue email')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: unknown) {
    console.error('Error sending ticket email:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})