import { supabase } from "@/integrations/supabase/client";

export const ARTICLE_STATUSES = [
  "idea",
  "research",
  "writing",
  "review",
  "published",
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/**
 * Persists a new workflow status for an article. Moving a card to (or away
 * from) "published" keeps the legacy `published` boolean in sync so the rest
 * of the app keeps working.
 */
export async function updateArticleStatus(
  articleId: string,
  status: ArticleStatus,
): Promise<void> {
  const patch: { status: ArticleStatus; published?: boolean } = { status };
  if (status === "published") patch.published = true;
  else patch.published = false;

  const { error } = await supabase
    .from("articles")
    .update(patch as never)
    .eq("id", articleId);

  if (error) throw error;
}
