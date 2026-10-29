import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/edge-function-error";
import { getPopularGames, getTrendingMovies, getTrendingSeries } from "@/lib/api";
import { getAnilistTrending, pickTitle } from "@/lib/anilist";
import { slugify } from "@/components/article-editor/types";

export type ReleaseKind = "movie" | "series" | "game" | "anime";
/** Article types the database accepts */
export type IdeaType = "news" | "review" | "opinion";

export interface Release {
  kind: ReleaseKind;
  title: string;
  date?: string;
}

export interface DiscoveredIdea {
  headline: string;
  pitch: string;
  type: IdeaType;
  kind: ReleaseKind;
  title: string;
}

export interface IdeaExpansion {
  type: IdeaType;
  angles: { title: string; pitch: string }[];
  headlines: string[];
  outline: string[];
  questions: string[];
}

/** Article category for a kind of title, as the editor's category select uses it */
// There is no anime category; anime articles go under "general"
export const KIND_CATEGORY: Record<ReleaseKind, string> = { movie: "movies", series: "series", game: "games", anime: "general" };

/**
 * What is trending on the site right now, from the same sources the start page uses. A source that
 * fails is left out; the ideas then come from the others.
 */
export async function trendingReleases(kinds: ReleaseKind[]): Promise<Release[]> {
  const take = 10;
  const loaders: Record<ReleaseKind, () => Promise<Release[]>> = {
    movie: async () => (await getTrendingMovies()).results.slice(0, take).map((m) => ({ kind: "movie", title: m.title, date: m.release_date })),
    series: async () =>
      (await getTrendingSeries()).results.slice(0, take).map((s) => ({ kind: "series", title: s.name ?? s.title, date: s.first_air_date })),
    game: async () => (await getPopularGames()).results.slice(0, take).map((g) => ({ kind: "game", title: g.name, date: g.released ?? undefined })),
    anime: async () =>
      (await getAnilistTrending(1, take)).Page.media.map((a) => ({
        kind: "anime",
        title: pickTitle(a.title, "english"),
        date: a.startDate?.year ? [a.startDate.year, a.startDate.month, a.startDate.day].filter(Boolean).map((n) => String(n).padStart(2, "0")).join("-") : undefined,
      })),
  };
  const lists = await Promise.allSettled(kinds.map((k) => loaders[k]()));
  return lists.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).filter((r) => r.title);
}

async function invokeIdeas<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("story-ideas", { body });
  // The function's own message (rate limit, credits) is more useful than the generic one
  if (error) throw new Error(await edgeFunctionErrorMessage(error, error.message));
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const discoverIdeas = (releases: Release[], language: string) =>
  invokeIdeas<{ ideas: DiscoveredIdea[] }>({ mode: "discover", releases, language }).then((d) => d.ideas ?? []);

export const expandIdea = (idea: { title: string; note?: string | null }, language: string) =>
  invokeIdeas<IdeaExpansion>({ mode: "expand", idea, language });

/** Stores an idea as an article in the "idea" column; the pitch goes into the teaser field */
export async function createIdea(input: {
  userId: string;
  title: string;
  pitch?: string;
  articleType?: IdeaType;
  category?: string;
  language: string;
}): Promise<string> {
  const title = input.title.trim();
  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: input.userId,
      title,
      slug: `${slugify(title) || "idee"}-${Date.now().toString(36)}`,
      content: "",
      excerpt: input.pitch?.trim() || null,
      article_type: input.articleType ?? "news",
      category: input.category ?? "general",
      language: input.language,
      status: "idea",
      published: false,
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Takes over an expanded idea: the chosen headline, the article type and, while the article is still
 * empty, the outline as subheadings to write under. Moves it on to "research".
 */
export async function applyExpansion(
  articleId: string,
  choice: { headline: string; type: IdeaType; outline: string[]; pitch?: string },
  currentContent: string,
) {
  const content = currentContent.trim()
    ? currentContent
    : choice.outline.map((h) => `<h2>${escapeHtml(h)}</h2><p></p>`).join("");
  const patch: Record<string, unknown> = { title: choice.headline, article_type: choice.type, content, status: "research" };
  if (choice.pitch) patch.excerpt = choice.pitch;
  const { error } = await supabase.from("articles").update(patch as never).eq("id", articleId);
  if (error) throw error;
}
