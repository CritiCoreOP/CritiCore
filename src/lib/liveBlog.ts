/**
 * Live blogs: an article with live_status 'live' (later 'ended') and short updates in
 * article_live_updates. Updates are plain text; links in them become clickable, nothing else is
 * interpreted, so an update can never carry markup into the page.
 */
export type LiveStatus = "live" | "ended";

export interface LiveUpdate {
  id: string;
  article_id: string;
  author_id: string | null;
  title: string | null;
  body: string;
  image_url: string | null;
  is_key: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const LIVE_BODY_MAX = 5000;
export const LIVE_TITLE_MAX = 200;

export const isLiveStatus = (v: unknown): v is LiveStatus => v === "live" || v === "ended";

/** Pinned updates first, then the newest */
export function sortUpdates(list: LiveUpdate[]): LiveUpdate[] {
  return [...list].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.created_at.localeCompare(a.created_at));
}

/** Applies one Realtime change to the list; deletions only carry the id */
export function applyChange(list: LiveUpdate[], event: "INSERT" | "UPDATE" | "DELETE", row: Partial<LiveUpdate> & { id?: string }): LiveUpdate[] {
  if (!row.id) return list;
  if (event === "DELETE") return list.filter((u) => u.id !== row.id);
  const rest = list.filter((u) => u.id !== row.id);
  return [row as LiveUpdate, ...rest];
}

export type TextPart = { type: "text"; value: string } | { type: "link"; value: string; href: string };

/** Splits an update into text and http(s) links; a trailing full stop or bracket stays text */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"]+/g)) {
    const href = m[0].replace(/[.,;:!?)\]}"'»]+$/, "");
    const at = m.index!;
    if (at > last) parts.push({ type: "text", value: text.slice(last, at) });
    parts.push({ type: "link", value: href.replace(/^https?:\/\/(www\.)?/, ""), href });
    last = at + href.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

const berlinDay = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

/** "14:32" for today, "17. Okt." with the time below for older updates (German time, the newsroom's) */
export function updateStamp(iso: string, locale: string, now = new Date()): { time: string; day: string | null } {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const day = berlinDay(d) === berlinDay(now) ? null : d.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "Europe/Berlin" });
  return { time, day };
}
