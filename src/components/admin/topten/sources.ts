import { supabase } from "@/integrations/supabase/client";
import { fetchIgdb, fetchTmdb, igdbImage, tmdbBackdrop, tmdbImage } from "@/lib/api";
import { currentSeason, getAnilistPopular, getAnilistSeasonal, getAnilistTrending, type AnilistMedia } from "@/lib/anilist";
import type { TopTenWorld } from "./types";

/** One place as a data source delivers it, already in the language of the graphic */
export interface SourceItem {
  key: string;
  title: string;
  subtitle: string;
  poster: string | null;
  backdrop: string | null;
  value: string;
  /** Number of CritiCore reviews; the subtitle then says how many */
  reviews?: number;
}

export type Provider = "anilist" | "tmdb" | "igdb" | "criticore";

/** What the list is; names the list in the picker and words the heading */
export type ListKind =
  | "trending"
  | "trendingDay"
  | "popularNow"
  | "season"
  | "popularAllTime"
  | "airing"
  | "cinema"
  | "upcoming"
  | "topRated"
  | "steamPlayers"
  | "recentTop"
  | "anticipated"
  | "mostReviewed"
  | "bestRated";

/** The line under the heading: this week, today, the anime season, this month, or nothing */
export type PeriodKind = "week" | "day" | "season" | "month" | "none";

export interface TopTenSource {
  id: string;
  world: TopTenWorld;
  provider: Provider;
  kind: ListKind;
  period: PeriodKind;
  /** Storage key of the comparison list from before lists could be chosen */
  legacyKey?: string;
  load: (lang: string) => Promise<SourceItem[]>;
}

export const PROVIDER_NAMES: Record<Provider, string> = { anilist: "AniList", tmdb: "TMDB", igdb: "IGDB", criticore: "CritiCore" };

const DAY = 24 * 3600 * 1000;
const TMDB_LOCALE: Record<string, string> = { de: "de-DE", en: "en-US", fr: "fr-FR", es: "es-ES", th: "th-TH" };
const REGION: Record<string, string> = { de: "DE", en: "US", fr: "FR", es: "ES", th: "TH" };
const tmdbLocale = (lang: string) => TMDB_LOCALE[lang] ?? "en-US";
const region = (lang: string) => REGION[lang] ?? "US";
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const decimal = (lang: string, n: number) => new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
const whole = (lang: string, n: number) => new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(n);
const joined = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");

/* ── TMDB ─────────────────────────────────────────────────────────────────── */

interface TmdbRow {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
}

type TmdbKind = "movie" | "tv";

async function tmdbGenres(kind: TmdbKind, lang: string): Promise<Map<number, string>> {
  try {
    const res = await fetchTmdb<{ genres: { id: number; name: string }[] }>(`/genre/${kind}/list`, undefined, tmdbLocale(lang));
    return new Map(res.genres.map((g) => [g.id, g.name]));
  } catch {
    return new Map();
  }
}

function tmdbItem(row: TmdbRow, kind: TmdbKind, lang: string, genres: Map<number, string>): SourceItem {
  const genre = row.genres?.[0]?.name ?? (row.genre_ids?.[0] !== undefined ? genres.get(row.genre_ids[0]) : undefined);
  // A handful of votes is no rating yet
  const rated = (row.vote_count ?? 0) >= 20 && row.vote_average;
  return {
    key: `tmdb-${kind}-${row.id}`,
    title: row.title || row.name || "",
    subtitle: joined([genre, (row.release_date || row.first_air_date || "").slice(0, 4)]),
    poster: tmdbImage(row.poster_path, "w500"),
    backdrop: tmdbBackdrop(row.backdrop_path, "w1280"),
    value: rated ? decimal(lang, row.vote_average!) : "",
  };
}

/** A TMDB list endpoint, best first */
const tmdbList = (kind: TmdbKind, endpoint: string, params: (lang: string) => Record<string, string> = () => ({})) => async (lang: string) => {
  const [res, genres] = await Promise.all([
    fetchTmdb<{ results: TmdbRow[] }>(endpoint, params(lang), tmdbLocale(lang)),
    tmdbGenres(kind, lang),
  ]);
  return res.results.filter((r) => r.poster_path).map((r) => tmdbItem(r, kind, lang, genres));
};

// Japanese animation on TMDB: the anime of its TV catalogue
const ANIME = { with_genres: "16", with_origin_country: "JP" };

/* ── AniList ──────────────────────────────────────────────────────────────── */

