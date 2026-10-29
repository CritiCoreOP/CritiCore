import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AIError, chat, corsHeaders, errorResponse, FACTS_RULE, json, langName, requireUser, today } from "../_shared/ai.ts";

const MAX_CHARS = 60_000;

const plainText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const attrs = (html: string, name: string) => [...html.matchAll(new RegExp(`${name}="([^"]+)"`, "g"))].map((m) => m[1]);

/**
 * The answer replaces the whole article, so it is checked first: a cut-off answer, missing images or
 * links, or a much shorter or longer text mean the model did more than "minimal edits".
 */
function problemWith(original: string, improved: string): string | null {
  const ratio = plainText(improved).length / Math.max(1, plainText(original).length);
  if (ratio < 0.7 || ratio > 1.4) return "length";
  if (attrs(original, "src").some((s) => !improved.includes(s))) return "images";
  if (attrs(original, "href").some((h) => !improved.includes(h))) return "links";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = await requireUser(req);
  if (authError) return authError;

  try {
    const { text, language, reasons, issues, title } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 20) return json({ error: "Text zu kurz" }, 400);
    if (text.length > MAX_CHARS) {
      return json({ error: "Der Artikel ist zu lang für eine Überarbeitung in einem Schritt. Übernimm die Vorschläge der Prüfung einzeln." }, 413);
    }

    // Findings of the quality analysis: since 2026-10-04 with quote and suggestion, before only reasons
    const findings: string[] = Array.isArray(issues) && issues.length > 0
      ? issues.slice(0, 20).map((i: { quote?: string; suggestion?: string }) =>
          `- ${i.quote ? `„${String(i.quote).slice(0, 160)}“: ` : ""}${String(i.suggestion ?? "").slice(0, 300)}`)
      : Array.isArray(reasons)
        ? reasons.slice(0, 10).map((r: string) => `- ${String(r).slice(0, 300)}`)
        : [];

    const system = `You are an experienced editor at CritiCore, a review and news site for games, films, series and anime. Today is ${today()}. Revise the following article (written in ${langName(language)}) as little as necessary.
${findings.length ? `\nThe quality check found these points; fix them:\n${findings.join("\n")}\n` : ""}
${FACTS_RULE} If the article contradicts itself, leave that passage as it is.

Rules:
- Correct every spelling, grammar and punctuation mistake.
- Fix the points above. Return paragraphs that are fine unchanged, word for word.
- Keep the author's voice, tone and opinion. Do not rewrite the text, do not add facts, numbers or quotes, do not remove content.
- Keep the HTML structure exactly: all tags and attributes (<p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <a>, <img>, <table>, <aside class="article-note">, <figure class="article-image"> with its style and data attributes, <figcaption>, <div class="image-row">, <div class="video-embed"> and so on) in the same order.
- Do not change links (href), image sources (src), alt texts or image credits (<span class="image-credit">).
- Return ONLY the revised HTML, without explanations and without code fence.`;

    const { content, truncated } = await chat({
      system,
      user: title ? `<!-- Headline: ${String(title).slice(0, 300)} -->\n${text}` : text,
      temperature: 0.2,
      // The whole article comes back; a cut-off answer is rejected below
      maxTokens: 32_000,
    });
    if (truncated) {
      throw new AIError("Der Artikel ist zu lang für eine Überarbeitung in einem Schritt. Übernimm die Vorschläge der Prüfung einzeln.", 422);
    }

    const improved = content
      .replace(/^<!--[\s\S]*?-->\s*/, "")
      .replace(/^<!doctype[^>]*>/i, "")
      .replace(/<\/?(html|head|body)[^>]*>/gi, "")
      .trim();
    const problem = problemWith(text, improved);
    if (problem) {
      console.error("improve-article: rejected answer,", problem);
      throw new AIError(
        "Die KI hätte mehr verändert als die gefundenen Punkte (Länge, Bilder oder Links). Dein Text bleibt unverändert; übernimm die Vorschläge einzeln oder versuche es noch einmal.",
        422,
      );
    }

    return json({ improved });
  } catch (e) {
    return errorResponse(e, "improve-article");
  }
});
