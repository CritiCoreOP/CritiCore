import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { toast } from "sonner";
import { ARTICLE_STATUSES, updateArticleStatus, type ArticleStatus } from "@/lib/articleStatus";
import { timeAgo } from "@/lib/press";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { DashArticle } from "@/hooks/usePressDashboard";
import DashboardSection from "./DashboardSection";
import { focusRing } from "./styles";

interface Props {
  articles: DashArticle[];
  /** Admins see every article; the heading says so */
  all: boolean;
  onMoved: (id: string, status: ArticleStatus) => void;
}

/** Articles by workflow column, with arrows to move one a step on or back */
export default function PipelineSection({ articles, all, onMoved }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState<ArticleStatus>("writing");

  const counts = useMemo(() => {
    const c = Object.fromEntries(ARTICLE_STATUSES.map((s) => [s, 0])) as Record<ArticleStatus, number>;
    for (const a of articles) c[a.status] += 1;
    return c;
  }, [articles]);
  const column = articles.filter((a) => a.status === active).slice(0, 6);
  const index = ARTICLE_STATUSES.indexOf(active);

  const move = async (article: DashArticle, dir: 1 | -1) => {
    const next = ARTICLE_STATUSES[index + dir];
    if (!next) return;
    onMoved(article.id, next);
    try {
      await updateArticleStatus(article.id, next);
      toast.success(t("workflow.statusUpdated"));
    } catch {
      onMoved(article.id, article.status);
      toast.error(t("workflow.statusError"));
    }
  };

  return (
    <DashboardSection
      id="dash-pipeline"
      title={all ? t("redaktion.dash.pipeline.titleAll") : t("redaktion.dash.pipeline.title")}
      action={
        <Link to="/news/board" className={`inline-flex items-center gap-1 rounded text-xs font-medium text-accent-light hover:underline ${focusRing}`}>
          {t("redaktion.viewBoard")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      }
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex gap-1.5" role="tablist" aria-label={t("redaktion.dash.pipeline.title")}>
          {ARTICLE_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === active}
              onClick={() => setActive(s)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                focusRing,
                s === active ? "border-primary bg-primary text-primary-foreground" : "border-border/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`workflow.status.${s}`)}
              <span className="ml-1.5 tabular-nums opacity-80">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-2" role="tabpanel">
        {column.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("workflow.emptyColumn")}
          </li>
        ) : (
          column.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/40 py-1.5 pl-3 pr-1.5">
              <Link to={`/news/schreiben?edit=${a.id}`} className={`min-w-0 flex-1 rounded py-1 ${focusRing}`}>
                <span className="block truncate text-sm font-medium text-foreground">{a.title || t("workflow.untitled")}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(a.updated_at)}</span>
              </Link>
              <span className="flex shrink-0 items-center" data-tour={i === 0 ? "pipeline" : undefined}>
                <button
                  type="button"
                  onClick={() => move(a, -1)}
                  disabled={index === 0}
                  aria-label={index > 0 ? t("redaktion.dash.pipeline.moveTo", { status: t(`workflow.status.${ARTICLE_STATUSES[index - 1]}`) }) : undefined}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 ${focusRing}`}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(a, 1)}
                  disabled={index === ARTICLE_STATUSES.length - 1}
                  aria-label={index < ARTICLE_STATUSES.length - 1 ? t("redaktion.dash.pipeline.moveTo", { status: t(`workflow.status.${ARTICLE_STATUSES[index + 1]}`) }) : undefined}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-accent-light transition-colors hover:bg-primary/10 disabled:opacity-30 ${focusRing}`}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))
        )}
      </ul>
      {counts[active] > column.length && (
        <p className="mt-2 text-xs text-muted-foreground">{t("redaktion.dash.pipeline.more", { count: counts[active] - column.length })}</p>
      )}
    </DashboardSection>
  );
}
