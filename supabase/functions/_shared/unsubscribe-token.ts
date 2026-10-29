// Shared helper: get or create an unsubscribe token for a recipient email.
// Wird für den List-Unsubscribe-Header und die email-unsubscribe-Function genutzt.
// Callers use both the npm: and the esm.sh build of supabase-js; their client classes are not
// assignable to each other, so the helper only asks for the one method it uses.
// deno-lint-ignore no-explicit-any
type DbClient = { from: (table: string) => any }

export async function getOrCreateUnsubscribeToken(
  supabase: DbClient,
  email: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase()

  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalized)
    .maybeSingle()

  if (existing?.token) return existing.token as string

  const token = crypto.randomUUID()
  const { error } = await supabase
    .from('email_unsubscribe_tokens')
    .insert({ email: normalized, token })

  if (error) {
    // Race: another concurrent insert won. Re-read.
    const { data: retry } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalized)
      .maybeSingle()
    if (retry?.token) return retry.token as string
    throw error
  }
  return token
}
