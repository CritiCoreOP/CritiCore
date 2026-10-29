import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chat, corsHeaders, errorResponse, FACTS_RULE, json, langName, parseObject, requireUser } from "../_shared/ai.ts";

// Long articles are checked in parts at paragraph boundaries; the parts run in parallel
const CHUNK_CHARS = 6_000;
const MAX_CHARS = 48_000;

interface Correction {
  context: string;
  original: string;
  correction: string;
  reason: string;
}

function chunks(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (const para of text.split(/\n+/)) {
    if (current && current.length + para.length + 1 > CHUNK_CHARS) {
      parts.push(current);
      current = "";
    }
    current = current ? `${current}\n${para}` : para;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Drops corrections whose passage is not in the text; the editor could not place them anyway */
function validate(raw: unknown, text: string): Correction[] {
  const list = Array.isArray((raw as { corrections?: unknown })?.corrections) ? (raw as { corrections: unknown[] }).corrections : [];
  return list.flatMap((c) => {
    const item = (c ?? {}) as Record<string, unknown>;
    const original = str(item.original, 120);
    const correction = str(item.correction, 160);
    let context = str(item.context, 200);
    if (!original.trim() || original === correction || !text.includes(original)) return [];
    if (!context.includes(original) || !text.includes(context)) context = "";
    return [{ context, original, correction, reason: str(item.reason, 200).trim() }];
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = await requireUser(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const fullText = typeof body.text === "string" ? body.text : "";
    if (!fullText.trim()) return json({ error: "No text provided" }, 400);

    const articleLang = langName(body.language);
    // Explanations in the language of the interface; older clients only send the article language
    const uiLang = langName(body.uiLanguage, articleLang);
    const truncated = fullText.length > MAX_CHARS;
    const text = truncated ? fullText.slice(0, MAX_CHARS) : fullText;

    const system = `You are a meticulous proofreader for ${articleLang} texts on CritiCore, a site about games, films, series and anime. Find real errors only: spelling, typos, grammar, punctuation, wrong word forms, doubled words. Do not touch style, word choice or sentence structure.

${FACTS_RULE}

Not errors: English gaming and film terms common in ${articleLang} (Gameplay, Open World, Trailer, Season, Remake), gender-inclusive forms (Spieler:innen, Spieler*innen), valid alternative spellings, deliberately colloquial phrasing. In quoted speech fix spelling only, not grammar or dialect.

For every error return:
- "context": 4 to 10 words copied character for character from the text that contain the error, never across a line break; long enough to occur only once.
- "original": the wrong part exactly as it appears inside "context", as short as possible (usually one word).
- "correction": the replacement for "original".
- "reason": a very short explanation in ${uiLang}.

Answer with a JSON object {"corrections": [...]}; the list is empty when there is nothing to fix.`;

    const results = await Promise.all(
      chunks(text).map(async (part) => {
        const { content } = await chat({ system, user: part, json: true, temperature: 0, maxTokens: 4000 });
        const parsed = parseObject(content);
        if (!parsed) console.error("spellcheck: unparsable answer", content.slice(0, 300));
        return validate(parsed, part);
      }),
    );

    const seen = new Set<string>();
    const corrections = results.flat().filter((c) => {
      const key = `${c.context}\u0000${c.original}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return json({ corrections, truncated });
  } catch (e) {
    return errorResponse(e, "spellcheck");
  }
});
