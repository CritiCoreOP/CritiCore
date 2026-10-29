import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getCacheTTL(endpoint: string): number {
  if (endpoint.includes('/games') && !endpoint.match(/\/games\/\d+/)) return 30;
  if (/\/games\/\d+/.test(endpoint)) return 120;
  return 30;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RAWG_API_KEY = Deno.env.get('RAWG_API_KEY');
  if (!RAWG_API_KEY) {
    return new Response(JSON.stringify({ error: 'RAWG_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { endpoint, params } = await req.json();

    // Restrict the proxy to known RAWG read endpoints.
    const ALLOWED_PREFIXES = ['/games', '/genres', '/platforms', '/developers', '/publishers', '/tags', '/stores', '/creators'];
    if (typeof endpoint !== 'string' || !ALLOWED_PREFIXES.some((p) => endpoint.startsWith(p))) {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build cache key
    const paramStr = params ? Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&') : '';
    const cacheKey = `rawg:${endpoint}:${paramStr}`;

    // Check cache
    const { data: cached } = await sb
      .from('api_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.response_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    // Fetch from RAWG
    const url = new URL(`https://api.rawg.io/api${endpoint}`);
    url.searchParams.set('key', RAWG_API_KEY);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    const raw = await response.text();

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      // RAWG occasionally answers with an HTML error/rate-limit page.
      return new Response(
        JSON.stringify({
          error: `RAWG returned a non-JSON response [${response.status}]`,
          detail: raw.slice(0, 200),
        }),
        {
          status: response.status >= 400 ? response.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `RAWG API error [${response.status}]`, detail: data }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }


    // Store in cache (fire-and-forget)
    const ttlMinutes = getCacheTTL(endpoint);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    sb.from('api_cache')
      .upsert(
        { cache_key: cacheKey, response_data: data, created_at: new Date().toISOString(), expires_at: expiresAt },
        { onConflict: 'cache_key' }
      )
      .then(() => {});

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
