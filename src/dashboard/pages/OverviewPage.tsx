import { useTranslation } from "react-i18next";
import { History, PenLine } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { Button } from "@/components/ui/button";
import { useAdminKpis, useOwnArticles, useQueues } from "../data";
import { useDashboard } from "../context";
import { lastPath } from "../local";
import { activeItem, DEFAULT_PINS, visibleItems } from "../nav";
import { ActivityPanel, DraftsPanel, InboxPanel, PinsPanel, UnsharedPanel } from "../panels";
import { PageHeader, StatTile } from "../ui";

function greeting(hour: number) {
  if (hour < 11) return "dash.greeting.morning";
  if (hour < 18) return "dash.greeting.day";
  return "dash.greeting.evening";
}

export default function OverviewPage() {
  const { t } = useTranslation();
  const { isAdmin, userId } = useDashboard();
  const queues = useQueues(isAdmin);
  const kpis = useAdminKpis(isAdmin);
  const own = useOwnArticles(isAdmin ? undefined : userId);
  const last = lastPath();
  const lastItem = last ? activeItem(visibleItems(isAdmin), last) : undefined;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t(greeting(new Date().getHours()))}
        description={t(isAdmin ? "dash.overview.adminIntro" : "dash.overview.teamIntro")}
        actions={
          <>
            {last && lastItem && lastItem.id !== "overview" && (
              <Button asChild variant="outline" className="gap-1.5">
                <Link to={last}>
                  <History className="h-4 w-4" aria-hidden="true" />
                  {t("dash.overview.continueAt", { page: t(...lastItem.label) })}
                </Link>
              </Button>
            )}
            <Button asChild className="gap-1.5">
              <Link to="/news/schreiben">
                <PenLine className="h-4 w-4" aria-hidden="true" />
                {t("dash.palette.write")}
              </Link>
            </Button>
          </>
        }
      />

      {isAdmin ? (
        <section aria-label={t("dash.kpi.title")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {["users", "reviews", "articles", "comments"].map((id) => {
            const kpi = kpis.data?.find((k) => k.id === id);
            return <StatTile key={id} label={t(`dash.kpi.${id}`)} value={kpi?.total ?? 0} buckets={kpi?.buckets} loading={kpis.isLoading} />;
          })}
        </section>
      ) : (
        <section aria-label={t("dash.kpi.title")} className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <StatTile label={t("dash.kpi.ownPublished")} value={own.data?.published30 ?? 0} buckets={own.data?.buckets} loading={own.isLoading} />
          <StatTile label={t("dash.kpi.ownInProgress")} value={own.data?.inProgress ?? 0} loading={own.isLoading} />
          <StatTile label={t("dash.kpi.ownInReview")} value={own.data?.inReview ?? 0} loading={own.isLoading} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-6">
          {isAdmin && <InboxPanel results={queues.data} loading={queues.isLoading} error={queues.isError} />}
          <UnsharedPanel />
          <ActivityPanel isAdmin={isAdmin} />
        </div>
        <div className="grid gap-6">
          <PinsPanel isAdmin={isAdmin} defaults={isAdmin ? DEFAULT_PINS.admin : DEFAULT_PINS.team} />
          <DraftsPanel />
        </div>
      </div>
    </div>
  );
}
