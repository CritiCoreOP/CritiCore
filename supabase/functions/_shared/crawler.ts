/**
 * Requests that the Cloudflare cache in front of the functions (functions/api/fn) forwards for a
 * crawler carry this header. Their answers still land in Cloudflare's cache, but not in api_cache:
 * crawlers walk once through thousands of titles nobody else opens, and every write is a request
 * through the API gateway, which Supabase logs and bills.
 */
export const CRAWLER_HEADER = "x-cc-crawler";

export const fromCrawler = (req: Request) => req.headers.get(CRAWLER_HEADER) === "1";
