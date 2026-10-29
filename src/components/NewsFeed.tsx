import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { articleCategoryLabel, articleTypeLabel, isOpinion } from "@/lib/article-labels";
import OpinionLabel from "@/components/OpinionLabel";
import LiveLabel from "@/components/live/LiveLabel";
import { useLiveArticleIds } from "@/hooks/useLiveBlog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Newspaper, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/lib/locale-router";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedReview {
  id: string;
  media_id: string;
  media_type: string;
  score: number;
  title: string | null;
  content: string | null;
  created_at: string;
  is_critic_review: boolean;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FeedArticle {
  id: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  article_type: string;
  category: string | null;
  slug: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const mediaTypeLink: Record<string, string> = {
  game: "/games",
  movie: "/filme",
  series: "/serien",
};

const NewsFeed = () => {
  const liveIds = useLiveArticleIds();
  const [reviews, setReviews] = useState<FeedReview[]>([]);
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();

  const mediaTypeLabel: Record<string, string> = {
    game: t("nav.games"),
    movie: t("nav.movies"),
    series: t("nav.series"),
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const [reviewsRes, articlesRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("id, media_id, media_type, score, title, content, created_at, is_critic_review, user_id")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("articles")
          .select("id, title, excerpt, cover_image_url, article_type, category, slug, created_at, user_id")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      // Collect all unique user_ids and fetch profiles in one query
      const allUserIds = [
        ...(reviewsRes.data || []).map((r) => r.user_id),
        ...(articlesRes.data || []).map((a) => a.user_id),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];
      const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", uniqueUserIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          }
        }
      }

      if (reviewsRes.data) {
        setReviews(
          reviewsRes.data.map((r: any) => ({
            ...r,
            profile: profileMap[r.user_id] || null,
          }))
        );
      }
      if (articlesRes.data) {
        setArticles(
          articlesRes.data.map((a: any) => ({
            ...a,
            profile: profileMap[a.user_id] || null,
          }))
        );
      }
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const locale = i18n.language === "de" ? "de-DE" : i18n.language === "fr" ? "fr-FR" : i18n.language === "es" ? "es-ES" : "en-GB";
    return new Date(dateStr).toLocaleDateString(locale);
  };

  if (loading) {
    return (
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">{t("feed.title")}</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  const allItems = [
    ...reviews.map((r) => ({ ...r, feedType: "review" as const })),
    ...articles.map((a) => ({ ...a, feedType: "article" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const renderReview = (review: FeedReview) => (
    <Card key={`review-${review.id}`} className="group hover:border-primary/30 transition-colors">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10 shrink-0 mt-0.5">
            <AvatarImage src={review.profile?.avatar_url || ""} />
            <AvatarFallback>{(review.profile?.display_name || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm">{review.profile?.display_name || t("reviews.anonymous")}</span>
              <span className="text-xs text-muted-foreground">{t("feed.rated")}</span>
              {review.is_critic_review && (
                <Badge className="bg-primary text-primary-foreground text-xs">{t("feed.critic")}</Badge>
              )}
            </div>
            <Link
              to={`${mediaTypeLink[review.media_type] || "/"}/${review.media_id}`}
              className="hover:text-primary transition-colors"
            >
              <p className="font-semibold line-clamp-1">{review.title || review.media_id}</p>
            </Link>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                <span className="text-sm font-bold text-primary">{review.score.toFixed(1)}</span>
              </div>
              <Badge variant="secondary" className="text-xs capitalize">
                {mediaTypeLabel[review.media_type] || review.media_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(review.created_at)}
              </span>
            </div>
            {review.content && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{review.content}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderArticle = (article: FeedArticle) => (
    <Card key={`article-${article.id}`} className="group hover:border-primary/30 transition-colors">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          {article.cover_image_url ? (
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-20 h-14 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Newspaper className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {liveIds.has(article.id) && <LiveLabel />}
              {isOpinion(article.article_type) ? (
                <OpinionLabel type={article.article_type} />
              ) : (
                <Badge variant="outline" className="text-xs capitalize">
                  {articleTypeLabel(t, article.article_type)}
                </Badge>
              )}
              {article.category && (
                <Badge variant="secondary" className="text-xs">
                  {articleCategoryLabel(t, article.category)}
                </Badge>
              )}
            </div>
            <p className="font-semibold line-clamp-1">{article.title}</p>
            {article.excerpt && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{article.profile?.display_name || t("feed.editorial")}</span>
              <span>•</span>
              <span>{formatDate(article.created_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-primary" />
        {t("feed.title")}
      </h2>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">{t("feed.all")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("feed.reviews")}</TabsTrigger>
          <TabsTrigger value="articles">{t("feed.articles")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {allItems.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t("feed.noActivity")}
              </CardContent>
            </Card>
          ) : (
            allItems
              .slice(0, 10)
              .map((item) =>
                item.feedType === "review"
                  ? renderReview(item as FeedReview & { feedType: "review" })
                  : renderArticle(item as FeedArticle & { feedType: "article" })
              )
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t("feed.noReviews")}
              </CardContent>
            </Card>
          ) : (
            reviews.map(renderReview)
          )}
        </TabsContent>

        <TabsContent value="articles" className="space-y-3">
          {articles.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t("feed.noArticles")}
              </CardContent>
            </Card>
          ) : (
            articles.map(renderArticle)
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default NewsFeed;