import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface TranslatableArticle {
  id: string;
  title: string;
  excerpt?: string | null;
  language?: string | null;
}

/**
 * Titles and excerpts from translations that already exist (article_translations), for teasers
 * on the home page. Only reads the cache: the News page and the article itself create missing
 * translations, so teasers never trigger an AI call.
 */
export function useArticleTranslations<T extends TranslatableArticle>(articles: T[] | undefined | null) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const ids = (articles ?? []).filter((a) => (a.language || "de") !== lang).map((a) => a.id);

  const { data } = useQuery({
    queryKey: ["article-translations-cached", lang, ids],
    enabled: ids.length > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_translations")
        .select("article_id, title, excerpt")
        .eq("target_lang", lang)
        .in("article_id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });

  const byId = new Map((data ?? []).map((row) => [row.article_id, row]));
  return (article: T): { title: string; excerpt: string | null | undefined } => {
    const tr = byId.get(article.id);
    return { title: tr?.title || article.title, excerpt: tr?.excerpt || article.excerpt };
  };
}
