/**
 * Search engines render pages with JavaScript and would otherwise fire every background request
 * a visitor fires (ban check, status banner, tag sync, enrichment). Content requests stay, so the
 * crawled page is complete; housekeeping is skipped.
 */
const BOT = /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|headlesschrome|lighthouse|pagespeed/i;

export function isBot(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  return BOT.test(userAgent);
}
