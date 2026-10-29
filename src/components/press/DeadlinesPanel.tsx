import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { formatDate } from "@/lib/locale";
import { deadlineInfo } from "@/lib/press";
import { cn } from "@/lib/utils";
import type { DashBriefing } from "@/hooks/usePressDashboard";
import DashboardSection from "./DashboardSection";
import { focusRing } from "./styles";

interface Props {
  briefings: DashBriefing[];
  titles: Record<string, string>;
}

/** Briefings from the desk, the ones with a deadline first and the nearest at the top */
export default function DeadlinesPanel({ briefings, titles }: Props) {
  const { t } = useTranslation();
  const sorted = [...briefings].sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline || b.deadline) return a.deadline ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });

  const due = (deadline: string) => {
    const { days, state } = deadlineInfo(deadline);
    const text =
      state === "overdue"
        ? t("redaktion.dash.deadlines.overdue", { count: -days })
        : state === "today"
          ? t("redaktion.dash.deadlines.today")
          : t("redaktion.dash.deadlines.due", { date: formatDate(deadline, { day: "numeric", month: "short" }) });
    return { text, tone: state === "overdue" ? "text-destructive" : state === "later" ? "text-muted-foreground" : "text-amber-400" };
  };

  return (
    <DashboardSection id="dash-deadlines" title={t("redaktion.dash.deadlines.title")} data-tour="briefings">
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("redaktion.noBriefings")}</p>
      ) : (
        <ul className="space-y-1">
          {sorted.slice(0, 5).map((b) => {
            const d = b.deadline ? due(b.deadline) : null;
            return (
              <li key={b.id}>
                <Link to={`/news/schreiben?edit=${b.article_id}`} className={`block rounded-lg px-2 py-2 transition-colors hover:bg-secondary/50 ${focusRing}`}>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">{titles[b.article_id] || t("workflow.untitled")}</span>
                    {d && <span className={cn("shrink-0 text-xs font-medium", d.tone)}>{d.text}</span>}
                  </span>
                  {b.body && <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{b.body}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
