// Server-side AI enrichment via Anthropic Claude.
// Aggregates TMDB / RAWG / TVDB (cached) metadata for one title and produces
// a normalized German tag set, discovery categories and short description.
//
// Input:  { media_type: "movie" | "tv" | "game", id: number | string }
// Output: { enrichment: { tags, categories, description_de } } or existing row.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// ---- Fixed tag vocabulary (German) ----------------------------------------
// Shared across movies, series and games with some game-specific tags.
const TAG_VOCAB = [
  // Themen / Motive
  "Zeitreise", "Coming-of-Age", "Dystopie", "Utopie", "Slice of Life",
  "Rache", "Found Family", "Freundschaft", "Familie", "Liebesgeschichte",
  "Krieg", "Politik", "Verschwörung", "Übernatürlich", "Magie",
  "Künstliche Intelligenz", "Weltraum", "Endzeit", "Mystery", "Horror",
  "Krimi", "Thriller", "Historisch", "Biografisch", "Satire",
  "Dark", "Feel-Good", "Psychologisch", "Survival", "Heist",
  // Setting
  "Cyberpunk", "Steampunk", "Fantasy-Welt", "Mittelalter", "Moderne Zeit",
  "Nahe Zukunft", "Alternative Geschichte", "Kleine Stadt", "Großstadt",
  // Game-spezifisch
  "Open World", "Roguelike", "Souls-like", "Metroidvania", "Sandbox",
  "Koop", "Kompetitiv", "Story-getrieben", "Indie", "Pixel-Art",
] as const;
const TAG_SET = new Set<string>(TAG_VOCAB as readonly string[]);

// Categories for Entdecken sections (loose German labels)
const CATEGORY_VOCAB = [
  "Action & Abenteuer", "Drama", "Komödie", "Sci-Fi & Fantasy",
  "Horror & Mystery", "Krimi & Thriller", "Romantik", "Familie & Animation",
  "Dokumentation", "Reality", "Historisch", "Anime",
  "Indie-Perlen", "Blockbuster", "Kritiker-Lieblinge", "Kult-Klassiker",
] as const;
const CATEGORY_SET = new Set<string>(CATEGORY_VOCAB as readonly string[]);

const SYSTEM_PROMPT = `Du bist ein Metadaten-Kurator für eine deutsche Film-, Serien- und Spiele-Datenbank.
Deine Aufgabe: Aus den vorhandenen Rohdaten (TMDB, RAWG, TVDB) konsistente deutsche Tags, Kategorien und eine Kurzbeschreibung erzeugen.

FESTES TAG-VOKABULAR (nur daraus wählen, exakte Schreibweise):
${TAG_VOCAB.join(", ")}

FESTES KATEGORIE-VOKABULAR (nur daraus wählen, exakte Schreibweise):
${CATEGORY_VOCAB.join(", ")}

REGELN:
1. Wähle 3-6 Tags AUSSCHLIESSLICH aus der Tag-Liste. Erfinde keine neuen Tags. Externe Tags/Genres sind nur Hinweise.
2. Wähle 1-2 Kategorien AUSSCHLIESSLICH aus der Kategorie-Liste.
3. Erzeuge eine deutsche Kurzbeschreibung (2-3 Sätze). Wenn die vorhandene Beschreibung fehlt, leer ist oder nicht auf Deutsch: schreibe eine neue. Ist bereits eine gute deutsche Beschreibung vorhanden: setze "description_de": null.
4. Antworte AUSSCHLIESSLICH mit JSON in exakt diesem Format, ohne Markdown, ohne Codefences, ohne Erklärung:
{"tags": ["..."], "categories": ["..."], "description_de": "..." | null}`;

// ---------------------------------------------------------------------------

// All AI calls go through the OpenAI-compatible gateway (OpenRouter by default)
const AI_GATEWAY_URL = Deno.env.get("AI_GATEWAY_URL") ?? "https://openrouter.ai/api/v1/chat/completions";
/** New AI enrichments per hour across all callers; real browsing stays far below, a scripted run of ids stops here */
const MAX_NEW_PER_HOUR = Number(Deno.env.get("ENRICH_MAX_PER_HOUR") ?? 120);
const ENRICH_MODEL = Deno.env.get("AI_ENRICH_MODEL") ?? "anthropic/claude-haiku-4.5";