const anilistItems = (media: AnilistMedia[], lang: string): SourceItem[] =>
  media
    .filter((a) => !a.isAdult)
    .map((a) => ({
      key: `anilist-${a.id}`,
      title: a.title.english || a.title.romaji || a.title.userPreferred || "",
      subtitle: joined((a.genres ?? []).slice(0, 2)),
      poster: a.coverImage.extraLarge || a.coverImage.large,
      backdrop: a.bannerImage,
      value: a.averageScore ? decimal(lang, a.averageScore / 10) : "",
    }));

/* ── IGDB ─────────────────────────────────────────────────────────────────── */

interface IgdbRow {
  id: number;
  name: string;
  cover?: { image_id?: string };
  screenshots?: { image_id?: string }[];
  artworks?: { image_id?: string }[];
  total_rating?: number;
  first_release_date?: number;
  platforms?: { abbreviation?: string; name?: string }[];
  themes?: { slug?: string }[];
}

const IGDB_FIELDS =
  "fields name,cover.image_id,screenshots.image_id,artworks.image_id,total_rating,first_release_date,platforms.abbreviation,platforms.name,themes.slug";

function igdbItem(g: IgdbRow, value: string, subtitle?: string): SourceItem {
  const platforms = Array.from(new Set((g.platforms ?? []).map((p) => p.abbreviation || p.name).filter(Boolean))).slice(0, 3);
  return {
    key: `igdb-${g.id}`,
    title: g.name,
    subtitle: subtitle ?? joined(platforms),
    poster: igdbImage(g.cover?.image_id, "t_cover_big_2x"),
    backdrop: igdbImage(g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id, "t_1080p"),
    value,
  };
}

const usable = (g: IgdbRow) => !!g.cover?.image_id && !(g.themes ?? []).some((t) => t.slug === "erotic");

const igdbGames = (where: string, sort: string) =>
  fetchIgdb<IgdbRow[]>("/games", `${IGDB_FIELDS}; where ${where} & cover != null & version_parent = null; sort ${sort}; limit 30;`).then((rows) =>
    (rows ?? []).filter(usable),
  );

/** Steam's 24-hour player peak, as IGDB collects it (popularity type 5) */
async function steamPlayers(lang: string): Promise<SourceItem[]> {
  const prims = await fetchIgdb<{ game_id: number; value: number }[]>(
    "/popularity_primitives",
    "fields game_id,value; where popularity_type = 5; sort value desc; limit 30;",
  );
  const peak = new Map<number, number>();
  for (const p of prims ?? []) if (!peak.has(p.game_id)) peak.set(p.game_id, p.value);
  if (!peak.size) return [];
  const rows = await fetchIgdb<IgdbRow[]>("/games", `${IGDB_FIELDS}; where id = (${[...peak.keys()].join(",")}); limit 30;`);
  return (rows ?? [])
    .filter(usable)
    .sort((a, b) => (peak.get(b.id) ?? 0) - (peak.get(a.id) ?? 0))
    .map((g) => igdbItem(g, whole(lang, peak.get(g.id) ?? 0)));
}

async function recentTop(lang: string): Promise<SourceItem[]> {
  const now = Math.floor(Date.now() / 1000);
  const rows = await igdbGames(`first_release_date >= ${now - 183 * 86400} & first_release_date <= ${now} & total_rating_count >= 5`, "total_rating desc");
  return rows.map((g) => igdbItem(g, g.total_rating ? decimal(lang, g.total_rating / 10) : ""));
}

async function anticipated(lang: string): Promise<SourceItem[]> {
  const now = Math.floor(Date.now() / 1000);
  const month = new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" });
  const rows = await igdbGames(`hypes > 0 & (first_release_date > ${now} | first_release_date = null)`, "hypes desc");
  // The release month is the news for a game that is not out yet
  return rows.map((g) => igdbItem(g, "", g.first_release_date ? month.format(g.first_release_date * 1000) : undefined));
}

/* ── CritiCore reviews ────────────────────────────────────────────────────── */

type ReviewType = "movie" | "series" | "game";

