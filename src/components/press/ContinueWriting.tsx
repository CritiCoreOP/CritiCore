import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { Button } from "@/components/ui/button";
import { articleTypeLabel } from "@/lib/article-labels";
import { timeAgo } from "@/lib/press";
import { ArrowRight, PenLine } from "lucide-react";
import type { DashArticle } from "@/hooks/usePressDashboard";
import DashboardSection from "./DashboardSection";
import { focusRing, STATUS_TONE } from "./styles";

interface Props {
  drafts: DashArticle[];
  words: number | null;
}

const editLink = (id: string) => `/news/schreiben?edit=${id}`;

/** The draft edited last, big, with the next few below it */
export default function ContinueWriting({ drafts, words }: Props) {
  const { t } = useTranslation();
  const [current, ...rest] = drafts;

  return (
    <DashboardSection id="dash-continue" title={t("redaktion.dash.continue.title")}>
      {!current ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("redaktion.dash.continue.empty")}</p>
          <Button asChild size="sm" className="mt-4 gap-1.5">
            <Link to="/news/schreiben">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              {t("redaktion.dash.newArticle")}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <article className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="min-w-0">
              <p className="text-xs font-medium">
                <span className={STATUS_TONE[current.status]}>{t(`workflow.status.${current.status}`)}</span>
                <span className="text-muted-foreground"> · {articleTypeLabel(t, current.article_type)}</span>
              </p>
              <h3 className="mt-1.5 font-display text-xl font-bold leading-snug text-foreground line-clamp-2">
                {current.title || t("workflow.untitled")}
              </h3>
              {current.excerpt && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{current.excerpt}</p>}
              <p className="mt-3 text-xs text-muted-foreground">
                {t("redaktion.dash.continue.edited", { when: timeAgo(current.updated_at) })}
                {words !== null && <> · {t("redaktion.dash.continue.words", { count: words })}</>}
              </p>
              <Button asChild size="sm" className="mt-4 gap-1.5">
                <Link to={editLink(current.id)}>
                  {t("redaktion.dash.continue.action")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {current.cover_image_url && (
              <img
                src={current.cover_image_url}
                alt=""
                loading="lazy"
                className="order-first aspect-[16/10] w-full rounded-xl object-cover sm:order-none sm:aspect-[4/5]"
              />
            )}
          </article>

          {rest.length > 0 && (
            <ul className="mt-5 space-y-1 border-t border-border/40 pt-3">
              {rest.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link
                    to={editLink(a.id)}
                    className={`flex items-baseline justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/50 ${focusRing}`}
                  >
                    <span className="min-w-0 truncate text-sm text-foreground">{a.title || t("workflow.untitled")}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      <span className={STATUS_TONE[a.status]}>{t(`workflow.status.${a.status}`)}</span> · {timeAgo(a.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </DashboardSection>
  );
}
