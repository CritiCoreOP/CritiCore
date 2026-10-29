/**
 * "Für dich" on the home page: recommendations from what someone rated, followed, saved, marked as
 * watched or put on the watchlist. A few of those titles become seeds, TMDB and IGDB say what fits
 * them, and the lists are merged so titles several seeds agree on come first.
 */
export type ForYouType = "movie" | "series" | "game";

export interface Signal {
  id: string;
  type: ForYouType;
  /** How much it says about taste: a good review more than a watchlist entry */
  weight: number;
  at: string;
}

export interface ForYouCard {
  id: string;
  type: ForYouType;
  title: string;
  poster: string | null;
  year?: string | null;
  primaryGenre?: string | null;
  genres?: string[];
  score: number | null;
  explicit?: boolean;
}

export const TYPES: ForYouType[] = ["movie", "series", "game"];
export const signalKey = (s: { type: string; id: string }) => `${s.type}:${s.id}`;

/** Up to `max` seeds, strongest and newest first, at most two of one type so a row is not all games */
export function pickSeeds(signals: Signal[], max = 3): Signal[] {
  const best = new Map<string, Signal>();
  for (const s of signals) {
    const prev = best.get(signalKey(s));
    if (!prev || s.weight > prev.weight || (s.weight === prev.weight && s.at > prev.at)) best.set(signalKey(s), s);
  }
  const sorted = [...best.values()].filter((s) => s.weight > 0).sort((a, b) => b.weight - a.weight || b.at.localeCompare(a.at));
  const perType = new Map<ForYouType, number>();
  const seeds: Signal[] = [];
  for (const s of sorted) {
    if ((perType.get(s.type) ?? 0) >= 2) continue;
    perType.set(s.type, (perType.get(s.type) ?? 0) + 1);
    seeds.push(s);
    if (seeds.length >= max) break;
  }
  return seeds;
}

/**
 * One row from the seeds' lists: titles more seeds suggest first, otherwise taken in turns so the
 * first seed does not fill the row. Titles the person already knows are left out.
 */
export function mergeRecommendations(lists: ForYouCard[][], exclude: Set<string>, max = 12): ForYouCard[] {
  const count = new Map<string, number>();
  const turn = new Map<string, number>();
  const card = new Map<string, ForYouCard>();
  lists.forEach((list, li) =>
    list.forEach((c, i) => {
      const key = signalKey(c);
      count.set(key, (count.get(key) ?? 0) + 1);
      if (!turn.has(key)) {
        turn.set(key, i * lists.length + li);
        card.set(key, c);
      }
    }),
  );
  return [...card.keys()]
    .filter((key) => !exclude.has(key))
    .sort((a, b) => count.get(b)! - count.get(a)! || turn.get(a)! - turn.get(b)!)
    .slice(0, max)
    .map((key) => card.get(key)!);
}