interface EnrichmentResult {
  tags: string[];
  categories: string[];
  description_de: string | null;
}

// In-memory per-instance dedup for concurrent requests on the same id.
const inflight = new Map<string, Promise<EnrichmentResult | null>>();

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ok(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// -- Data collection --------------------------------------------------------

async function fetchTmdb(endpoint: string, params: Record<string, string> = {}) {
  const key = Deno.env.get("TMDB_API_KEY");
  if (!key) return null;
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "de-DE");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("TMDB fetch failed:", e);
    return null;
  }
}

async function fetchRawg(endpoint: string) {
  const key = Deno.env.get("RAWG_API_KEY");
  if (!key) return null;
  const url = new URL(`https://api.rawg.io${endpoint}`);
  url.searchParams.set("key", key);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("RAWG fetch failed:", e);
    return null;
  }
}

async function getTvdbFromCache(sb: any, tmdbId: string) {
  // Only READ existing tvdb-link cache; do not trigger a new tvdb call.
  const key = `tvdb-link:tv:tmdb:${tmdbId}`;
  const { data } = await sb
    .from("api_cache")
    .select("response_data, expires_at")
    .eq("cache_key", key)
    .maybeSingle();
  if (!data || new Date(data.expires_at as string) < new Date()) return null;
  const tvdbId = (data.response_data as { tvdb_id?: number | string | null })?.tvdb_id ?? null;
  if (!tvdbId) return null;
  const detailKey = `tvdb:/series/${tvdbId}/extended:`;
  const { data: detail } = await sb
    .from("api_cache")
    .select("response_data, expires_at")
    .eq("cache_key", detailKey)
    .maybeSingle();
  if (!detail || new Date(detail.expires_at as string) < new Date()) return null;
  return detail.response_data;
}

async function collectMetadata(
  sb: any,
  mediaType: "movie" | "tv" | "game",
  id: string,
): Promise<string | null> {
  const parts: string[] = [];

  if (mediaType === "movie" || mediaType === "tv") {
    const tmdb = await fetchTmdb(`/${mediaType}/${id}`);
    if (!tmdb) return null;
    const title = tmdb.title || tmdb.name;
    const overview = tmdb.overview || "";
    const genres = (tmdb.genres || []).map((g: { name: string }) => g.name);
    const year =
      (tmdb.release_date || tmdb.first_air_date || "").slice(0, 4) || "unbekannt";
    parts.push(`QUELLE: TMDB`);
    parts.push(`Titel: ${title}`);
    parts.push(`Jahr: ${year}`);
    parts.push(`Genres: ${genres.join(", ") || "-"}`);
    parts.push(`Beschreibung: ${overview || "-"}`);

    if (mediaType === "tv") {
      const tvdb = await getTvdbFromCache(sb, id);
      if (tvdb && typeof tvdb === "object") {
        const t = tvdb as {
          genres?: { name?: string }[];
          tags?: { name?: string }[];
        };
        const g = (t.genres || []).map((x) => x?.name).filter(Boolean);
        const tg = (t.tags || []).map((x) => x?.name).filter(Boolean);
        parts.push(`QUELLE: TVDB (Cache)`);
        parts.push(`TVDB-Genres: ${g.join(", ") || "-"}`);
        parts.push(`TVDB-Tags: ${tg.join(", ") || "-"}`);
      }
    }
  } else {
    const rawg = await fetchRawg(`/api/games/${id}`);
    if (!rawg) return null;
    const name = rawg.name;
    const desc = (rawg.description_raw || "").slice(0, 800);
    const genres = (rawg.genres || []).map((g: { name: string }) => g.name);
    const tags = (rawg.tags || [])
      .filter((t: { language?: string }) => !t.language || t.language === "eng")
      .slice(0, 15)
      .map((t: { name: string }) => t.name);
    const year = (rawg.released || "").slice(0, 4) || "unbekannt";
    const platforms = (rawg.platforms || [])
      .map((p: { platform?: { name?: string } }) => p.platform?.name)
      .filter(Boolean);
    parts.push(`QUELLE: RAWG`);
    parts.push(`Titel: ${name}`);
    parts.push(`Jahr: ${year}`);
    parts.push(`Plattformen: ${platforms.join(", ") || "-"}`);
    parts.push(`Genres: ${genres.join(", ") || "-"}`);
    parts.push(`RAWG-Tags: ${tags.join(", ") || "-"}`);
    parts.push(`Beschreibung: ${desc || "-"}`);
  }

  return parts.join("\n");
}

