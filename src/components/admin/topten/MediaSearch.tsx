import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchGames, searchMovies, searchSeries, tmdbBackdrop, tmdbImage } from "@/lib/api";
import { pickTitle, searchAnilist } from "@/lib/anilist";
import type { Provider } from "./sources";
import type { TopTenWorld } from "./types";

export interface MediaHit {
  key: string;
  title: string;
  year: string;
  poster: string | null;
  backdrop: string | null;
}

async function search(world: TopTenWorld, provider: Provider, q: string): Promise<MediaHit[]> {
  if (world === "anime" && provider !== "tmdb") {
    const res = await searchAnilist(q, 1, 10);
    return res.Page.media
      .filter((a) => !a.isAdult)
      .map((a) => ({
        key: `a${a.id}`,
        title: pickTitle(a.title, "romaji"),
        year: a.seasonYear ? String(a.seasonYear) : "",
        poster: a.coverImage.extraLarge || a.coverImage.large,
        backdrop: a.bannerImage,
      }));
  }
  if (world === "games") {
    const games = await searchGames(q);
    return games.map((g) => ({
      key: `g${g.id}`,
      title: g.name,
      year: g.released?.slice(0, 4) ?? "",
      poster: g.background_image,
      backdrop: g.short_screenshots?.[0]?.image || null,
    }));
  }
  // Anime from a TMDB list are searched in TMDB's TV catalogue, so the pictures match
  const rows = world === "movies" ? await searchMovies(q) : await searchSeries(q);
  return rows.slice(0, 10).map((m) => ({
    key: `${world}${m.id}`,
    title: m.title || m.name || "",
    year: (m.release_date || m.first_air_date || "").slice(0, 4),
    poster: tmdbImage(m.poster_path, "w500"),
    backdrop: tmdbBackdrop(m.backdrop_path, "w1280"),
  }));
}

/** Finds a title in the data source of the chosen world and hands back its pictures */
export default function MediaSearch({ world, provider, initial, onPick }: { world: TopTenWorld; provider: Provider; initial: string; onPick: (hit: MediaHit) => void }) {
  const { t } = useTranslation();
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<MediaHit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setState("loading");
    const timer = window.setTimeout(() => {
      search(world, provider, term)
        .then((r) => {
          if (cancelled) return;
          setHits(r);
          setState("idle");
        })
        .catch(() => !cancelled && setState("error"));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, world, provider]);

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.topten.searchPlaceholder")} className="pl-8" aria-label={t("admin.topten.search")} />
      </div>
      <div className="max-h-72 overflow-y-auto" aria-live="polite">
        {state === "loading" && (
          <p className="flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t("admin.topten.searching")}
          </p>
        )}
        {state === "error" && <p className="px-1 py-3 text-sm text-destructive">{t("admin.topten.searchError")}</p>}
        {state === "idle" && q.trim().length >= 2 && hits.length === 0 && <p className="px-1 py-3 text-sm text-muted-foreground">{t("admin.topten.noResults")}</p>}
        <ul className="grid gap-1">
          {hits.map((hit) => (
            <li key={hit.key}>
              <button
                type="button"
                onClick={() => onPick(hit)}
                className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
                  {hit.poster && <img src={hit.poster} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{hit.title}</span>
                  {hit.year && <span className="block text-xs text-muted-foreground">{hit.year}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
