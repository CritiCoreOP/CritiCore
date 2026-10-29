// Startet process-email-queue direkt nach dem Einreihen einer Mail, auf die jemand wartet
// (Login-Code, Passwort-Reset, Newsletter-Bestätigung). Der Cron-Job läuft nur noch jede Minute
// und fängt Wiederholungen und alles auf, was hier nicht durchkam.
// Der Aufruf geht über die Datenbank (public.kick_email_queue, Migration 20261003120000), die den
// Befehl des Cron-Jobs ausführt. Ein direkter HTTP-Aufruf der Function kam nicht an.
// Doppelte Läufe sind harmlos: pgmq blendet gelesene Mails 30 s aus, und der Worker überspringt
// bereits gesendete message_ids.

// The functions import supabase-js from different URLs, so only the shape is required here
interface RpcClient {
  rpc(fn: string): PromiseLike<{ error: unknown }>
}

export async function kickEmailQueue(supabase: RpcClient): Promise<void> {
  const { error } = await supabase.rpc('kick_email_queue')
  if (error) console.error('kick_email_queue failed, the cron job sends within a minute', error)
}
