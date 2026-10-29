/**
 * Removes query strings from URLs in an error message. Deno's fetch errors quote the full request
 * URL, and a query string can carry credentials (the Twitch client_secret once ended up on the
 * public status page this way).
 */
export function redactUrls(message: string): string {
  return message.replace(/(https?:\/\/[^\s?#)"']+)[?#][^\s)"']*/g, "$1?…");
}

/** Short, safe error text for responses and stored status events. */
export function safeErrorMessage(e: unknown, max = 200): string {
  const raw = e instanceof Error ? e.message : String(e ?? "unknown error");
  const clean = redactUrls(raw);
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
