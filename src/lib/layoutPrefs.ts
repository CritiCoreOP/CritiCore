import { useSyncExternalStore } from "react";

/**
 * Per-browser layout choices: what the front page leads with, the four sections of the phone
 * dock, the desktop side rail and the order of the navbar links. Stored like the theme and the
 * nav style (localStorage); the defaults are the news-first layout.
 */

export type SectionKey = "news" | "games" | "filme" | "serien" | "anime" | "entdecken";
export type HomeOrder = "news" | "media";

export interface LayoutPrefs {
  homeOrder: HomeOrder;
  /** 1 to DOCK_MAX sections; the menu button always comes last */
  dock: SectionKey[];
  sideRail: boolean;
  /** Every section once, in navbar order (the home link always stays first) */
  nav: SectionKey[];
}

export const SECTIONS: Record<SectionKey, { href: string; labelKey: string }> = {
  news: { href: "/news", labelKey: "nav.news" },
  games: { href: "/games", labelKey: "nav.games" },
  filme: { href: "/filme", labelKey: "nav.movies" },
  serien: { href: "/serien", labelKey: "nav.series" },
  anime: { href: "/anime", labelKey: "nav.anime" },
  entdecken: { href: "/entdecken", labelKey: "nav.explore" },
};
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

/** Four sections plus the menu still fit a 320px phone */
export const DOCK_MAX = 4;

export const DEFAULT_LAYOUT_PREFS: LayoutPrefs = {
  homeOrder: "news",
  dock: ["news", "games", "filme", "serien"],
  sideRail: true,
  nav: ["news", "games", "filme", "serien", "anime", "entdecken"],
};

export const LAYOUT_PREFS_KEY = "criticore-layout";

const isSection = (v: unknown): v is SectionKey => typeof v === "string" && v in SECTIONS;
const uniqueSections = (v: unknown): SectionKey[] => (Array.isArray(v) ? [...new Set(v.filter(isSection))] : []);

/** Turns whatever is stored (old, partial or broken) into valid prefs */
export function sanitizeLayoutPrefs(raw: unknown): LayoutPrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const dock = uniqueSections(o.dock).slice(0, DOCK_MAX);
  const nav = uniqueSections(o.nav);
  return {
    homeOrder: o.homeOrder === "media" ? "media" : "news",
    dock: dock.length > 0 ? dock : DEFAULT_LAYOUT_PREFS.dock,
    sideRail: typeof o.sideRail === "boolean" ? o.sideRail : DEFAULT_LAYOUT_PREFS.sideRail,
    // Sections added later than the stored order show up at the end
    nav: [...nav, ...DEFAULT_LAYOUT_PREFS.nav.filter((k) => !nav.includes(k))],
  };
}

/** Moves the item at `index` one step up (-1) or down (+1); out of range leaves the list as it is */
export function moveItem<T>(list: T[], index: number, step: -1 | 1): T[] {
  const target = index + step;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function read(): LayoutPrefs {
  try {
    const stored = localStorage.getItem(LAYOUT_PREFS_KEY);
    return sanitizeLayoutPrefs(stored ? JSON.parse(stored) : null);
  } catch {
    return DEFAULT_LAYOUT_PREFS;
  }
}

let current: LayoutPrefs = typeof window === "undefined" ? DEFAULT_LAYOUT_PREFS : read();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function setLayoutPrefs(patch: Partial<LayoutPrefs>) {
  current = sanitizeLayoutPrefs({ ...current, ...patch });
  try {
    localStorage.setItem(LAYOUT_PREFS_KEY, JSON.stringify(current));
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
  notify();
}

export function resetLayoutPrefs() {
  current = DEFAULT_LAYOUT_PREFS;
  try {
    localStorage.removeItem(LAYOUT_PREFS_KEY);
  } catch {
    /* storage blocked */
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // A change in another tab arrives as a storage event
  const onStorage = (e: StorageEvent) => {
    if (e.key !== LAYOUT_PREFS_KEY) return;
    current = read();
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLayoutPrefs(): LayoutPrefs {
  return useSyncExternalStore(subscribe, () => current, () => DEFAULT_LAYOUT_PREFS);
}
