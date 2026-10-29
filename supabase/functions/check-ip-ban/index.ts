import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Trust ONLY the Cloudflare-injected client IP. The app is served through
    // Cloudflare, which sets `cf-connecting-ip` on every request and strips any
    // client-supplied value. `x-forwarded-for` is freely spoofable by direct
    // callers, so it must never be used for ban enforcement.
    const clientIp = req.headers.get("cf-connecting-ip")?.trim() || "unknown";


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: ban } = await supabase
      .from("banned_ips")
      .select("id, reason, created_at")
      .eq("ip_address", clientIp)
      .eq("active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        banned: !!ban,
        reason: ban?.reason || null,
        ip: clientIp,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("check-ip-ban error:", err);
    return new Response(
      JSON.stringify({ banned: false, error: err.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
