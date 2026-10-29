import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AIError, chat, corsHeaders, errorResponse, FACTS_RULE, json, langName, parseObject, requireUser, today } from "../_shared/ai.ts";

/**
 * Story ideas for the press dashboard.
 * - discover: angles for articles about titles that are trending right now (the list comes from the
 *   site's own TMDB/IGDB/AniList data, the model adds no facts of its own)
 * - expand: turns a one-line idea into headlines, angles, an outline and research questions
 */

// The article types the database accepts
const TYPES = ["news", "review", "opinion"] as const;
const KINDS = ["movie", "series", "game", "anime"] as const;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const strings = (v: unknown, max: number, len: number) =>
  (Array.isArray(v) ? v : []).map((s) => clip(s, len)).filter(Boolean).slice(0, max);
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

const SITE = "You are the ideas editor of CritiCore, a review and news site for games, films, series and anime with a young, informed audience.";

async function discover(body: Record<string, unknown>, lang: string) {
  const releases = (Array.isArray(body.releases) ? body.releases : []).slice(0, 40).flatMap((r) => {
    const item = (r ?? {}) as Record<string, unknown>;
    const title = clip(item.title, 120);
    if (!title) return [];
    return [{ kind: oneOf(item.kind, KINDS, "movie"), title, date: clip(item.date, 10) }];
  });
  if (!releases.length) throw new AIError("Keine aktuellen Titel übergeben.", 400);

  const system = `${SITE} Today is ${today()}.

${FACTS_RULE} Use only what the list says about each title (its name, kind and date). Do not claim announcements, sales, reviews, cast, story details or anything else you might remember; build the idea on an angle the author researches.

Suggest 6 article ideas about titles from the list. Mix article types (news, review, opinion) and kinds, prefer titles where a CritiCore article adds something: a review, a guide for newcomers, a comparison, a question fans ask. No listicles of the list itself.
Write in ${lang}. For every idea return:
- "headline": a working headline, max 80 characters, concrete, no clickbait
- "pitch": one or two sentences: what the article does and why readers want it now
- "type": news | review | opinion (a guide counts as news)
- "title": the title from the list exactly as given
Answer as JSON {"ideas": [...]}.`;

  const list = releases.map((r) => `- [${r.kind}] ${r.title}${r.date ? ` (${r.date})` : ""}`).join("\n");
  const { content } = await chat({ system, user: `Trending on CritiCore now:\n${list}`, json: true, temperature: 0.8, maxTokens: 2_000 });
  const raw = parseObject(content);
  const known = new Map(releases.map((r) => [r.title.toLowerCase(), r]));
  const ideas = (Array.isArray(raw?.ideas) ? raw!.ideas : []).flatMap((i) => {
    const idea = (i ?? {}) as Record<string, unknown>;
    const release = known.get(clip(idea.title, 120).toLowerCase());
    const headline = clip(idea.headline, 120);
    // An idea about a title that is not in the list was made up
    if (!release || !headline) return [];
    return [{ headline, pitch: clip(idea.pitch, 300), type: oneOf(idea.type, TYPES, "news"), kind: release.kind, title: release.title }];
  });
  if (!ideas.length) throw new AIError("Die KI-Antwort war unlesbar. Bitte versuche es noch einmal.", 502);
  return { ideas: ideas.slice(0, 6) };
}

async function expand(body: Record<string, unknown>, lang: string) {
  const idea = (body.idea ?? {}) as Record<string, unknown>;
  const title = clip(idea.title, 200);
  if (!title) throw new AIError("Die Idee ist leer.", 400);
  const note = clip(idea.note, 600);

  const system = `${SITE} Today is ${today()}. An author brings a rough idea; help them turn it into an article they can start writing.

${FACTS_RULE} Never state facts about the subject; phrase anything you are unsure about as a question to research.

Write in ${lang}. Return a JSON object:
- "type": the article type that fits best: news | review | opinion (a guide counts as news)
- "angles": 3 different approaches, each {"title": "short name", "pitch": "one sentence"}
- "headlines": 5 headline options, max 80 characters each, concrete, no clickbait
- "outline": 4 to 7 subheadings for the article in reading order, short
- "questions": 3 to 6 questions the author should answer or check before writing`;

  const { content } = await chat({
    system,
    user: `Idea: ${title}${note ? `\nNotes: ${note}` : ""}`,
    json: true,
    temperature: 0.7,
    maxTokens: 1_500,
  });
  const raw = parseObject(content);
  if (!raw) throw new AIError("Die KI-Antwort war unlesbar. Bitte versuche es noch einmal.", 502);
  const angles = (Array.isArray(raw.angles) ? raw.angles : [])
    .map((a) => ({ title: clip((a as Record<string, unknown>)?.title, 80), pitch: clip((a as Record<string, unknown>)?.pitch, 300) }))
    .filter((a) => a.title)
    .slice(0, 3);
  return {
    type: oneOf(raw.type, TYPES, "news"),
    angles,
    headlines: strings(raw.headlines, 5, 120),
    outline: strings(raw.outline, 7, 100),
    questions: strings(raw.questions, 6, 200),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = await requireUser(req);
  if (authError) return authError;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const lang = langName(body.language);
    if (body.mode === "discover") return json(await discover(body, lang));
    if (body.mode === "expand") return json(await expand(body, lang));
    return json({ error: "Invalid mode" }, 400);
  } catch (e) {
    return errorResponse(e, "story-ideas");
  }
});