/** Ranked by the reviews on CritiCore: the most reviewed of the last 30 days, or the best average */
const community = (type: ReviewType, mode: "reviewed" | "best") => async (lang: string): Promise<SourceItem[]> => {
  let query = supabase.from("reviews").select("media_id, score").eq("media_type", type).is("season_number", null).limit(5000);
  if (mode === "reviewed") query = query.gte("created_at", new Date(Date.now() - 30 * DAY).toISOString());
  const { data, error } = await query;
  if (error) throw error;

  const tally = new Map<string, { sum: number; count: number }>();
  for (const r of data ?? []) {
    const t = tally.get(r.media_id) ?? { sum: 0, count: 0 };
    t.sum += Number(r.score);
    t.count += 1;
    tally.set(r.media_id, t);
  }
  const ranked = [...tally.entries()]
    .map(([id, t]) => ({ id, count: t.count, avg: t.sum / t.count }))
    // One review is an opinion, not a community score
    .filter((m) => mode === "reviewed" || m.count >= 2)
    .sort((a, b) => (mode === "reviewed" ? b.count - a.count || b.avg - a.avg : b.avg - a.avg || b.count - a.count))
    .slice(0, 12);
  if (!ranked.length) return [];

  const details = await resolveTitles(type, ranked.map((m) => m.id), lang);
  return ranked.flatMap((m) => {
    const item = details.get(m.id);
    return item ? [{ ...item, key: `criticore-${type}-${m.id}`, value: decimal(lang, m.avg), reviews: m.count }] : [];
  });
};

/** Titles and pictures of the reviewed media; a title that no longer resolves is left out */
async function resolveTitles(type: ReviewType, ids: string[], lang: string): Promise<Map<string, SourceItem>> {
  if (type === "game") {
    const numeric = ids.filter((id) => /^\d+$/.test(id));
    if (!numeric.length) return new Map();
    const rows = await fetchIgdb<IgdbRow[]>("/games", `${IGDB_FIELDS}; where id = (${numeric.join(",")}); limit ${numeric.length};`);
    return new Map((rows ?? []).filter(usable).map((g) => [String(g.id), igdbItem(g, "")]));
  }
  const kind: TmdbKind = type === "movie" ? "movie" : "tv";
  const settled = await Promise.allSettled(ids.map((id) => fetchTmdb<TmdbRow>(`/${kind}/${id}`, undefined, tmdbLocale(lang))));
  const out = new Map<string, SourceItem>();
  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value?.poster_path) out.set(ids[i], tmdbItem(r.value, kind, lang, new Map()));
  });
  return out;
}

/* ── The lists ────────────────────────────────────────────────────────────── */

