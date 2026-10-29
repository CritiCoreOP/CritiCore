import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AI_API_KEY = Deno.env.get("AI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  de: "German", en: "English", fr: "French", es: "Spanish", th: "Thai",
};

// ── AI-Gateway (OpenRouter) ──
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

type Part = "title" | "content" | "excerpt";

const PART_RULES: Record<Part, string> = {
  title: "The text is the headline. Return only the translated headline, without quotation marks.",
  excerpt: "The text is the teaser below the headline. Return only the translated teaser.",
  content:
    'The text is the article as HTML. Translate only the visible text; keep every tag and attribute exactly as it is (including <aside class="article-note">, <figure class="article-image"> with its style and data attributes, <div class="image-row"> and <div class="video-embed">), never translate URLs or attribute values except alt texts. Translate image captions (<span class="image-caption">), but leave image credits (<span class="image-credit">) word for word: they name the owner of the picture. Return only the translated HTML, without code fence.',
};

const stripFence = (s: string) => s.trim().replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?\s*```$/, "").trim();

async function translateTextAI(text: string, part: Part, targetLang: string, sourceLang?: string): Promise<string> {
  if (!text.trim()) return text;
  const targetName = LANG_NAMES[targetLang] || targetLang;
  const sourceName = sourceLang ? (LANG_NAMES[sourceLang] || sourceLang) : "the source language";

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch((Deno.env.get("AI_GATEWAY_URL") ?? "https://openrouter.ai/api/v1/chat/completions"), {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL_LITE") ?? "google/gemini-3.1-flash-lite",
        temperature: 0.2,
        max_tokens: part === "content" ? 32000 : 1000,
        messages: [
          {
            role: "system",
            content: `You are a professional translator for CritiCore, a review and news site for games, films, series and anime. Translate the following text from ${sourceName} to ${targetName} so it reads as if written in ${targetName}, not word for word.
RULES:
1) Always use informal address (e.g. "du" in German, "tú" in Spanish, informal register in Thai). Never use formal "Sie"/"usted"/formal register.
2) Translate faithfully: do not add, drop, explain or "correct" anything. Keep facts, dates, numbers, prices and names exactly as in the source, even if they look wrong or unknown to you; your knowledge is older than the article.
3) Keep titles of games, films, series and anime as written in the source.
4) ${PART_RULES[part]}`,
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (res.status === 429) { await sleep(Math.min(2000 * Math.pow(2, attempt), 10000)); continue; }
    if (!res.ok) throw new Error(`AI translation error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const choice = data.choices?.[0];
    // A cut-off translation would silently lose the end of the article
    if (choice?.finish_reason === "length") throw new Error("Article too long to translate in one step");
    return stripFence(choice?.message?.content ?? "") || text;
  }
  throw new Error("AI translation failed after retries (rate limited)");
}

async function translateTextsAI(texts: [string, string, string], targetLang: string, sourceLang?: string): Promise<string[]> {
  const parts: Part[] = ["title", "content", "excerpt"];
  // In parallel: the article no longer waits for the headline to finish
  return await Promise.all(texts.map((text, i) => translateTextAI(text, parts[i], targetLang, sourceLang)));
}

// ── Auth helper: returns the authenticated user id (or null) ──
async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await sb.auth.getClaims(token);
  const claims = data?.claims as { sub?: string; role?: string } | undefined;
  if (error || !claims?.sub || claims.role !== "authenticated") return null;
  return claims.sub;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { targetLang, articleId } = body;
    if (!targetLang) {
      return new Response(JSON.stringify({ error: "targetLang required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let sourceLang: string;
    let title: string;
    let content: string;
    let excerpt: string;

    if (articleId) {
      // Public path: translate a published article fetched server-side. Client
      // supplied text is ignored so this can't be abused to translate arbitrary
      // attacker content. Results are cached per article.
      const { data: cached } = await sb
        .from("article_translations").select("title, content, excerpt")
        .eq("article_id", articleId).eq("target_lang", targetLang).maybeSingle();
      if (cached?.content) {
        return new Response(JSON.stringify({ title: cached.title, content: cached.content, excerpt: cached.excerpt || "", cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: article } = await sb
        .from("articles").select("title, content, excerpt, language, published")
        .eq("id", articleId).maybeSingle();

      if (!article || !article.published) {
        return new Response(JSON.stringify({ error: "Article not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      sourceLang = article.language || "de";
      title = article.title || "";
      content = article.content || "";
      excerpt = article.excerpt || "";
    } else {
      // Draft path: an authenticated writer translates supplied draft content.
      // Requires a signed-in user to prevent anonymous credit drain.
      const userId = await getUserId(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!body.content) {
        return new Response(JSON.stringify({ error: "content required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sourceLang = body.sourceLang || "de";
      title = body.title || "";
      content = body.content;
      excerpt = body.excerpt || "";
    }

    if (sourceLang === targetLang) {
      return new Response(JSON.stringify({ title, content, excerpt, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // All translations run through the AI gateway (OpenRouter by default)
    if (!AI_API_KEY) {
      return new Response(JSON.stringify({ error: "No translation provider available" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const translated = await translateTextsAI([title, content, excerpt], targetLang, sourceLang);

    const result = { title: translated[0] || title || "", content: translated[1], excerpt: translated[2] || "", cached: false };


    // Persist to DB cache
    if (articleId) {
      await sb.from("article_translations").upsert({
        article_id: articleId, target_lang: targetLang,
        title: result.title, content: result.content, excerpt: result.excerpt,
      }, { onConflict: "article_id,target_lang" });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Translation error:", err);
    const isRateLimit = String(err).includes("429") || String(err).includes("rate limited");
    return new Response(JSON.stringify({ error: isRateLimit ? "Translation service is busy, please try again shortly." : String(err) }), {
      status: isRateLimit ? 429 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
