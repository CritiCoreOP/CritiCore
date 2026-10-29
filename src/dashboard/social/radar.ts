import { fetchIgdb, fetchTmdb, igdbImage, tmdbBackdrop, tmdbImage } from "@/lib/api";
import type { TopTenWorld } from "@/components/admin/topten/types";

/** What comes out in the next two weeks, per world, most awaited first */

export interface RadarItem {
  key: string;
  title: string;
  /** Release day, YYYY-MM-DD */
  date: string;
  poster: string | null;
  backdrop: string | null;
  /** Canonical path of the detail page on CritiCore */
  path: string;
}

export const RADAR_WORLDS: TopTenWorld[] = ["movies", "series", "anime", "games"];
export const RADAR_DAYS = 14;

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const REGION: Record<string, string> = { de: "DE", en: "US", fr: "FR", es: "ES", th: "TH" };

interface TmdbRow {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

async function tmdb(kind: "movie" | "tv", params: Record<string, string>, path: string): Promise<RadarItem[]> {
  const res = await fetchTmdb<{ results: TmdbRow[] }>(`/discover/${kind}`, { sort_by: "popularity.desc", ...params });
  return res.results
    .filter((r) => r.poster_path)
    .map((r) => ({
      key: `tmdb-${kind}-${r.id}`,
      title: r.title || r.name || "",
      date: (r.release_date || r.first_air_date || "").slice(0, 10),
      poster: tmdbImage(r.poster_path, "w500"),
      backdrop: tmdbBackdrop(r.backdrop_path, "w1280"),
      path: `${path}/${r.id}`,
    }));
}

interface IgdbRow {
  id: number;
  name: string;
  first_release_date?: number;
  cover?: { image_id?: string };
  artworks?: { image_id?: string }[];
  screenshots?: { image_id?: string }[];
  themes?: { slug?: string }[];
}

export async function loadRadar(world: TopTenWorld, lang: string, now = Date.now()): Promise<RadarItem[]> {
  const from = isoDay(now);
  const to = isoDay(now + RADAR_DAYS * DAY);
  if (world === "movies") {
    return tmdb("movie", { region: REGION[lang] ?? "DE", with_release_type: "2|3", "release_date.gte": from, "release_date.lte": to }, "/filme");
  }
  if (world === "series") {
    // New shows; news and talk shows would crowd out the series people wait for
    return tmdb("tv", { "first_air_date.gte": from, "first_air_date.lte": to, without_genres: "10763,10767" }, "/serien");
  }
  if (world === "anime") {
    return tmdb("tv", { with_genres: "16", with_origin_country: "JP", "first_air_date.gte": from, "first_air_date.lte": to }, "/serien");
  }
  const start = Math.floor(now / 1000);
  const rows = await fetchIgdb<IgdbRow[]>(
    "/games",
    `fields name,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,themes.slug; where first_release_date >= ${start} & first_release_date <= ${start + RADAR_DAYS * 86400} & cover != null & version_parent = null; sort hypes desc; limit 30;`,
  );
  return (rows ?? [])
    .filter((g) => !(g.themes ?? []).some((t) => t.slug === "erotic"))
    .map((g) => ({
      key: `igdb-${g.id}`,
      title: g.name,
      date: g.first_release_date ? isoDay(g.first_release_date * 1000) : "",
      poster: igdbImage(g.cover?.image_id, "t_cover_big_2x"),
      backdrop: igdbImage(g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id, "t_1080p"),
      path: `/games/${g.id}`,
    }));
}
