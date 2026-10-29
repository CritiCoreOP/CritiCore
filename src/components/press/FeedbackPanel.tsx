import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { timeAgo } from "@/lib/press";
import type { DashComment } from "@/hooks/usePressDashboard";
import DashboardSection from "./DashboardSection";
import { focusRing } from "./styles";

interface Props {
  comments: DashComment[];
  titles: Record<string, string>;
}

/** Unresolved comments of colleagues, one row per article with the newest comment */
export default function FeedbackPanel({ comments, titles }: Props) {
  const { t } = useTranslation();
  const byArticle = new Map<string, DashComment[]>();
  for (const c of comments) byArticle.set(c.article_id, [...(byArticle.get(c.article_id) ?? []), c]);

  return (
    <DashboardSection id="dash-feedback" title={t("redaktion.dash.feedback.title")}>
      {byArticle.size === 0 ? (
        <p className="text-sm text-muted-foreground">{t("redaktion.dash.feedback.empty")}</p>
      ) : (
        <ul className="space-y-1">
          {[...byArticle].map(([articleId, list]) => (
            <li key={articleId}>
              <Link to={`/news/schreiben?edit=${articleId}`} className={`block rounded-lg px-2 py-2 transition-colors hover:bg-secondary/50 ${focusRing}`}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{titles[articleId] || t("workflow.untitled")}</span>
                  <span className="shrink-0 text-xs text-accent-light">{t("redaktion.dash.feedback.open", { count: list.length })}</span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                  {t("redaktion.dash.feedback.latest", { text: list[0].body, when: timeAgo(list[0].created_at) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
