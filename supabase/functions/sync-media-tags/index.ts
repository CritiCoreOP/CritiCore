import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Maps TMDB/RAWG genre names to our category slugs (including sub-categories)
const GENRE_TO_CATEGORY: Record<string, string[]> = {
  // Action & sub-categories
  "action": ["action"],
  "action & adventure": ["action", "abenteuer"],
  "martial arts": ["action", "martial-arts"],
  "military": ["action", "military"],
  "superhero": ["action", "superhero"],
  // Romantik
  "romance": ["romantik"],
  "boys love": ["romantik", "yaoi"],
  "girls love": ["romantik", "yuri"],
  // Sci-Fi & sub-categories
  "science fiction": ["sci-fi"],
  "sci-fi": ["sci-fi"],
  "cyberpunk": ["sci-fi", "cyberpunk"],
  // Horror & sub-categories
  "horror": ["horror"],
  // Slice of Life
  "slice of life": ["slice-of-life"],
  // Comedy
  "comedy": ["comedy"],
  "komödie": ["comedy"],
  // Drama
  "drama": ["drama"],
  // Fantasy
  "fantasy": ["fantasy"],
  // Thriller
  "thriller": ["thriller"],
  // Animation
  "animation": ["animation"],
  "animated": ["animation"],
  // Dokumentation
  "documentary": ["dokumentation"],
  "dokumentation": ["dokumentation"],
  // Krimi
  "crime": ["krimi"],
  "krimi": ["krimi"],
  // Abenteuer
  "adventure": ["abenteuer"],
  "abenteuer": ["abenteuer"],
  // Musik
  "music": ["musik"],
  "musik": ["musik"],
  // Mystery
  "mystery": ["mystery"],
  // Krieg
  "war": ["krieg"],
  "war & politics": ["krieg"],
  // Familie
  "family": ["familie"],
  "familie": ["familie"],
  // Historie
  "history": ["historie"],
  "historie": ["historie"],
  // Western
  "western": ["western"],
  // Additional TMDB genres → best fit
  "tv movie": [],
  "talk": [],
  "news": [],
  "reality": [],
  "soap": ["drama"],
  "kids": ["familie", "animation"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated user — this function writes approved tags and
    // category assignments via the service role, bypassing RLS.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { media_id, media_type } = await req.json();

    if (!media_id || !media_type) {
      return new Response(JSON.stringify({ error: "Missing media_id or media_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["movie", "series", "game"].includes(media_type)) {
      return new Response(JSON.stringify({ error: "Invalid media_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const mediaIdStr = String(media_id);

    // ─── Fetch genres from the trusted upstream API (never trust the client) ───
    // This prevents authenticated users from injecting arbitrary "approved" tags.
    let genres: { name: string }[] = [];
    try {
      if (media_type === "movie" || media_type === "series") {
        const tmdbKey = Deno.env.get("TMDB_API_KEY");
        if (tmdbKey) {
          const path = media_type === "movie" ? "movie" : "tv";
          const res = await fetch(
            `https://api.themoviedb.org/3/${path}/${encodeURIComponent(mediaIdStr)}?api_key=${tmdbKey}&language=en-US`,
          );
          if (res.ok) {
            const data = await res.json();
            genres = Array.isArray(data?.genres)
              ? data.genres.filter((g: { name?: string }) => g?.name).map((g: { name: string }) => ({ name: g.name }))
              : [];
          }
        }
      } else if (media_type === "game") {
        const rawgKey = Deno.env.get("RAWG_API_KEY");
        if (rawgKey) {
          const res = await fetch(
            `https://api.rawg.io/api/games/${encodeURIComponent(mediaIdStr)}?key=${rawgKey}`,
          );
          if (res.ok) {
            const data = await res.json();
            genres = Array.isArray(data?.genres)
              ? data.genres.filter((g: { name?: string }) => g?.name).map((g: { name: string }) => ({ name: g.name }))
              : [];
          }
        }
      }
    } catch (fetchErr) {
      console.error("Genre fetch failed:", fetchErr);
    }

    if (genres.length === 0) {
      return new Response(
        JSON.stringify({ synced_tags: 0, synced_categories: 0, matched_slugs: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── 1. Sync Tags (flat genre → tags table) ───
    const tagRows = genres.map((g: { name: string }) => ({
      name: g.name,
      slug: g.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      status: "approved",
    }));

    for (const tag of tagRows) {
      await supabase.from("tags").upsert(tag, { onConflict: "slug", ignoreDuplicates: true });
    }

    // Fetch tag IDs and link
    const slugs = tagRows.map((t) => t.slug);
    const { data: existingTags } = await supabase
      .from("tags")
      .select("id, slug")
      .in("slug", slugs);

    if (existingTags && existingTags.length > 0) {
      for (const t of existingTags) {
        await supabase.from("media_tags").upsert(
          { media_id: mediaIdStr, media_type, tag_id: t.id },
          { onConflict: "media_id,media_type,tag_id", ignoreDuplicates: true },
        );
      }
    }

    // ─── 2. Map genres → our predefined categories ───
    const categorySlugs = new Set<string>();

    for (const g of genres) {
      const genreName = g.name.toLowerCase().trim();
      const mapped = GENRE_TO_CATEGORY[genreName];
      if (mapped) {
        mapped.forEach((s) => categorySlugs.add(s));
      }
    }

    let syncedCategories = 0;

    if (categorySlugs.size > 0) {
      // Fetch matching category IDs from our predefined categories
      const { data: matchedCats } = await supabase
        .from("categories")
        .select("id, slug")
        .in("slug", Array.from(categorySlugs));

      if (matchedCats && matchedCats.length > 0) {
        // Check existing assignments
        const { data: existingAssignments } = await supabase
          .from("media_categories")
          .select("category_id")
          .eq("media_id", mediaIdStr)
          .eq("media_type", media_type);

        const assignedIds = new Set((existingAssignments || []).map((a) => a.category_id));

        for (const cat of matchedCats) {
          if (!assignedIds.has(cat.id)) {
            await supabase.from("media_categories").insert({
              media_id: mediaIdStr,
              media_type,
              category_id: cat.id,
            });
          }
        }
        syncedCategories = matchedCats.length;
      }
    }

    return new Response(
      JSON.stringify({
        synced_tags: existingTags?.length || 0,
        synced_categories: syncedCategories,
        matched_slugs: Array.from(categorySlugs),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-media-tags error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
