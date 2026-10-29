import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/edge-function-error";

/** Plain text of article HTML; blocks end in a line break so sentences do not run together */
export function htmlToText(html: string): string {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, figure, iframe").forEach((el) => el.remove());
    doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6, blockquote").forEach((el) => el.append("\n\n"));
    doc.querySelectorAll("li, br").forEach((el) => el.append("\n"));
    return (doc.body.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** At most `max` characters, cut after a sentence if one ends late enough, else after a word */
export function clipText(text: string, max: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentence > max * 0.55) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max).replace(/[,;:\s]+$/, "")} …`;
}

const cache = new Map<string, string>();

/**
 * Short summary of a published article for the text below a headline on a graphic, written by the
 * AI (ai-editor-assist, action "slide") from the full article. Kept per article and length for the
 * session, so a second slide from the same article costs no second call.
 */
export async function summarizeArticle(articleId: string, maxChars: number): Promise<string> {
  const key = `${articleId}:${maxChars}`;
  const known = cache.get(key);
  if (known) return known;

  const { data: article, error } = await supabase
    .from("articles")
    .select("title, excerpt, content, language, article_type")
    .eq("id", articleId)
    .maybeSingle();
  if (error || !article) throw new Error(error?.message ?? "Article not found");

  const { data, error: fnError } = await supabase.functions.invoke("ai-editor-assist", {
    body: {
      action: "slide",
      title: article.title,
      excerpt: article.excerpt ?? "",
      article: htmlToText(article.content ?? "").slice(0, 12_000),
      language: article.language,
      articleType: article.article_type,
      maxChars,
    },
  });
  if (fnError) throw new Error(await edgeFunctionErrorMessage(fnError, "AI"));
  if (data?.error) throw new Error(String(data.error));
  // The model keeps to the limit most of the time; a little over is fine, a lot is cut
  const summary = typeof data?.summary === "string" ? clipText(data.summary, Math.round(maxChars * 1.2)) : "";
  if (!summary) throw new Error("Empty summary");
  cache.set(key, summary);
  return summary;
}
