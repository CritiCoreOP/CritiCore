import { useEffect, useState } from "react";
import { callEdge } from "@/lib/edgeCall";
import { isBot } from "@/lib/bot";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { getCurrentLocale } from "@/lib/localeRouting";

type Status = "operational" | "degraded" | "down" | "unconfigured";

interface Check {
  id: string;
  name: string;
  status: Status;
}

interface StatusResponse {
  overall: Status;
  checked_at: string;
  checks: Check[];
}

const DISMISS_KEY = "status-banner-dismissed";

// OMDb (extra ratings) and TVDB (extra series data) only add details; pages work without them.
// Their outages show on /status, not as a warning on every page.
const OPTIONAL_SERVICES = new Set(["omdb", "tvdb"]);

/**
 * Shows a red banner below the header whenever a dependency is down.
 * Polls in the background, so the message updates and the banner disappears
 * on its own once every service is healthy again — no reload needed.
 * Dismissal is remembered per incident signature (affected services).
 */
const StatusBanner = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  const { data } = useQuery({
    queryKey: ["api-status"],
    // Crawlers do not need the outage banner
    enabled: !isBot(),
    queryFn: async (): Promise<StatusResponse> => {
      // Through Cloudflare's cache: one Supabase call per two minutes and data centre, not per visitor
      return callEdge<StatusResponse>("api-status");
    },
    // Runs for every visitor on every page; outages last minutes, not seconds
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 3 * 60_000,
    retry: false,
  });

  const affected = (data?.checks ?? []).filter((c) => c.status === "down" && !OPTIONAL_SERVICES.has(c.id));
  const signature = affected.map((c) => c.id).sort().join(",");

  // Reset the dismissal as soon as everything recovered, so a new
  // incident later on shows the banner again.
  useEffect(() => {
    if (!data || affected.length > 0) return;
    try {
      sessionStorage.removeItem(DISMISS_KEY);
    } catch {
      /* ignore */
    }
    setDismissed(null);
  }, [data, affected.length]);

  if (affected.length === 0) return null;
  if (dismissed === signature) return null;


  const names = affected
    .map((c) => t(`status.service.${c.id}`, { defaultValue: c.name }))
    .join(", ");

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, signature);
    } catch {
      /* ignore */
    }
    setDismissed(signature);
  };

  return (
    <div className="fixed top-14 lg:top-16 left-0 right-0 z-40 px-3 pt-2 pointer-events-none">
      <div className="mx-auto max-w-5xl rounded-lg border border-red-500/40 bg-red-950/95 text-red-50 shadow-[var(--shadow-card-hover)] pointer-events-auto animate-fade-in">
        <div className="flex items-start gap-3 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-300" strokeWidth={2} />
          <p className="text-xs sm:text-sm flex-1 min-w-0">
            <span className="font-semibold">
              {t("status.banner.title", "Störung erkannt")}
            </span>{" "}
            <span className="text-red-100/90">
              {t("status.banner.body", "{{services}} ist aktuell nicht erreichbar.", {
                services: names,
                count: affected.length,
              })}
            </span>{" "}
            <Link
              to={`/${getCurrentLocale()}/status`}
              className="underline underline-offset-2 hover:text-white"
            >
              {t("status.banner.link", "Status ansehen")}
            </Link>
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("common.close", "Schließen")}
            className="shrink-0 rounded-md p-1 text-red-200 hover:text-white hover:bg-red-900/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusBanner;
