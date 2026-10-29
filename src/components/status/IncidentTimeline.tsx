import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { redactUrls } from "@/lib/sanitize";

/** Changes shown per service before "show all" */
const VISIBLE_PER_SERVICE = 5;

type Status = "operational" | "degraded" | "down" | "unconfigured";

interface StatusEvent {
  id: string;
  service_id: string;
  service_name: string;
  status: Status;
  detail: string | null;
  started_at: string;
  ended_at: string | null;
}

const DOT: Record<Status, string> = {
  operational: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
  unconfigured: "bg-muted-foreground",
};

const TEXT: Record<Status, string> = {
  operational: "text-emerald-400",
  degraded: "text-amber-400",
  down: "text-red-400",
  unconfigured: "text-muted-foreground",
};

/** Formats a duration in ms as "1 h 04 m" / "12 m" / "45 s". */
function formatDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d} d ${String(h % 24).padStart(2, "0")} h`;
  return `${h} h ${String(m % 60).padStart(2, "0")} m`;
}

const IncidentTimeline = ({ refreshKey }: { refreshKey?: string }) => {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["api-status-timeline", refreshKey ?? null],
    queryFn: async (): Promise<StatusEvent[]> => {
      const { data, error } = await supabase
        .from("api_status_events")
        .select("id, service_id, service_name, status, detail, started_at, ended_at")
        .order("started_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as StatusEvent[];
    },
    staleTime: 30_000,
  });

  const events = data ?? [];

  const grouped = events.reduce<Record<string, StatusEvent[]>>((acc, e) => {
    (acc[e.service_id] ??= []).push(e);
    return acc;
  }, {});

  const serviceIds = Object.keys(grouped);

  const label = (s: Status) => t(`status.state.${s}`, { defaultValue: s });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="mt-10">
      <h2 className="text-lg font-display font-semibold mb-1">
        {t("status.timeline.title", "Incident-Timeline")}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t(
          "status.timeline.subtitle",
          "Statuswechsel je Abhängigkeit mit Zeitstempel und Dauer.",
        )}
      </p>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg border border-border/60 bg-card animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && serviceIds.length === 0 && (
        <div className="rounded-lg border border-border/60 bg-card p-5 text-sm text-muted-foreground">
          {t("status.timeline.empty", "Noch keine Statuswechsel aufgezeichnet.")}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2 items-start">
        {serviceIds.map((id) => {
          const all = grouped[id];
          const list = expanded[id] ? all : all.slice(0, VISIBLE_PER_SERVICE);
          return (
            <div
              key={id}
              className="rounded-lg border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", DOT[all[0].status])} />
                <h3 className="font-medium truncate">
                  {t(`status.service.${id}`, { defaultValue: all[0].service_name })}
                </h3>
              </div>

              <ol className="relative pl-4 border-l border-border/60 space-y-3">
                {list.map((e) => {
                  const end = e.ended_at ? new Date(e.ended_at).getTime() : Date.now();
                  const duration = end - new Date(e.started_at).getTime();
                  return (
                    <li key={e.id} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-2 ring-card",
                          DOT[e.status],
                        )}
                      />
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className={cn("text-xs font-semibold", TEXT[e.status])}>
                          {label(e.status)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {fmtTime(e.started_at)}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDuration(duration)}
                          {!e.ended_at && ` (${t("status.timeline.ongoing", "laufend")})`}
                        </span>
                      </div>
                      {e.detail && e.status !== "operational" && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">{redactUrls(e.detail)}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
              {all.length > VISIBLE_PER_SERVICE && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))}
                  aria-expanded={!!expanded[id]}
                  className="mt-3 -mb-1 py-1.5 text-xs font-medium text-primary hover:underline"
                >
                  {expanded[id]
                    ? t("status.timeline.showLess", "Weniger anzeigen")
                    : t("status.timeline.showAll", { count: all.length, defaultValue: "Alle {{count}} anzeigen" })}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default IncidentTimeline;
