// Self-service account deletion. The signed-in person deletes their own account, no reason asked:
// their files, everything they wrote or saved (purge_user_data) and finally the login itself.
// Admins cannot delete themselves here, so the site never loses its last admin by accident.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Personal files under the owner's user id ("<uid>/…"). Article, media and workspace pictures stay
// with the content that shows them, like the content itself.
const USER_BUCKETS = ["avatars", "social-assets", "forum-images"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: roles, error: rolesError } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  if (rolesError) return json({ error: "failed" }, 500);
  if ((roles ?? []).some((r) => r.role === "admin")) return json({ error: "admin" }, 403);

  // Files first: once the login is gone nobody can find them by owner any more
  for (const bucket of USER_BUCKETS) {
    const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
    const paths = (files ?? []).filter((f) => f.name).map((f) => `${user.id}/${f.name}`);
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }

  const { error: purgeError } = await admin.rpc("purge_user_data", { _uid: user.id });
  if (purgeError) {
    console.error("purge_user_data failed", purgeError.message);
    return json({ error: "failed" }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("deleteUser failed", deleteError.message);
    return json({ error: "failed" }, 500);
  }

  return json({ ok: true });
});
