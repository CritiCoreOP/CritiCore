import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { notificationType, targetType, targetId } = body;
    // Never trust a client-supplied actorId — always use the verified user.
    const actorId = user.id;

    if (!notificationType || !targetType || !targetId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Determine who to notify based on notification type
    let followerUserIds: string[] = [];

    if (notificationType === "new_article") {
      // Verify the caller actually owns the referenced article before mass-notifying.
      const { data: article } = await admin
        .from("articles")
        .select("user_id")
        .eq("id", targetId)
        .maybeSingle();

      if (!article || article.user_id !== actorId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Notify ALL users who have followed anything (i.e. active users)
      // Or more precisely, get all unique user_ids from follows
      const { data: allFollowers } = await admin
        .from("follows")
        .select("user_id")
        .limit(1000);
      
      const uniqueIds = [...new Set((allFollowers || []).map(f => f.user_id))];
      followerUserIds = uniqueIds.filter(id => id !== actorId);
    } else if (
      notificationType === "new_episode" ||
      notificationType === "new_season" ||
      notificationType === "new_content"
    ) {
      // These broadcast notifications are not tied to caller-owned resources, so
      // restrict them to admins to prevent any authenticated user from mass-
      // notifying / impersonating official release notifications.
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: actorId,
        _role: "admin",
      });

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // new_episode/new_season notify followers of the series; new_content
      // notifies followers of the specified target type.
      const followTargetType = notificationType === "new_content" ? targetType : "series";
      const { data: followers } = await admin
        .from("follows")
        .select("user_id")
        .eq("target_id", targetId)
        .eq("target_type", followTargetType);

      followerUserIds = (followers || []).map(f => f.user_id).filter(id => id !== actorId);
    }

    if (followerUserIds.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch insert notifications
    const notifications = followerUserIds.map(userId => ({
      user_id: userId,
      actor_id: actorId || null,
      type: notificationType,
      target_type: targetType,
      target_id: targetId,
      read: false,
    }));

    // Insert in batches of 100
    let totalInserted = 0;
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      const { error } = await admin.from("notifications").insert(batch);
      if (!error) totalInserted += batch.length;
    }

    return new Response(JSON.stringify({ notified: totalInserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
