import type { TopTenSource } from "./sources";
import { MAX_ENTRIES, type TopTenEntry, type Trend } from "./types";

/** Movement against the previous list: up/down by the places moved, new when it was not in it; nothing without a list */
export function trendAgainst(previous: string[] | null, key: string, rank: number): { trend: Trend; trendBy: number } {
  if (!previous) return { trend: "none", trendBy: 1 };
  const before = previous.indexOf(key);
  if (before < 0) return { trend: "new", trendBy: 1 };
  if (before === rank) return { trend: "same", trendBy: 1 };
  return before > rank ? { trend: "up", trendBy: before - rank } : { trend: "down", trendBy: rank - before };
}

/* ── Last week's list, per data source, in this browser ───────────────────── */

interface Snapshot {
  at: number;
  keys: string[];
}
interface Snapshots {
  latest?: Snapshot;
  previous?: Snapshot;
}

/** A new fetch counts as a new week after this long; fetching twice the same day keeps the old comparison */
const WEEK_MS = 5 * 24 * 3600 * 1000;
const snapshotKey = (source: TopTenSource) => `admin-topten-last-${source.id}`;

function readSnapshots(source: TopTenSource): Snapshots {
  try {
    const raw = localStorage.getItem(snapshotKey(source)) ?? (source.legacyKey ? localStorage.getItem(source.legacyKey) : null);
    return JSON.parse(raw || "{}") as Snapshots;
  } catch {
    return {};
  }
}

/** The list to compare with and the snapshots to store after this fetch */
export function rollSnapshots(stored: Snapshots, keys: string[], now: number): { compare: Snapshot | null; next: Snapshots } {
  const latestIsOld = stored.latest && now - stored.latest.at >= WEEK_MS;
  const previous = latestIsOld ? stored.latest : stored.previous;
  // Within the same week the first fetch of that week stays the "latest"
  const latest = latestIsOld || !stored.latest ? { at: now, keys } : stored.latest;
  return { compare: previous ?? null, next: { latest, previous } };
}

export class EmptyListError extends Error {
  constructor() {
    super("no results");
  }
}

export interface AutofillResult {
  entries: TopTenEntry[];
  /** When the list compared with was fetched; null on the first fetch of a list, so there is no movement */
  comparedAt: number | null;
}

/** Fills the ten places from a data source, with movement against the same list of a week ago */
export async function autofill(source: TopTenSource, lang: string, reviewCount: (count: number) => string): Promise<AutofillResult> {
  const seen = new Set<string>();
  const items = (await source.load(lang)).filter((i) => i.title && !seen.has(i.key) && seen.add(i.key)).slice(0, MAX_ENTRIES);
  if (!items.length) throw new EmptyListError();
  const { compare, next } = rollSnapshots(readSnapshots(source), items.map((i) => i.key), Date.now());
  try {
    localStorage.setItem(snapshotKey(source), JSON.stringify(next));
  } catch {
    /* storage blocked: no movement next time */
  }
  const entries = items.map((item, rank) => ({
    id: item.key,
    title: item.title,
    subtitle: item.reviews !== undefined ? reviewCount(item.reviews) : item.subtitle,
    poster: item.poster,
    backdrop: item.backdrop,
    value: item.value,
    ...trendAgainst(compare?.keys ?? null, item.key, rank),
  }));
  return { entries, comparedAt: compare?.at ?? null };
}
