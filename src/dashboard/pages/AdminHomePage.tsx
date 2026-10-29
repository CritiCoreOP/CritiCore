import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, CheckCircle2, MailWarning } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { timeAgo } from "@/lib/press";
import { cn } from "@/lib/utils";
import { useQueues, useSystemHealth } from "../data";
import { useDashboard } from "../context";
import { OVERDUE_HOURS, QUEUE_HREF, QUEUE_KINDS } from "../inbox";
import { NAV, QUEUE_ICON } from "../nav";
import { InboxPanel } from "../panels";
import { PageHeader, Panel, focusRing } from "../ui";

export default function AdminHomePage() {
  const { t } = useTranslation();
  const { isAdmin } = useDashboard();
  const queues = useQueues(isAdmin);
  const health = useSystemHealth(isAdmin);
  const tools = NAV.filter((g) => g.adminOnly).flatMap((g) => g.items.filter((i) => i.id !== "adminHome"));

  return (
    <div className="grid gap-6">
      <PageHeader title={t("dash.nav.adminHome")} description={t("dash.admin.intro")} />

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label={t("dash.admin.queues")}>
        {QUEUE_KINDS.map((kind) => {
          const q = queues.data?.find((r) => r.kind === kind);
          const oldest = q?.rows[0]?.at;
          const overdue = !!oldest && Date.now() - new Date(oldest).getTime() >= OVERDUE_HOURS * 3_600_000;
          const Icon = QUEUE_ICON[kind];
          return (
            <li key={kind}>
              <Link to={QUEUE_HREF[kind]} className={cn("flex h-full flex-col gap-1 rounded-2xl border border-border/50 bg-card/40 p-4 transition-colors hover:bg-card/70", focusRing)}>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t(`dash.queues.${kind}`)}
                </span>
                <span className={cn("text-3xl font-semibold tabular-nums text-foreground", queues.isLoading && "animate-pulse text-muted-foreground motion-reduce:animate-none")}>{q?.count ?? 0}</span>
                <span className={cn("text-xs", overdue ? "font-medium text-amber-500" : "text-muted-foreground")}>
                  {oldest ? t("dash.admin.oldest", { when: timeAgo(oldest) }) : t("dash.admin.none")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <InboxPanel results={queues.data} loading={queues.isLoading} error={queues.isError} limit={20} />
        <div className="grid gap-6">
          <Panel title={t("dash.admin.health")}>
            <ul className="grid gap-3 text-sm">
              <li className="flex items-start gap-3">
                {health.data?.failedMails ? <MailWarning className="mt-0.5 h-4 w-4 text-amber-500" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" aria-hidden="true" />}
                <span>
                  <span className="block font-medium text-foreground">{t("dash.admin.mails")}</span>
                  <span className="block text-muted-foreground">
                    {health.isLoading
                      ? t("dash.loading")
                      : health.data?.failedMails === null
                        ? t("dash.admin.mailsUnavailable")
                        : t("dash.admin.mailsFailed", { count: health.data?.failedMails ?? 0 })}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                {health.data?.incidents.length ? <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" aria-hidden="true" /> : <Activity className="mt-0.5 h-4 w-4 text-emerald-500" aria-hidden="true" />}
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{t("dash.admin.services")}</span>
                  {health.data?.incidents.length ? (
                    <ul className="mt-1 grid gap-1 text-muted-foreground">
                      {health.data.incidents.map((i) => (
                        <li key={i.id}>
                          {i.service_name}: {i.status}, {timeAgo(i.started_at)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="block text-muted-foreground">{t("dash.admin.servicesOk")}</span>
                  )}
                  <Link to="/status" className={cn("mt-1 inline-block text-xs text-primary hover:underline", focusRing)}>
                    {t("dash.admin.statusPage")}
                  </Link>
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title={t("dash.admin.tools")}>
            <ul className="grid grid-cols-2 gap-1">
              {tools.map((tool) => (
                <li key={tool.id}>
                  <Link to={tool.path} className={cn("flex items-center gap-2 rounded-[10px] px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted/50", focusRing)}>
                    <tool.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{t(...tool.label)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
