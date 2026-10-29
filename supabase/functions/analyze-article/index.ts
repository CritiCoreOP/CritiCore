import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AIError, chat, corsHeaders, errorResponse, json, LANG_NAMES, parseObject, requireUser, today } from "../_shared/ai.ts";

// ~6 000 words; longer articles are cut, the model is told so
const MAX_CHARS = 36_000;

const TYPE_GUIDE: Record<string, string> = {
  review:
    "a review: it needs a clear, justified verdict, concrete observations (what works, what does not, with examples), context for the reader and a conclusion. A personal voice is expected.",
  opinion:
    "an opinion piece: it needs a clear thesis, arguments with support and an honest acknowledgement of other views. A personal voice is expected.",
  news:
    "a news article: it must answer who, what, when, where and why early, attribute claims to sources, stay neutral and avoid opinion outside quotes.",
};

const ISSUE_TYPES = ["spelling", "grammar", "style", "structure", "substance", "voice"] as const;
const SEVERITIES = ["high", "medium", "low"] as const;
const DIMENSIONS = ["correctness", "clarity", "structure", "substance", "voice"] as const;

/** The editor's HTML as plain text that still shows the structure the model has to judge */
function toOutline(html: string): string {
  return html
    .replace(/<div[^>]*class="video-embed"[^>]*>[\s\S]*?<\/div>/gi, "\n[YouTube video]\n")
    .replace(/<h2[^>]*>/gi, "\n\n## ")
    .replace(/<h3[^>]*>/gi, "\n\n### ")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<blockquote[^>]*>/gi, "\n\n> ")
    .replace(/<aside[^>]*class="article-note"[^>]*>/gi, "\n\n[Note box] ")
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "\n[Image: $1]\n")
    .replace(/<img[^>]*>/gi, "\n[Image without alt text]\n")
    .replace(/<\/(p|h2|h3|blockquote|aside|tr)>/gi, "\n")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const plain = (s: string) => s.replace(/^(#{2,3} |- |> |\[Note box\] )/gm, "");
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

/** Keeps the model's answer to the shape the editor expects; quotes that are not in the text are dropped */
function normalize(raw: Record<string, unknown>, text: string) {
  const body = plain(text);
  const issues = (Array.isArray(raw.issues) ? raw.issues : [])
    .map((i: Record<string, unknown>) => {
      let quote = clip(i.quote, 160);
      // A quote the author cannot find helps nobody, and a fix for it could not be applied
      if (quote && !body.includes(quote)) quote = "";
      return {
        type: oneOf(i.type, ISSUE_TYPES, "style"),
        severity: oneOf(i.severity, SEVERITIES, "medium"),
        quote,
        suggestion: clip(i.suggestion, 300),
        fix: quote ? clip(i.fix, 200) : "",
      };
    })
    .filter((i) => i.suggestion)
    .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity))
    .slice(0, 15);

  const dims = (raw.dimensions ?? {}) as Record<string, unknown>;
  const dimensions = Object.fromEntries(
    DIMENSIONS.map((d) => {
      const n = Math.round(Number(dims[d]));
      return [d, Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3];
    }),
  );
  const spelling = issues.filter((i) => i.type === "spelling" || i.type === "grammar").length;
  const genericPhrasing = raw.generic_phrasing === true;

  return {
    score: oneOf(raw.score, ["good", "medium", "bad"] as const, "medium"),
    summary: clip(raw.summary, 400),
    strengths: (Array.isArray(raw.strengths) ? raw.strengths : []).map((s) => clip(s, 200)).filter(Boolean).slice(0, 4),
    dimensions,
    issues,
    generic_phrasing: genericPhrasing,
    spelling_issues: Math.max(spelling, Math.round(Number(raw.spelling_issues)) || 0),
    // Fields older editor versions read
    reasons: issues.slice(0, 5).map((i) => i.suggestion),
    ai_detected: genericPhrasing,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await requireUser(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    // `html` since 2026-10-04; older editors send plain `text`
    const source: string = typeof body.html === "string" ? toOutline(body.html) : typeof body.text === "string" ? body.text.trim() : "";
    if (source.length < 20) return json({ error: "No text provided" }, 400);

    const articleLang = LANG_NAMES[body.language] ?? "German";
    const feedbackLang = LANG_NAMES[body.uiLanguage] ?? LANG_NAMES[body.language] ?? "German";
    const typeGuide = TYPE_GUIDE[body.articleType] ?? TYPE_GUIDE.news;
    const truncated = source.length > MAX_CHARS;
    const text = truncated ? source.slice(0, MAX_CHARS) : source;

    const systemPrompt = `You are the copy chief of CritiCore, a review site for games, movies, series and anime. You give authors precise, actionable feedback on a draft before it is published. Be honest and specific, never vague. Today is ${today()}.

The article is written in ${articleLang}. It is ${typeGuide}
Write every text field of your answer (summary, strengths, suggestions) in ${feedbackLang} and address the author informally, like a colleague ("du" in German, "tu" in French, "tú" in Spanish). Keep "quote" and "fix" in the article's language.

FACTS: You cannot check facts. Your knowledge stops at some point in the past, and articles report on newer events: release dates, trailers, announcements, prices, casts. Never judge whether a statement is true, never call it false, outdated, a leak, a fan edit or a rumour because of what you remember, and never "correct" dates, names or numbers from memory. You may only point out contradictions inside the article itself (for example two different dates for the same event) and claims that need a named source ("who announced this?").

Input format: "## " and "### " mark subheadings, "- " list items, "> " quotes, "[Note box]" a disclosure box, "[Image: …]" an image with its alt text, "[YouTube video]" an embedded video.

Judge five dimensions from 1 (poor) to 5 (excellent):
- correctness: spelling, grammar, punctuation
- clarity: easy to follow, sentence length, filler, jargon
- structure: headline and teaser match the text, strong opening, subheadings in longer texts, a proper ending
- substance: concrete details, examples, reasoning and attribution appropriate to the article type (not whether the facts are true)
- voice: sounds like a person with a view; generic, interchangeable phrasing lowers it

List concrete issues, most important first, at most 15:
- "quote": an EXACT, contiguous excerpt from the article text (copy it character for character, max 160 characters, without the markup prefixes). Use "" if the issue concerns the whole text.
- "fix": the replacement for exactly that quote when it is a direct correction (spelling, grammar, a better word). Use "" for advice that needs the author.
- "suggestion": one or two sentences explaining what to change and why.
- "type": spelling | grammar | style | structure | substance | voice; "severity": high | medium | low.
Report every spelling and grammar error you find as its own issue.

Overall "score":
- "good": ready to publish; at most minor issues.
- "medium": publishable after revision.
- "bad": ONLY if the text is not a usable article (placeholder, a few loose sentences, unrelated content), or if errors are so frequent that it is hard to read. Style, missing depth or generic phrasing alone are never "bad".

"generic_phrasing": true if large parts read like interchangeable boilerplate (empty superlatives, filler intros, repetitive structure). This is a writing hint, not an accusation; do not guess whether a machine wrote it.
${truncated ? "\nThe article was cut after about 6 000 words; judge the part you see and mention the cut nowhere." : ""}
Answer with a single JSON object:
{"score": "good"|"medium"|"bad", "summary": "one or two sentences", "strengths": ["up to 3"], "dimensions": {"correctness": 1-5, "clarity": 1-5, "structure": 1-5, "substance": 1-5, "voice": 1-5}, "issues": [{"type": "...", "severity": "...", "quote": "...", "fix": "...", "suggestion": "..."}], "generic_phrasing": true|false, "spelling_issues": 0}`;

    const userContent = [
      body.title ? `Headline: ${clip(body.title, 300)}` : "",
      body.excerpt ? `Teaser: ${clip(body.excerpt, 600)}` : "",
      "",
      text,
    ].filter((l, i) => l || i > 1).join("\n");

    const { content, truncated: cut } = await chat({
      system: systemPrompt,
      user: userContent,
      json: true,
      // The same draft should get the same verdict twice in a row
      temperature: 0.2,
      maxTokens: 4000,
    });
    const raw = cut ? null : parseObject(content);
    if (!raw) {
      console.error("analyze-article: unparsable answer", content.slice(0, 300));
      throw new AIError("KI-Antwort unlesbar, bitte erneut versuchen", 502);
    }

    return json({ analysis: normalize(raw, text) });
  } catch (e) {
    return errorResponse(e, "analyze-article");
  }
});
