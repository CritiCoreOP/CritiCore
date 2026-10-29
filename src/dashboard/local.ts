import { useCallback, useEffect, useState } from "react";

/* ── Work left open in this browser ───────────────────────────────────────── */

export interface DraftSummary {
  id: "socialPack" | "topTen";
  href: string;
  /** Heading of the work, empty when it has none yet */
  title: string;
  /** How much is done: slides, filled places */
  count: number;
  picture: string | null;
}

const read = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

/** Open Social Packs and Top 10 graphics; both editors keep their draft in this browser */
export function readDrafts(): DraftSummary[] {
  const out: DraftSummary[] = [];
  const pack = read("socialCreator.draft.v2");
  if (Array.isArray(pack) && pack.length) {
    const picture = pack
      .flatMap((s: { elements?: { type?: string; src?: string }[]; background?: { image?: string | null } }) => [s.background?.image, ...(s.elements ?? []).filter((e) => e.type === "image").map((e) => e.src)])
      .find((src): src is string => typeof src === "string" && !!src);
    const text = pack
      .flatMap((s: { elements?: { type?: string; text?: string }[] }) => (s.elements ?? []).filter((e) => e.type === "text").map((e) => e.text))
      .find((v): v is string => typeof v === "string" && !!v.trim());
    out.push({ id: "socialPack", href: "/social-creator", title: text?.trim().slice(0, 80) ?? "", count: pack.length, picture: picture ?? null });
  }
  const top = read("admin-topten-draft") as { title?: string; entries?: { title?: string; poster?: string | null }[] } | null;
  const filled = (top?.entries ?? []).filter((e) => e.title?.trim());
  if (filled.length) {
    out.push({ id: "topTen", href: "/dashboard/social/top10", title: top?.title ?? "", count: filled.length, picture: filled.find((e) => e.poster)?.poster ?? null });
  }
  return out;
}

/* ── Pinned tools on the overview ─────────────────────────────────────────── */

const PINS_KEY = "dashboard-pins";

export function usePins(defaults: string[]) {
  const [pins, setPins] = useState<string[]>(() => {
    const stored = read(PINS_KEY);
    return Array.isArray(stored) ? stored.filter((p): p is string => typeof p === "string") : defaults;
  });
  const toggle = useCallback((id: string) => {
    setPins((current) => {
      const next = current.includes(id) ? current.filter((p) => p !== id) : [...current, id];
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: pins last until reload */
      }
      return next;
    });
  }, []);
  return { pins, toggle };
}

/* ── Where someone was last ───────────────────────────────────────────────── */

const LAST_KEY = "dashboard-last-path";

export function rememberPath(path: string) {
  try {
    localStorage.setItem(LAST_KEY, path);
  } catch {
    /* storage blocked */
  }
}

export function lastPath(): string | null {
  try {
    const p = localStorage.getItem(LAST_KEY);
    return p && p.startsWith("/dashboard/") ? p : null;
  } catch {
    return null;
  }
}

/** Re-reads the drafts when the tab comes back, e.g. after working in the Social Pack Creator */
export function useDrafts() {
  const [drafts, setDrafts] = useState<DraftSummary[]>(() => readDrafts());
  useEffect(() => {
    const refresh = () => setDrafts(readDrafts());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return drafts;
}
