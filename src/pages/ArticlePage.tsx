import { useEffect } from "react";
import { Link, useParams } from "@/lib/locale-router";
import { useArticle } from "@/hooks/useArticles";
import { formatDate } from "@/lib/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion, MotionConfig } from "framer-motion";
import { useTranslation } from "react-i18next";
import { sanitizeHtml } from "@/lib/sanitize";
import ArticleHtml from "@/components/ArticleHtml";
import ReportDialog from "@/components/ReportDialog";
import { Clock as AccessTimeTwoTone, ArrowLeft as ArrowBackTwoTone, Calendar as CalendarTodayTwoTone } from "lucide-react";

const mccEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

function estimateReadingTime(html: string): number {
  const text = (html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return Math.max(1, Math.round(text.split(" ").length / 200));
}

const ArticlePage = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { data: article, isLoading, isError } = useArticle(slug);

  useEffect(() => {
    if (article) {
      document.title = `${article.title} – CritiCore`;
    }
  }, [article]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-background overflow-x-hidden">
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs mb-6 -ml-2">
          <Link to="/artikel">
            <ArrowBackTwoTone className="w-4 h-4" /> {t("articles.back", "Alle Artikel")}
          </Link>
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <Skeleton className="h-4 w-1/3 rounded-lg" />
            <div className="space-y-3 mt-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : isError || !article ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">
              {t("articles.notFound", "Artikel nicht gefunden.")}
            </p>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: mccEase }}
          >
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center justify-between gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <CalendarTodayTwoTone className="w-3.5 h-3.5" />
                  {formatDate(article.published_at || article.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <AccessTimeTwoTone className="w-3.5 h-3.5" />
                  {estimateReadingTime(article.content)} min
                </span>
              </div>
              <ReportDialog targetId={article.id} targetType="article" targetTitle={article.title} />
            </div>
            <ArticleHtml
              className="prose prose-neutral dark:prose-invert max-w-none mt-8 prose-headings:font-display prose-a:text-primary prose-img:rounded-xl"
              html={sanitizeHtml(article.content)}
            />
          </motion.article>
        )}
      </main>
    </div>
    </MotionConfig>
  );
};

export default ArticlePage;