export const SOURCES: TopTenSource[] = [
  // Anime
  { id: "anilist-trending", world: "anime", provider: "anilist", kind: "trending", period: "week", legacyKey: "admin-topten-last-anime", load: async (lang) => anilistItems((await getAnilistTrending(1, 20)).Page.media, lang) },
  {
    id: "anilist-season",
    world: "anime",
    provider: "anilist",
    kind: "season",
    period: "season",
    load: async (lang) => {
      const { season, year } = currentSeason();
      return anilistItems((await getAnilistSeasonal(season, year, 1, 20)).Page.media, lang);
    },
  },
  { id: "anilist-popular", world: "anime", provider: "anilist", kind: "popularAllTime", period: "none", load: async (lang) => anilistItems((await getAnilistPopular(1, 20)).Page.media, lang) },
  { id: "tmdb-anime-popular", world: "anime", provider: "tmdb", kind: "popularNow", period: "month", load: tmdbList("tv", "/discover/tv", () => ({ ...ANIME, sort_by: "popularity.desc" })) },
  {
    id: "tmdb-anime-airing",
    world: "anime",
    provider: "tmdb",
    kind: "airing",
    period: "week",
    load: tmdbList("tv", "/discover/tv", () => ({ ...ANIME, sort_by: "popularity.desc", "air_date.gte": isoDay(Date.now() - 7 * DAY), "air_date.lte": isoDay(Date.now() + 7 * DAY) })),
  },

  // Movies
  { id: "tmdb-movies-trending", world: "movies", provider: "tmdb", kind: "trending", period: "week", legacyKey: "admin-topten-last-movies", load: tmdbList("movie", "/trending/movie/week") },
  { id: "tmdb-movies-trending-day", world: "movies", provider: "tmdb", kind: "trendingDay", period: "day", load: tmdbList("movie", "/trending/movie/day") },
  { id: "tmdb-movies-popular", world: "movies", provider: "tmdb", kind: "popularNow", period: "month", load: tmdbList("movie", "/movie/popular", (lang) => ({ region: region(lang) })) },
  { id: "tmdb-movies-cinema", world: "movies", provider: "tmdb", kind: "cinema", period: "week", load: tmdbList("movie", "/movie/now_playing", (lang) => ({ region: region(lang) })) },
  {
    id: "tmdb-movies-upcoming",
    world: "movies",
    provider: "tmdb",
    kind: "upcoming",
    period: "month",
    // Cinema releases of the next three months in the graphic's country, most awaited first
    load: tmdbList("movie", "/discover/movie", (lang) => ({
      region: region(lang),
      sort_by: "popularity.desc",
      with_release_type: "2|3",
      "release_date.gte": isoDay(Date.now() + DAY),
      "release_date.lte": isoDay(Date.now() + 90 * DAY),
    })),
  },
  { id: "tmdb-movies-top-rated", world: "movies", provider: "tmdb", kind: "topRated", period: "none", load: tmdbList("movie", "/movie/top_rated") },
  { id: "criticore-movies-reviewed", world: "movies", provider: "criticore", kind: "mostReviewed", period: "month", load: community("movie", "reviewed") },
  { id: "criticore-movies-best", world: "movies", provider: "criticore", kind: "bestRated", period: "none", load: community("movie", "best") },

  // Series
  { id: "tmdb-series-trending", world: "series", provider: "tmdb", kind: "trending", period: "week", legacyKey: "admin-topten-last-series", load: tmdbList("tv", "/trending/tv/week") },
  { id: "tmdb-series-trending-day", world: "series", provider: "tmdb", kind: "trendingDay", period: "day", load: tmdbList("tv", "/trending/tv/day") },
  { id: "tmdb-series-popular", world: "series", provider: "tmdb", kind: "popularNow", period: "month", load: tmdbList("tv", "/tv/popular") },
  { id: "tmdb-series-airing", world: "series", provider: "tmdb", kind: "airing", period: "week", load: tmdbList("tv", "/tv/on_the_air") },
  { id: "tmdb-series-top-rated", world: "series", provider: "tmdb", kind: "topRated", period: "none", load: tmdbList("tv", "/tv/top_rated") },
  { id: "criticore-series-reviewed", world: "series", provider: "criticore", kind: "mostReviewed", period: "month", load: community("series", "reviewed") },
  { id: "criticore-series-best", world: "series", provider: "criticore", kind: "bestRated", period: "none", load: community("series", "best") },

  // Games
  { id: "igdb-steam-players", world: "games", provider: "igdb", kind: "steamPlayers", period: "day", legacyKey: "admin-topten-last-games", load: steamPlayers },
  { id: "igdb-recent-top", world: "games", provider: "igdb", kind: "recentTop", period: "month", load: recentTop },
  { id: "igdb-anticipated", world: "games", provider: "igdb", kind: "anticipated", period: "month", load: anticipated },
  { id: "criticore-games-reviewed", world: "games", provider: "criticore", kind: "mostReviewed", period: "month", load: community("game", "reviewed") },
  { id: "criticore-games-best", world: "games", provider: "criticore", kind: "bestRated", period: "none", load: community("game", "best") },
];

export const sourcesFor = (world: TopTenWorld) => SOURCES.filter((s) => s.world === world);

/** The chosen list, or the first one of the world when the choice belongs to another world */
export function sourceFor(world: TopTenWorld, id: string | undefined): TopTenSource {
  return SOURCES.find((s) => s.id === id && s.world === world) ?? sourcesFor(world)[0];
}

/** ISO week number, as calendars in Europe count it */
export function isoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { week: Math.ceil(((d.getTime() - start) / DAY + 1) / 7), year: d.getUTCFullYear() };
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Heading, period line and source line for a list, in the graphic's language (`tr` is fixed to it) */
export function autoTexts(source: TopTenSource, lang: string, tr: Translate, now = new Date()): { title: string; period: string; footer: string } {
  let period = "";
  if (source.period === "week") period = tr("admin.topten.periodWeek", isoWeek(now));
  else if (source.period === "day") period = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(now);
  else if (source.period === "month") period = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(now);
  else if (source.period === "season") {
    const { season, year } = currentSeason(now);
    period = `${tr(`admin.topten.seasons.${season}`)} ${year}`;
  }
  return {
    title: tr(`admin.topten.autoTitles.${source.kind}`, { world: tr(`admin.topten.worlds.${source.world}`) }),
    period,
    footer: tr("admin.topten.footerFrom", { provider: PROVIDER_NAMES[source.provider], list: tr(`admin.topten.lists.${source.kind}`) }),
  };
}
