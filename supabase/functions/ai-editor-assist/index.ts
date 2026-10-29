import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AIError, chat, corsHeaders, errorResponse, FACTS_RULE, json, langName, parseObject, requireUser, today } from "../_shared/ai.ts";

type Action = "headline" | "teaser" | "rewrite" | "shorten" | "expand" | "seo" | "proofread" | "slide" | "newsletter";
const META: Action[] = ["headline", "teaser", "seo", "slide", "newsletter"];
const PASSAGE: Action[] = ["rewrite", "shorten", "expand", "proofread"];

const TYPE_NAMES: Record<string, string> = { news: "a news article", review: "a review", opinion: "an opinion piece", guide: "a guide" };

const TASKS: Record<Action, string> = {
  headline:
    'Suggest 5 headlines for this article. Each at most 70 characters, concrete (names the game, film, series or anime and what is new or the verdict), no clickbait, no capitals for emphasis, no exclamation marks, only claims the article makes. Vary the approach: plain news, the key detail first, the angle or verdict, a short punchy one. Answer as JSON {"options": ["…", …]}.',
  teaser:
    'Write 3 alternative teasers for this article, each 140 to 240 characters in one or two sentences. Tell the reader what the article delivers and why it matters, do not repeat the headline word for word, no clickbait, no claims the article does not make. Answer as JSON {"options": ["…", …]}.',
  seo:
    'Write a search result title (at most 60 characters, the main keyword, usually the title of the game, film or series, near the start) and a meta description (120 to 155 characters that summarise the article and invite the click, no claims the article does not make). Answer as JSON {"title": "…", "description": "…"}.',
  rewrite:
    "Rewrite the passage so it reads better: clearer, more active and more precise, livelier where it is flat; remove filler and repetition. Keep the meaning, every fact and the author's opinion, and roughly the same length.",
  shorten:
    "Shorten the passage to about half its length. Keep the key information, the numbers, names and dates that matter and the author's verdict; cut repetition, filler and asides.",
  expand:
    "Expand the passage to about one and a half to two times its length: explain, connect it with what the article says elsewhere, make implicit reasoning explicit. Use only information from the article; never add facts, numbers, dates, names or quotes from your own knowledge. If the passage cannot grow without new facts, improve its flow and explanation instead.",
  slide:
    'Write the short text that stands below the headline on a social media graphic for this article (Instagram, X, TikTok): one or two sentences that tell what is new or what the verdict is and why it matters. Do not repeat the headline, say nothing the article does not say, no hashtags, no emojis, no exclamation marks, no quotation marks around it, no "In diesem Artikel" or similar. Answer as JSON {"summary": "…"}.',
  newsletter:
    'You get the articles CritiCore published this week, each with headline and teaser. Write the opening of the weekly newsletter: a subject line (at most 70 characters, names one or two of the articles, no clickbait, no exclamation marks), a preview text for the inbox (at most 110 characters) and an intro of two to four sentences that picks two or three highlights and says in a few words why they are worth reading. In German address the readers informally with "du"/"ihr". Say nothing about an article that its headline and teaser do not say, no emojis. Answer as JSON {"subject": "…", "preheader": "…", "intro": "…"}.',
  proofread:
    "Correct spelling, grammar and punctuation in the passage and change nothing else: not the style, not the word choice, not the facts. If there is nothing to correct, return the passage unchanged.",
};