// -- AI call + validation --------------------------------------------------

async function callAI(userContent: string): Promise<string | null> {
  const apiKey = Deno.env.get("AI_API_KEY");
  if (!apiKey) {
    console.error("AI_API_KEY missing");
    return null;
  }
  const res = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ENRICH_MODEL,
      max_tokens: 500,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) {
    console.error("AI error", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? null;
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function createFallbackEnrichment(
  metadata: string,
  mediaType: "movie" | "tv" | "game",
): EnrichmentResult {
  const text = metadata.toLowerCase();
  const categories = new Set<string>();
  const tags = new Set<string>();

  const addCategory = (category: (typeof CATEGORY_VOCAB)[number]) => categories.add(category);
  const addTag = (tag: (typeof TAG_VOCAB)[number]) => tags.add(tag);

  if (hasAny(text, ["anime", "animation", "animated", "familie", "family"])) addCategory("Familie & Animation");
  if (hasAny(text, ["action", "abenteuer", "adventure", "shooter", "kampf", "mission"])) addCategory("Action & Abenteuer");
  if (hasAny(text, ["drama", "tragödie", "konflikt"])) addCategory("Drama");
  if (hasAny(text, ["komödie", "comedy", "humor", "satire"])) addCategory("Komödie");
  if (hasAny(text, ["sci-fi", "science fiction", "fantasy", "weltraum", "space", "magie", "magic", "cyberpunk"])) addCategory("Sci-Fi & Fantasy");
  if (hasAny(text, ["horror", "mystery", "übernatürlich", "supernatural", "fluch", "demon"])) addCategory("Horror & Mystery");
  if (hasAny(text, ["krimi", "crime", "thriller", "detective", "mord", "verschwörung"])) addCategory("Krimi & Thriller");
  if (hasAny(text, ["romantik", "romance", "liebe", "love"])) addCategory("Romantik");
  if (hasAny(text, ["dokumentation", "documentary"])) addCategory("Dokumentation");
  if (hasAny(text, ["reality"])) addCategory("Reality");
  if (hasAny(text, ["historisch", "history", "historical", "mittelalter"])) addCategory("Historisch");
  if (mediaType === "game" && hasAny(text, ["indie", "pixel", "roguelike", "metroidvania"])) addCategory("Indie-Perlen");
  if (hasAny(text, ["blockbuster", "marvel", "dc comics", "star wars", "jurassic", "predator"])) addCategory("Blockbuster");

  if (hasAny(text, ["zeitreise", "time travel"])) addTag("Zeitreise");
  if (hasAny(text, ["coming-of-age", "teen", "jugend", "erwachsenwerden"])) addTag("Coming-of-Age");
  if (hasAny(text, ["dystopie", "dystopia", "unterdrück", "besetzt", "apokalypse"])) addTag("Dystopie");
  if (hasAny(text, ["rache", "revenge", "vergeltung"])) addTag("Rache");
  if (hasAny(text, ["found family", "gefährten", "gang", "crew"])) addTag("Found Family");
  if (hasAny(text, ["freundschaft", "friends", "friendship"])) addTag("Freundschaft");
  if (hasAny(text, ["familie", "family", "vater", "mutter", "kind", "sohn", "tochter"])) addTag("Familie");
  if (hasAny(text, ["liebe", "romance", "romantik", "love"])) addTag("Liebesgeschichte");
  if (hasAny(text, ["krieg", "war", "soldat", "army", "battle", "schlacht"])) addTag("Krieg");
  if (hasAny(text, ["politik", "political", "regierung"])) addTag("Politik");
  if (hasAny(text, ["verschwörung", "conspiracy"])) addTag("Verschwörung");
  if (hasAny(text, ["übernatürlich", "supernatural", "demon", "dämon", "fluch", "curse"])) addTag("Übernatürlich");
  if (hasAny(text, ["magie", "magic", "wizard", "zauber"])) addTag("Magie");
  if (hasAny(text, ["ki", "künstliche intelligenz", "artificial intelligence", "robot", "roboter"])) addTag("Künstliche Intelligenz");
  if (hasAny(text, ["weltraum", "space", "planet", "alien", "galaxie"])) addTag("Weltraum");
  if (hasAny(text, ["endzeit", "post-apokalypse", "apocalypse", "apokalyptisch"])) addTag("Endzeit");
  if (hasAny(text, ["mystery", "geheimnis", "secret"])) addTag("Mystery");
  if (hasAny(text, ["horror", "angst", "fear"])) addTag("Horror");
  if (hasAny(text, ["krimi", "crime", "detective", "mord"])) addTag("Krimi");
  if (hasAny(text, ["thriller", "verfolg", "survive", "überleben"])) addTag("Thriller");
  if (hasAny(text, ["historisch", "historical", "history", "1899", "mittelalter"])) addTag("Historisch");
  if (hasAny(text, ["dark", "düster", "brutal", "noir"])) addTag("Dark");
  if (hasAny(text, ["feel-good", "warmherzig", "humorvoll"])) addTag("Feel-Good");
  if (hasAny(text, ["psychologisch", "psychological", "trauma", "illusion"])) addTag("Psychologisch");
  if (hasAny(text, ["survival", "überleben", "wildnis", "strandet"])) addTag("Survival");
  if (hasAny(text, ["heist", "raub", "überfall"])) addTag("Heist");
  if (hasAny(text, ["cyberpunk"])) addTag("Cyberpunk");
  if (hasAny(text, ["steampunk"])) addTag("Steampunk");
  if (hasAny(text, ["fantasy", "fantasy-welt", "dungeon", "drachen"])) addTag("Fantasy-Welt");
  if (hasAny(text, ["mittelalter", "medieval"])) addTag("Mittelalter");
  if (hasAny(text, ["nahe zukunft", "near future"])) addTag("Nahe Zukunft");
  if (hasAny(text, ["kleine stadt", "small town"])) addTag("Kleine Stadt");
  if (hasAny(text, ["großstadt", "city", "metropole"])) addTag("Großstadt");

  if (mediaType === "game") {
    if (hasAny(text, ["open world", "offene welt"])) addTag("Open World");
    if (hasAny(text, ["roguelike", "roguelite"])) addTag("Roguelike");
    if (hasAny(text, ["souls-like", "soulslike"])) addTag("Souls-like");
    if (hasAny(text, ["metroidvania"])) addTag("Metroidvania");
    if (hasAny(text, ["sandbox", "crafting", "bauen"])) addTag("Sandbox");
    if (hasAny(text, ["koop", "co-op", "cooperative", "multiplayer"])) addTag("Koop");
    if (hasAny(text, ["kompetitiv", "competitive", "pvp"])) addTag("Kompetitiv");
    if (hasAny(text, ["story", "geschichte", "narrative"])) addTag("Story-getrieben");
    if (hasAny(text, ["indie"])) addTag("Indie");
    if (hasAny(text, ["pixel", "2d"])) addTag("Pixel-Art");
  }

  if (categories.size === 0) addCategory(mediaType === "game" ? "Action & Abenteuer" : "Drama");

  const categoryList = [...categories].slice(0, 2);
  const fallbackTags: (typeof TAG_VOCAB)[number][] = mediaType === "game"
    ? ["Story-getrieben", "Moderne Zeit", "Open World", "Indie"]
    : ["Moderne Zeit", "Freundschaft", "Dark", "Feel-Good"];
  for (const tag of fallbackTags) {
    if (tags.size >= 3) break;
    addTag(tag);
  }

  return {
    tags: [...tags].slice(0, 6),
    categories: categoryList,
    description_de: null,
  };
}

function completeWithFallback(
  parsed: EnrichmentResult,
  fallback: EnrichmentResult,
): EnrichmentResult {
  const tags = new Set(parsed.tags);
  for (const tag of fallback.tags) {
    if (tags.size >= 3) break;
    tags.add(tag);
  }
  const categories = new Set(parsed.categories);
  for (const category of fallback.categories) {
    if (categories.size >= 1) break;
    categories.add(category);
  }
  return {
    tags: [...tags].slice(0, 6),
    categories: [...categories].slice(0, 2),
    description_de: parsed.description_de,
  };
}

function parseAndValidate(raw: string): EnrichmentResult | null {
  let text = raw.trim();
  // strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("JSON.parse failed for:", text.slice(0, 200));
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as {
    tags?: unknown;
    categories?: unknown;
    description_de?: unknown;
  };
  if (!Array.isArray(p.tags) || !Array.isArray(p.categories)) return null;
  const tags = Array.from(
    new Set(p.tags.filter((t): t is string => typeof t === "string" && TAG_SET.has(t))),
  ).slice(0, 6);
  const categories = Array.from(
    new Set(p.categories.filter((c): c is string => typeof c === "string" && CATEGORY_SET.has(c))),
  ).slice(0, 2);
  const droppedTags = p.tags.filter((t) => typeof t !== "string" || !TAG_SET.has(t as string));
  const droppedCats = p.categories.filter((c) => typeof c !== "string" || !CATEGORY_SET.has(c as string));
  if (droppedTags.length) console.warn("Dropped unknown tags:", droppedTags);
  if (droppedCats.length) console.warn("Dropped unknown categories:", droppedCats);
  // Require at least 1 valid tag and 1 valid category after filtering.
  if (tags.length === 0 || categories.length === 0) return null;
  const description_de =
    typeof p.description_de === "string" && p.description_de.trim().length > 0
      ? p.description_de.trim()
      : null;
  return { tags, categories, description_de };
}

// -- Main handler -----------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: { media_type?: string; id?: string | number };
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON");
  }
  const mediaType = body.media_type;
  const rawId = body.id;
  if (mediaType !== "movie" && mediaType !== "tv" && mediaType !== "game") {
    return bad(400, "media_type must be movie|tv|game");
  }
  if (rawId === undefined || rawId === null || String(rawId).length === 0) {
    return bad(400, "id required");
  }
  const id = String(rawId);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Already enriched? Return existing row, never re-enrich.
  const { data: existing } = await sb
    .from("media_enrichment")
    .select("tags, categories, description_de")
    .eq("media_type", mediaType)
    .eq("source_id", id)
    .maybeSingle();
  if (existing) {
    return new Response(
      JSON.stringify({ enrichment: existing, cached: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // The function is public (visitors trigger it while browsing), so every unknown title would be a
  // paid AI call: ids must look like TMDB/IGDB ids, and new enrichments are capped per hour overall
  if (!/^\d{1,10}$/.test(id)) return bad(400, "id must be numeric");
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: recent } = await sb
    .from("media_enrichment")
    .select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo);
  if ((recent ?? 0) >= MAX_NEW_PER_HOUR) return bad(429, "Enrichment busy, try later");

  const key = `${mediaType}:${id}`;
  let promise = inflight.get(key);
  if (!promise) {
    promise = (async () => {
      const meta = await collectMetadata(sb, mediaType, id);
      if (!meta) return null;
      const fallback = createFallbackEnrichment(meta, mediaType);
      const raw = await callAI(meta);
      const parsed = raw ? parseAndValidate(raw) : null;
      const result = parsed ? completeWithFallback(parsed, fallback) : fallback;
      await sb
        .from("media_enrichment")
        .upsert(
          {
            media_type: mediaType,
            source_id: id,
            tags: result.tags,
            categories: result.categories,
            description_de: result.description_de,
          },
          { onConflict: "media_type,source_id", ignoreDuplicates: true },
        );
      return result;
    })().finally(() => inflight.delete(key));
    inflight.set(key, promise);
  }

  try {
    const result = await promise;
    if (!result) {
      return ok({ enrichment: null, cached: false, skipped: true, reason: "metadata_unavailable" });
    }
    return ok({ enrichment: result, cached: false });
  } catch (e) {
    console.error("Enrichment unexpected failure:", e);
    return ok({ enrichment: null, cached: false, skipped: true, reason: "best_effort_failed" });
  }
});
