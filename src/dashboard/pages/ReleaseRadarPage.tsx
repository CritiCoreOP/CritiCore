import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ListOrdered } from "lucide-react";
import i18n from "@/i18n";
import { useLocalePath, useNavigate } from "@/lib/locale-router";
import { getLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { emptyTopTen, filledEntries, loadDraft, MAX_ENTRIES, newEntry, saveDraft, type TopTenWorld } from "@/components/admin/topten/types";
import { loadRadar, RADAR_DAYS, RADAR_WORLDS, type RadarItem } from "../social/radar";
import { EmptyState, PageHeader, focusRing } from "../ui";

const day = (iso: string, options: Intl.DateTimeFormatOptions) => (iso ? new Intl.DateTimeFormat(getLocale(), options).format(new Date(`${iso}T12:00:00`)) : "");

export default function ReleaseRadarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const localePath = useLocalePath();
  const [world, setWorld] = useState<TopTenWorld>("movies");
  const lang = i18n.language;
  const radar = useQuery({
    queryKey: ["dash", "radar", world, lang],
    staleTime: 30 * 60_000,
    queryFn: () => loadRadar(world, lang),
  });
  const items = radar.data ?? [];

  // The first ten become a Top 10 draft, then the editor opens with it
  const toTopTen = (list: RadarItem[]) => {
    const current = loadDraft();
    if (current && filledEntries(current).length > 0 && !window.confirm(t("dash.radar.replaceDraft"))) return;
    const now = Date.now();
    // formatRange is in every current browser, only missing from this TypeScript lib
    const format = new Intl.DateTimeFormat(getLocale(), { day: "numeric", month: "long" }) as Intl.DateTimeFormat & { formatRange: (a: Date, b: Date) => string };
    const range = format.formatRange(new Date(now), new Date(now + RADAR_DAYS * 86_400_000));
    const entries = list.slice(0, MAX_ENTRIES).map((item) => ({
      ...newEntry(),
      id: item.key,
      title: item.title,
      subtitle: day(item.date, { weekday: "short", day: "numeric", month: "short" }),
      poster: item.poster,
      backdrop: item.backdrop,
    }));
    saveDraft({
      ...emptyTopTen(lang),
      world,
      title: t(world === "games" ? "admin.topten.autoTitles.anticipated" : "admin.topten.autoTitles.upcoming", { world: t(`admin.topten.worlds.${world}`) }),
      period: range,
      footer: t("admin.topten.footerFrom", { provider: world === "games" ? "IGDB" : "TMDB", list: t("dash.nav.radar") }),
      showValues: false,
      entries: [...entries, ...Array.from({ length: Math.max(0, MAX_ENTRIES - entries.length) }, newEntry)],
    });
    navigate("/dashboard/social/top10");
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("dash.nav.radar")}
        description={t("dash.radar.intro", { count: RADAR_DAYS })}
        actions={
          <Button type="button" onClick={() => toTopTen(items)} disabled={items.length === 0} className="gap-1.5">
            <ListOrdered className="h-4 w-4" aria-hidden="true" />
            {t("dash.radar.toTopTen")}
          </Button>
        }
      />

      <div role="tablist" aria-label={t("admin.topten.world")} className="flex flex-wrap gap-1.5">
        {RADAR_WORLDS.map((w) => (
          <button
            key={w}
            type="button"
            role="tab"
            aria-selected={world === w}
            onClick={() => setWorld(w)}
            className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors", focusRing, world === w ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}
          >
            {t(`admin.topten.worlds.${w}`)}
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={t(`admin.topten.worlds.${world}`)} aria-busy={radar.isLoading}>
        {radar.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted/50 motion-reduce:animate-none" />
            ))}
          </div>
        ) : radar.isError ? (
          <p className="text-sm text-destructive">{t("dash.loadError")}</p>
        ) : items.length === 0 ? (
          <EmptyState icon={<CalendarClock className="h-7 w-7" />} title={t("dash.radar.empty")} />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item, i) => (
              <li key={item.key}>
                <a href={localePath(item.path)} target="_blank" rel="noopener noreferrer" className={cn("group grid gap-2 rounded-xl", focusRing)}>
                  <span className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                    {item.poster && <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />}
                    {i < MAX_ENTRIES && (
                      <span className="absolute left-2 top-2 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground backdrop-blur">{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{day(item.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
