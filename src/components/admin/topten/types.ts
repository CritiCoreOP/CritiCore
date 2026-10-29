/** Data of a top-ten graphic for social media (admin → Top 10) */

export type TopTenWorld = "anime" | "movies" | "series" | "games";
/** "none": no badge, e.g. on the first fetch of a list, when there is nothing to compare with */
export type Trend = "none" | "new" | "up" | "down" | "same";
export type TopTenFormat = "portrait" | "story" | "square" | "landscape";
export type Accent = "blue" | "orange" | "teal" | "rose";

export interface TopTenEntry {
  id: string;
  title: string;
  /** Second line, e.g. "Staffel 3" */
  subtitle: string;
  /** Portrait cover (2:3) */
  poster: string | null;
  /** Wide picture for the big tiles; the poster is used when there is none */
  backdrop: string | null;
  /** What the ranking counts: "11,85 %", "8.7", "1.204 Stimmen" */
  value: string;
  trend: Trend;
  /** Places moved, for up and down */
  trendBy: number;
}

export interface TopTenData {
  world: TopTenWorld;
  title: string;
  /** Line under the title, e.g. the week */
  period: string;
  /** Small print at the bottom, e.g. how many people voted */
  footer: string;
  accent: Accent;
  /** Language of the few fixed words on the graphic ("Neu") */
  lang: string;
  entries: TopTenEntry[];
  /** Values and their bars; off for lists that are only an order. Missing in older drafts = on */
  showValues?: boolean;
  /** "glow": the leader's picture shines through behind the header; "plain": calm dark ground */
  background?: "glow" | "plain";
  /** Movement badges on the graphic. Missing in older drafts = on */
  showTrends?: boolean;
  /** Data source of the automatic fill (sources.ts); missing = the first list of the world */
  source?: string;
  /** Texts the last automatic fill wrote; the next fill replaces them unless they were edited */
  auto?: { title: string; period: string; footer: string };
}

export const MAX_ENTRIES = 10;

/** The one fixed word on the graphic; a table, so it works without loading that language */
export const NEW_LABEL: Record<string, string> = { de: "NEU", en: "NEW", fr: "NOUVEAU", es: "NUEVO", th: "ใหม่" };

export const FORMATS: Record<TopTenFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1600, height: 900 },
};

/** Accent colours from the site's themes (classic blue, sunset orange, glass teal) plus rose */
export const ACCENTS: Record<Accent, string> = {
  blue: "#3b7cf0",
  orange: "#ff7a33",
  teal: "#33ccb8",
  rose: "#f2557a",
};

export const newEntry = (): TopTenEntry => ({
  id: Math.random().toString(36).slice(2, 10),
  title: "",
  subtitle: "",
  poster: null,
  backdrop: null,
  value: "",
  trend: "none",
  trendBy: 1,
});

export const emptyTopTen = (lang = "de"): TopTenData => ({
  world: "anime",
  title: "",
  period: "",
  footer: "",
  accent: "blue",
  lang,
  entries: Array.from({ length: MAX_ENTRIES }, newEntry),
});

const STORAGE_KEY = "admin-topten-draft";

/** The draft lives in this browser, so a reload or a closed tab does not lose the work */
export function loadDraft(): TopTenData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as TopTenData;
    if (!Array.isArray(data.entries)) return null;
    // Older fills marked every place "new" when there was nothing to compare with
    const filled = filledEntries(data);
    if (filled.length > 1 && filled.every((e) => e.trend === "new")) {
      return { ...data, entries: data.entries.map((e) => ({ ...e, trend: "none" as const })) };
    }
    return data;
  } catch {
    return null;
  }
}

export function saveDraft(data: TopTenData) {
  try {
    // Uploaded pictures are data URLs and can be large; without them the rest still fits
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    try {
      const light = { ...data, entries: data.entries.map((e) => ({ ...e, poster: e.poster?.startsWith("data:") ? null : e.poster, backdrop: e.backdrop?.startsWith("data:") ? null : e.backdrop })) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
    } catch {
      /* storage blocked */
    }
  }
}

/** Entries that have a title, in their order; the graphic shows these */
export const filledEntries = (data: TopTenData) => data.entries.filter((e) => e.title.trim());

/** "11,85 %" → 11.85; used for the bars. Null when the value is not a number */
export function numericValue(value: string): number | null {
  const m = value.replace(/\s/g, "").match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
