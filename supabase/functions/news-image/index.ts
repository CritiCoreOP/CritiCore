import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isBlockedHost, isPrivateIPv4, isPrivateIPv6 } from "./hosts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Raster only: SVG can carry script, and the graphics exports cannot use it anyway
const BASE_IMAGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/gif,image/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
};

const MAX_REDIRECTS = 3;

/** A public name that points at an internal address is just as internal */
async function resolvesToBlocked(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) return false;
  const resolve = (Deno as unknown as { resolveDns?: (h: string, t: "A" | "AAAA") => Promise<string[]> }).resolveDns;
  if (!resolve) return false;
  const records = (await Promise.all([resolve(host, "A").catch(() => []), resolve(host, "AAAA").catch(() => [])])).flat();
  return records.some((ip) => (ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip)));
}

function getSafeUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (isBlockedHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/** Follows redirects by hand, so every hop is checked like the first URL */
async function fetchChecked(start: URL, headers: Headers): Promise<Response | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (await resolvesToBlocked(url.hostname)) return null;
    const res = await fetch(url.toString(), { headers, redirect: "manual" });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    await res.body?.cancel();
    const next = location ? getSafeUrl(new URL(location, url).toString()) : null;
    if (!next) return null;
    url = next;
  }
  return null;
}

async function fetchUpstreamImage(imageUrl: URL) {
  const attempts = [`${imageUrl.origin}/`, "https://www.google.com/"];
  let lastStatus = 502;
  let lastContentType = "";

  for (const referer of attempts) {
    const headers = new Headers(BASE_IMAGE_HEADERS);
    headers.set("Referer", referer);
    headers.set("Origin", imageUrl.origin);

    const upstream = await fetchChecked(imageUrl, headers);
    if (!upstream) return { upstream: null, lastStatus: 400, lastContentType: "" };

    lastStatus = upstream.status;
    lastContentType = upstream.headers.get("content-type") || "";

    if (upstream.ok && lastContentType.startsWith("image/") && !lastContentType.includes("svg")) {
      return { upstream, lastStatus, lastContentType };
    }

    await upstream.arrayBuffer();
  }

  return { upstream: null, lastStatus, lastContentType };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const source = new URL(req.url).searchParams.get("src");
    const imageUrl = getSafeUrl(source);

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Invalid image URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { upstream, lastStatus, lastContentType } = await fetchUpstreamImage(imageUrl);

    if (!upstream) {
      return new Response(
        JSON.stringify({ error: `Upstream image failed: ${lastStatus}`, contentType: lastContentType || null }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
        }
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": lastContentType,
        "Cache-Control": "public, s-maxage=3600, max-age=3600",
      },
    });
  } catch (error) {
    console.error("news-image error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
