import { useTranslation } from "react-i18next";
import { callEdge } from "@/lib/edgeCall";
import { useQuery } from "@tanstack/react-query";
import Footer from "@/components/Footer";
import IncidentTimeline from "@/components/status/IncidentTimeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { redactUrls } from "@/lib/sanitize";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  RefreshCw,
  Activity,
} from "lucide-react";

type Status = "operational" | "degraded" | "down" | "unconfigured";

interface Check {
  id: string;
  name: string;
  status: Status;
  latency_ms: number | null;
  detail?: string;
}

interface StatusResponse {
  overall: Status;
  checked_at: string;
  checks: Check[];
}

const STATUS_META: Record<Status, { icon: typeof CheckCircle2; color: string; dot: string }> = {
  operational: { icon: CheckCircle2, color: "text-emerald-400", dot: "bg-emerald-400" },
  degraded: { icon: AlertTriangle, color: "text-amber-400", dot: "bg-amber-400" },
  down: { icon: XCircle, color: "text-red-400", dot: "bg-red-400" },
  unconfigured: { icon: MinusCircle, color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

const StatusPage = () => {
  const { t, i18n } = useTranslation();

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["api-status"],
    queryFn: async (): Promise<StatusResponse> => {
      // Through Cloudflare's cache: one Supabase call per two minutes and data centre, not per visitor
      return callEdge<StatusResponse>("api-status");
    },
    // The function serves a snapshot that is at most 3 minutes old
    refetchInterval: 3 * 60_000,
    staleTime: 30_000,
  });

  const label = (s: Status) =>
    t(`status.state.${s}`, {
      defaultValue: {
        operational: "Operational",
        degraded: "Degraded",
        down: "Down",
        unconfigured: "Not configured",
      }[s],
    });

  const overall = data?.overall;
  const OverallIcon = overall ? STATUS_META[overall].icon : Activity;

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <header className="mb-8">
            <p className="text-xs uppercase tracking-widest text-primary mb-2">
              {t("status.kicker", "System")}
            </p>
            <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">
              {t("status.title", "API-Status")}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("status.subtitle", "Live-Übersicht über alle Dienste und externen APIs, die CritiCore nutzt.")}
            </p>
          </header>

          {/* Overall */}
          <div className="rounded-lg border border-border/60 bg-card p-5 shadow-[var(--shadow-card)] mb-6">
            <div className="flex items-center gap-4">
              <OverallIcon
                className={cn("h-8 w-8 shrink-0", overall ? STATUS_META[overall].color : "text-muted-foreground")}
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug break-words">
                  {error
                    ? t("status.unreachable", "Status konnte nicht geladen werden")
                    : overall
                      ? t(`status.overall.${overall}`, {
                          defaultValue: {
                            operational: "Alle Systeme funktionieren",
                            degraded: "Teilweise beeinträchtigt",
                            down: "Störung erkannt",
                            unconfigured: "Unbekannt",
                          }[overall],
                        })
                      : t("common.loading", "Lädt…")}
                </p>
                {data?.checked_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("status.lastChecked", "Zuletzt geprüft")}:{" "}
                    {new Date(data.checked_at).toLocaleTimeString(i18n.language)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-md shrink-0"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
                {t("status.refresh", "Prüfen")}
              </Button>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-3">
            {(data?.checks ?? []).map((c) => {
              const meta = STATUS_META[c.status];
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-border/60 bg-card p-4 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", meta.dot)} />
                    <span className="font-medium flex-1 min-w-0 leading-snug break-words">
                      {t(`status.service.${c.id}`, { defaultValue: c.name })}
                    </span>
                    {c.latency_ms != null && (
                      <span className="text-xs text-muted-foreground tabular-nums">{c.latency_ms} ms</span>
                    )}
                    <span className={cn("text-xs font-semibold", meta.color)}>{label(c.status)}</span>
                  </div>
                  {c.detail && c.status !== "operational" && (
                    <p className="text-xs text-muted-foreground mt-2 pl-6 break-words">{redactUrls(c.detail)}</p>
                  )}
                </div>
              );
            })}

            {!data && !error && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg border border-border/60 bg-card animate-pulse" />
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            {t("status.note", "Der Status wird bei jedem Aufruf live gemessen und alle 60 Sekunden aktualisiert.")}
          </p>

          <IncidentTimeline refreshKey={data?.checked_at} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StatusPage;
