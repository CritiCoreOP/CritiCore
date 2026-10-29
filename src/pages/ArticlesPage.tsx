import { useEffect } from "react";
import { Link } from "@/lib/locale-router";
import { useArticles } from "@/hooks/useArticles";
import { formatDate } from "@/lib/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CloudOff, RotateCw } from "lucide-react";
import { motion, MotionConfig } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Clock as AccessTimeTwoTone, FileText as ArticleTwoTone, Calendar as CalendarTodayTwoTone } from "lucide-react";

const mccEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

function estimateReadingTime(html: string): number {
  const text = (html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return Math.max(1, Math.round(text.split(" ").length / 200));
}

function excerpt(html: string, len = 160): string {
  const text = (html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return text.length > len ? text.slice(0, len).trimEnd() + "…" : text;
}

const ArticlesPage = () => {
  const { t } = useTranslation();
  const { data: articles, isLoading, isError, refetch, isFetching } = useArticles();

  useEffect(() => {
    document.title = t("articles.metaTitle", "Artikel – CritiCore");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("articles.metaDescription", "Aktuelle Artikel und Beiträge von CritiCore."));
  }, [t]);

  const list = (articles ?? []).filter((a) => a.status === "published");

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen bg-background overflow-x-hidden">
      <div className="relative w-full pt-14 overflow-hidden">
        <div className="relative container mx-auto px-4 pt-12 pb-8">
          <motion.h1
            className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2"
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: mccEase }}
          >
            {t("articles.title", "Artikel")}
          </motion.h1>
          <motion.p
            className="text-sm text-muted-foreground max-w-lg leading-relaxed"
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1, ease: mccEase }}
          >
            {t("articles.subtitle", "Aktuelle Beiträge aus der Redaktion.")}
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
            <CloudOff className="mb-4 h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="font-display text-lg font-semibold text-foreground">
              {t("articles.loadError", "Artikel konnten nicht geladen werden.")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("articles.loadErrorHint")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RotateCw className={isFetching ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden="true" />
                {t("articles.retry")}
              </Button>
              <Button asChild>
                <Link to="/news">{t("articles.toNews")}</Link>
              </Button>
            </div>
          </div>
        ) : list.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: mccEase }}
          >
            <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {t("articles.empty", "Noch keine Artikel veröffentlicht.")}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((article, index) => (
              <Link key={article.id} to={`/artikel/${article.slug}`} className="block">
                <div
                  className="group rounded-2xl overflow-hidden border border-border/30 bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 h-full animate-fade-in p-5"
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
                >
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md mb-3 gap-1">
                    <ArticleTwoTone className="w-3 h-3" /> {t("articles.badge", "Artikel")}
                  </Badge>
                  <h3 className="font-display font-semibold text-[15px] text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200 leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                    {excerpt(article.content)}
                  </p>
                  <div className="flex items-center gap-2.5 mt-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarTodayTwoTone className="w-3 h-3" />
                      {formatDate(article.published_at || article.created_at)}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <AccessTimeTwoTone className="w-3 h-3" />
                      {estimateReadingTime(article.content)} min
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
    <Footer />
    </MotionConfig>
  );
};

export default ArticlesPage;
