import type { TFunction } from "i18next";
import { getLocale } from "@/lib/locale";

/** 139 → "2 Std. 19 Min.", 45 → "45 Min." */
export function formatRuntime(minutes: number | null | undefined, t: TFunction) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return t("details.duration.m", { m });
  return m ? t("details.duration.hm", { h, m }) : t("details.duration.h", { h });
}

/** 63000000 → "63 Mio. $" in German, "$63M" in English */
export function formatMoney(amount: number | null | undefined) {
  if (!amount || amount <= 0) return null;
  return new Intl.NumberFormat(getLocale(), { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(amount);
}

/** "morgen", "in 3 Tagen", "in 2 Wochen" relative to now */
export function formatRelative(date: Date) {
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  if (Math.abs(days) >= 14) return rtf.format(Math.round(days / 7), "week");
  if (days === 0) {
    const hours = Math.round((date.getTime() - Date.now()) / 3_600_000);
    return rtf.format(hours, "hour");
  }
  return rtf.format(days, "day");
}

/** Released within the last `days` days (and not in the future) */
export function isRecent(iso: string | null | undefined, days = 45) {
  if (!iso) return false;
  const age = Date.now() - new Date(iso).getTime();
  return age >= 0 && age < days * 86_400_000;
}

export function isFuture(iso: string | null | undefined) {
  return !!iso && new Date(iso).getTime() > Date.now();
}

/** Seconds of play time → "38 Std." */
export function formatHours(seconds: number | null | undefined, t: TFunction) {
  if (!seconds || seconds <= 0) return null;
  return t("details.duration.h", { h: Math.max(1, Math.round(seconds / 3600)) });
}

// The rating board readers know: USK in Germany, ESRB for English, PEGI elsewhere in Europe
const RATING_ORDER: Record<string, readonly ("USK" | "PEGI" | "ESRB")[]> = {
  de: ["USK", "PEGI", "ESRB"],
  en: ["ESRB", "PEGI", "USK"],
};

export function pickGameRating(ratings: { system: string; rating: string }[] | undefined, lang = "de") {
  for (const system of RATING_ORDER[lang] ?? ["PEGI", "ESRB", "USK"]) {
    const hit = ratings?.find((r) => r.system === system);
    if (hit) return { system, rating: hit.rating.replace(/^(USK|PEGI)\s*/i, "") };
  }
  return null;
}
