import { useTranslation } from "react-i18next";
import { Calendar, Clock, AlertTriangle, XCircle } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";
import type { MediaRelease } from "@/hooks/useCategories";

interface ReleaseTimelineProps {
  releases: MediaRelease[];
  isLoading?: boolean;
}

const statusConfig: Record<string, { icon: typeof Calendar; color: string; label: string }> = {
  released: { icon: Calendar, color: "text-score-high", label: "explore.statusReleased" },
  upcoming: { icon: Clock, color: "text-primary", label: "explore.statusUpcoming" },
  delayed: { icon: AlertTriangle, color: "text-score-mid", label: "explore.statusDelayed" },
  cancelled: { icon: XCircle, color: "text-destructive", label: "explore.statusCancelled" },
};

const mediaTypeRoute: Record<string, string> = {
  movie: "filme",
  series: "serien",
  game: "games",
};

const ReleaseTimeline = ({ releases, isLoading }: ReleaseTimelineProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-secondary/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!releases.length) {
    return <p className="text-muted-foreground text-center py-8">{t("explore.noReleases")}</p>;
  }

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = releases.filter(r => r.status === "upcoming" || (r.release_date && r.release_date > now));
  const past = releases.filter(r => r.status !== "upcoming" && (!r.release_date || r.release_date <= now));

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {t("explore.comingSoon")}
          </h3>
          <div className="relative border-l-2 border-primary/30 ml-3 space-y-4">
            {upcoming.map(r => (
              <ReleaseItem key={r.id} release={r} />
            ))}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-score-high" />
            {t("explore.alreadyReleased")}
          </h3>
          <div className="relative border-l-2 border-border ml-3 space-y-4">
            {past.map(r => (
              <ReleaseItem key={r.id} release={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ReleaseItem = ({ release }: { release: MediaRelease }) => {
  const { t } = useTranslation();
  const config = statusConfig[release.status] || statusConfig.released;
  const Icon = config.icon;
  const route = mediaTypeRoute[release.media_type] || "filme";

  return (
    <div className="relative pl-6 group">
      <div className={cn("absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 border-background", config.color === "text-primary" ? "bg-primary" : config.color === "text-score-high" ? "bg-score-high" : config.color === "text-score-mid" ? "bg-score-mid" : "bg-destructive")} />
      <Link
        to={`/${route}/${release.media_id}`}
        className="block p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={cn("w-4 h-4 shrink-0", config.color)} />
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
              {release.media_type}
            </span>
            <span className="text-sm text-foreground truncate">
              ID: {release.media_id}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-xs font-medium", config.color)}>
              {t(config.label)}
            </span>
            {release.release_date && (
              <span className="text-xs text-muted-foreground">
                {new Date(release.release_date).toLocaleDateString()}
              </span>
            )}
            {release.region !== "global" && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                {release.region}
              </span>
            )}
          </div>
        </div>
        {release.notes && (
          <p className="text-xs text-muted-foreground mt-1.5">{release.notes}</p>
        )}
      </Link>
    </div>
  );
};

export default ReleaseTimeline;
