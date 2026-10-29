// Versand über Resend (https://resend.com). Ersetzt @lovable.dev/email-js.
// Secrets: RESEND_API_KEY (Pflicht), EMAIL_FROM (optional, überschreibt den Absender)

export class EmailSendError extends Error {
  status: number
  retryAfterSeconds: number | null
  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message)
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export interface OutgoingEmail {
  to: string
  from: string
  subject: string
  html: string
  text?: string
  idempotency_key?: string
  message_id?: string
  unsubscribe_token?: string
}

export async function sendEmail(email: OutgoingEmail): Promise<{ id: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new EmailSendError('RESEND_API_KEY not configured', 500)

  const headers: Record<string, string> = {}
  if (email.unsubscribe_token) {
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-unsubscribe?token=${encodeURIComponent(email.unsubscribe_token)}`
    headers['List-Unsubscribe'] = `<${url}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }

  const reqHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  const idem = email.idempotency_key ?? email.message_id
  if (idem) reqHeaders['Idempotency-Key'] = String(idem).slice(0, 256)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') ?? email.from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    const retryAfter = res.headers.get('retry-after')
    throw new EmailSendError(
      `Resend ${res.status}: ${body}`,
      res.status,
      retryAfter ? Number(retryAfter) || 60 : null,
    )
  }
  return await res.json()
}
