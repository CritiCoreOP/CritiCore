import { getLocale } from "@/lib/locale";

/** Plain words of an article's HTML */
export function htmlWordCount(html: string | null | undefined): number {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  return text.split(/\s+/).filter(Boolean).length;
}

/** "vor 5 Minuten", "gestern", "vor 3 Wochen" in the interface language */
export function timeAgo(iso: string, now = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 14 * 86_400) return rtf.format(Math.round(seconds / 86_400), "day");
  return rtf.format(Math.round(seconds / (7 * 86_400)), "week");
}

export type DeadlineState = "overdue" | "today" | "soon" | "later";

/** Calendar days until the deadline (negative when it has passed) and how urgent that is */
export function deadlineInfo(deadline: string, now = new Date()): { days: number; state: DeadlineState } {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((day(new Date(deadline)) - day(now)) / 86_400_000);
  const state: DeadlineState = days < 0 ? "overdue" : days === 0 ? "today" : days <= 3 ? "soon" : "later";
  return { days, state };
}

const ARTICLE_LANGUAGES = ["de", "en", "fr", "es", "th"];

/** Article language for something started from the interface; German when the interface has no article language */
export const articleLanguage = (uiLanguage: string) => {
  const code = uiLanguage.slice(0, 2).toLowerCase();
  return ARTICLE_LANGUAGES.includes(code) ? code : "de";
};
