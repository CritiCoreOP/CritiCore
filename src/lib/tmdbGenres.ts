// TMDB genre id → English name lookup. Small, static, no network cost.
// Sources: /genre/movie/list, /genre/tv/list (kept in sync manually).

const MOVIE: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

const TV: Record<number, string> = {
  10759: "Action", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary",
  18: "Drama", 10751: "Family", 10762: "Kids", 9648: "Mystery", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi", 10766: "Soap", 10767: "Talk",
  10768: "War & Politics", 37: "Western",
};

export type TmdbMediaKind = "movie" | "series";

export const tmdbGenreName = (id: number, kind: TmdbMediaKind): string | undefined =>
  (kind === "movie" ? MOVIE : TV)[id];

export const tmdbGenreNames = (
  ids: number[] | undefined | null,
  kind: TmdbMediaKind,
): string[] =>
  (ids ?? [])
    .map((id) => tmdbGenreName(id, kind))
    .filter((n): n is string => Boolean(n));
