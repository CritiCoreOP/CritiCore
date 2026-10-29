import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useArticleTranslations } from "@/hooks/useArticleTranslations";
import { Section } from "@/components/layout/Section";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LeadStory, RiverItem, SecondaryStory, type ArticleWithAuthor } from "./StoryCards";

/** Lead story, two secondary stories and four more in the list below */
const FRONT_PAGE_SIZE = 7;

async function loadFrontPage(): Promise<ArticleWithAuthor[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(FRONT_PAGE_SIZE);
  if (error) throw error;
  const articles = data ?? [];
  const userIds = [...new Set(articles.map((a) => a.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
    : { data: [] };
  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }]));
  return articles.map((a) => ({ ...a, profile: byUser.get(a.user_id) ?? null }));
}

/**
 * The news block that opens the front page. Titles come from translations that already exist
 * (useArticleTranslations only reads the cache), so the busiest page never triggers an AI call.
 */
export default function FrontPageNews() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ["front-page-news"], queryFn: loadFrontPage, staleTime: 1000 * 60 * 2 });
  const translated = useArticleTranslations(data);

  if (isLoading) {
    return (
      <div className="grid gap-10 xl:grid-cols-3" aria-busy="true">
        <div className="space-y-4 xl:col-span-2">
          <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-1">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Without stories (or on an error) the front page simply starts with the media rows below
  const stories = (data ?? []).map((a) => {
    const tr = translated(a);
    return { ...a, translatedTitle: tr.title, translatedExcerpt: tr.excerpt ?? undefined };
  });
  if (stories.length === 0) return null;

  const [lead, ...rest] = stories;
  const secondary = rest.slice(0, 2);
  const river = rest.slice(2);

  return (
    <div className="space-y-12 motion-safe:animate-fade-in">
      <section aria-label={t("nav.news")} className={cn("grid gap-10", secondary.length > 0 && "xl:grid-cols-3")}>
        <div className={cn(secondary.length > 0 && "xl:col-span-2")}>
          <LeadStory article={lead} fill={secondary.length > 0} />
        </div>
        {secondary.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
            {secondary.map((a) => (
              <SecondaryStory key={a.id} article={a} />
            ))}
          </div>
        )}
      </section>

      {river.length > 0 && (
        <Section title={t("home.latestNews")} viewAllLink="/news" className="border-t border-border/40 pt-10">
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            {river.map((a) => (
              <RiverItem key={a.id} article={a} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
