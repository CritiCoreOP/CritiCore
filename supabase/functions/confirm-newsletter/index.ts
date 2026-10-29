import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({ confirmed: true, confirm_token: null, subscribed: true, unsubscribed_at: null })
      .eq('confirm_token', token)
      .select('email')
      .single()

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Confirmed from the inbox itself: an earlier unsubscribe no longer applies, and the old
    // unsubscribe link has to work again for the next time
    const email = String(data.email).trim().toLowerCase()
    await supabase.from('suppressed_emails').delete().eq('email', email)
    await supabase.from('email_unsubscribe_tokens').update({ used_at: null }).eq('email', email)

    return new Response(JSON.stringify({ success: true, email: data.email }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Error', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