const TEMPERATURE: Record<Action, number> = { headline: 0.8, teaser: 0.7, seo: 0.4, rewrite: 0.5, shorten: 0.3, expand: 0.5, proofread: 0, slide: 0.4, newsletter: 0.6 };

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = await requireUser(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as Action;
    if (!TASKS[action]) return json({ error: "Invalid action" }, 400);

    const input = clip(body.input, 15_000);
    // Since 2026-10-05 the editor sends the article and the passage as HTML; before only `input` and `context`
    const html = body.format === "html";
    const article = clip(body.article, 12_000) || (META.includes(action) ? input : "");
    if (!input && !article) return json({ error: "Empty input" }, 400);

    const lang = langName(body.language);
    const type = TYPE_NAMES[body.articleType] ?? "an article";
    const title = clip(body.title, 300) || clip(body.context, 300).replace(/^[^:]*:\s*/, "");

    // Social graphics: the summary has to fit below the headline, the creator says how much room there is
    const maxChars = Math.min(260, Math.max(60, Number(body.maxChars) || 170));
    const limit = action === "slide" ? `At most ${maxChars} characters, shorter is fine.
` : "";

    const format = PASSAGE.includes(action)
      ? html
        ? "You get one passage of the article as HTML. Return only the new HTML of this passage, without explanations or code fence. Keep its block structure (paragraphs, list items, headings) unless the task needs otherwise, and keep inline markup (<a href>, <strong>, <em>, <u>, <s>, <span …>) on the words it belongs to; never drop a link. Use no other tags."
        : "You get one passage of the article as plain text. Return only the new text, paragraphs separated by a blank line, without explanations."
      : "";

    const system = `You are an editor at CritiCore, a review and news site for games, films, series and anime. Today is ${today()}. ${action === "newsletter" ? `The newsletter is in ${lang}; write your answer in ${lang}.` : `The article is ${type} in ${lang}; write your answer in ${lang} and match the article's voice.`}

${FACTS_RULE}

${TASKS[action]}
${limit}${format}`;

    const user = PASSAGE.includes(action)
      ? [
          title && `Headline: ${title}`,
          article && `Article for context, do not return it:\n"""\n${article.slice(0, 8_000)}\n"""`,
          `Passage to edit:\n${input}`,
        ].filter(Boolean).join("\n\n")
      : [title && `Current headline: ${title}`, clip(body.excerpt, 600) && `Current teaser: ${clip(body.excerpt, 600)}`, article]
          .filter(Boolean)
          .join("\n\n");

    const { content, truncated } = await chat({
      system,
      user,
      json: META.includes(action),
      temperature: TEMPERATURE[action],
      maxTokens: PASSAGE.includes(action) ? 8_000 : 1_500,
    });
    if (truncated) throw new AIError("Die Antwort war zu lang und wurde abgeschnitten. Markiere einen kürzeren Abschnitt.", 422);
    if (!content) throw new AIError("Die KI hat nichts zurückgegeben. Bitte versuche es noch einmal.", 502);

    if (action === "headline" || action === "teaser") {
      const raw = parseObject(content)?.options;
      const options = (Array.isArray(raw) ? raw : [])
        .map((o) => clip(o, action === "headline" ? 200 : 300).replace(/^["„“]|["“”]$/g, ""))
        .filter(Boolean)
        .slice(0, 5);
      if (!options.length) throw new AIError("Die KI-Antwort war unlesbar. Bitte versuche es noch einmal.", 502);
      // `output` for editors that still expect plain text
      return json({ options, output: options.map((o, i) => `${i + 1}. ${o}`).join("\n") });
    }

    if (action === "slide") {
      const summary = clip(parseObject(content)?.summary, maxChars + 80).replace(/^["„“]|["“”]$/g, "");
      if (!summary) throw new AIError("Die KI-Antwort war unlesbar. Bitte versuche es noch einmal.", 502);
      return json({ summary, output: summary });
    }

    if (action === "newsletter") {
      const parsed = parseObject(content);
      const draft = { subject: clip(parsed?.subject, 120), preheader: clip(parsed?.preheader, 160), intro: clip(parsed?.intro, 3000) };
      if (!draft.subject || !draft.intro) throw new AIError("Die KI-Antwort war unlesbar. Bitte versuche es noch einmal.", 502);
      return json({ ...draft, output: JSON.stringify(draft) });
    }

    if (action === "seo") {
      const parsed = parseObject(content);
      const seo = { title: clip(parsed?.title, 120), description: clip(parsed?.description, 300) };
      if (!seo.title && !seo.description) throw new AIError("Die KI-Antwort war unlesbar. Bitte versuche es noch einmal.", 502);
      return json({ ...seo, output: JSON.stringify(seo) });
    }

    // Links the passage had but the suggestion lost; the editor warns before replacing
    const lostLinks = html ? hrefs(input).filter((h) => !content.includes(h)).length : 0;
    return json({ output: content, lostLinks });
  } catch (e) {
    return errorResponse(e, "ai-editor-assist");
  }
});
