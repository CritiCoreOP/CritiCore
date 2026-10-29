import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** A published article as the newsletter editor shows and links it */
export interface ArticleRef {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  updated_at: string;
}

export type Block =
  | { id: string; type: "text"; heading: string; body: string; linkLabel: string; linkUrl: string }
  | { id: string; type: "articles"; heading: string; layout: "card" | "list"; articles: ArticleRef[] };

export type ArticlesBlock = Extract<Block, { type: "articles" }>;
export type TextBlock = Extract<Block, { type: "text" }>;

export const newTextBlock = (): TextBlock => ({ id: crypto.randomUUID(), type: "text", heading: "", body: "", linkLabel: "", linkUrl: "" });
export const newArticlesBlock = (articles: ArticleRef[] = [], heading = ""): ArticlesBlock => ({
  id: crypto.randomUUID(),
  type: "articles",
  heading,
  layout: articles.length > 1 ? "list" : "card",
  articles,
});

// Links in a newsletter always point to the live site, also when the issue is written on localhost
const SITE_URL = "https://criticore.cc";
const LOCALES: Record<string, string> = { de: "de-DE", en: "en-US", fr: "fr-FR", es: "es-ES", th: "th-TH" };

export const articleUrl = (slug: string, lang: string) => `${SITE_URL}/${LOCALES[lang] ?? "de-DE"}/news/${encodeURIComponent(slug)}`;

export const safeUrl = (v: string) => (/^https?:\/\/\S+$/i.test(v.trim()) ? v.trim() : "");

/** Heading of the "latest articles" section in the newsletter's language */
export const LATEST_HEADING: Record<string, string> = {
  de: "Neu auf CritiCore",
  en: "New on CritiCore",
  fr: "Nouveau sur CritiCore",
  es: "Novedades en CritiCore",
  th: "ใหม่บน CritiCore",
};

/** Heading of the big card at the top of the weekly review */
export const HIGHLIGHT_HEADING: Record<string, string> = {
  de: "Highlight der Woche",
  en: "Highlight of the week",
  fr: "Le temps fort de la semaine",
  es: "Lo más destacado de la semana",
  th: "ไฮไลต์ประจำสัปดาห์",
};

/** Subject and intro when the AI is not reachable; the editor rewrites them anyway */
export const WEEKLY_FALLBACK: Record<string, { subject: string; intro: string }> = {
  de: { subject: "Die Woche auf CritiCore", intro: "Hallo zusammen, das war unsere Woche: hier sind die Artikel, die ihr nicht verpassen solltet." },
  en: { subject: "The week on CritiCore", intro: "Hi everyone, here is our week: the articles you should not miss." },
  fr: { subject: "La semaine sur CritiCore", intro: "Bonjour à tous, voici notre semaine : les articles à ne pas manquer." },
  es: { subject: "La semana en CritiCore", intro: "Hola a todos, esta ha sido nuestra semana: los artículos que no os podéis perder." },
  th: { subject: "สัปดาห์นี้บน CritiCore", intro: "สวัสดีทุกคน นี่คือบทความที่ไม่ควรพลาดในสัปดาห์นี้" },
};

/** The week's articles as the AI gets them: headline and teaser, nothing else */
export const weeklyDigestInput = (list: ArticleRef[]) =>
  list.map((a, i) => `${i + 1}. ${a.title}${a.excerpt ? `\n   ${a.excerpt.replace(/\s+/g, " ").trim()}` : ""}`).join("\n");

const COLUMNS = "id, title, slug, excerpt, cover_image_url, category, updated_at";

/** Published articles, newest first; with a search term only those whose title contains it */
export function usePublishedArticles(search: string, enabled = true) {
  const term = search.trim().replace(/[%_\\]/g, "");
  return useQuery({
    queryKey: ["newsletter-articles", term],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from("articles").select(COLUMNS).eq("published", true).order("updated_at", { ascending: false }).limit(20);
      if (term) q = q.ilike("title", `%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ArticleRef[];
    },
  });
}

/** Articles published or updated in the last `days` days, for the "latest articles" shortcut */
export async function latestArticles(days = 7, limit = 6): Promise<ArticleRef[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("articles")
    .select(COLUMNS)
    .eq("published", true)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ArticleRef[];
}

/** What the send-newsletter function gets: text as typed, articles only as ids */
export const blocksForServer = (blocks: Block[]) =>
  blocks.map((b) =>
    b.type === "text"
      ? { type: "text", heading: b.heading, body: b.body, linkLabel: b.linkLabel, linkUrl: safeUrl(b.linkUrl) }
      : { type: "articles", heading: b.heading, layout: b.layout, articleIds: b.articles.map((a) => a.id) },
  );
