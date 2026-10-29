import i18n from "@/i18n";
import { LANG_TO_LOCALE, ROUTE_TRANSLATIONS, translatePath } from "./routeTranslations";

export { LANG_TO_LOCALE, ROUTE_TRANSLATIONS, translatePath };

export const LOCALE_TO_LANG: Record<string, string> = Object.fromEntries(
  Object.entries(LANG_TO_LOCALE).map(([lang, locale]) => [locale, lang])
);

export const SUPPORTED_LOCALES = Object.values(LANG_TO_LOCALE);

export function getLocaleFromPath(pathname: string): string | null {
  const segment = pathname.split("/")[1];
  return SUPPORTED_LOCALES.includes(segment) ? segment : null;
}

export function getCurrentLocale(): string {
  return LANG_TO_LOCALE[i18n.language] || "de-DE";
}

export function getLangFromLocale(locale: string): string | undefined {
  return LOCALE_TO_LANG[locale];
}

/** Remove locale prefix from pathname, e.g. /de-DE/games → /games */
export function stripLocalePrefix(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (locale) {
    const rest = pathname.slice(locale.length + 1); // +1 for leading /
    return rest || "/";
  }
  return pathname;
}

// Build reverse maps per locale: translated → canonical
const reverseMapCache = new Map<string, Map<string, string>>();

function getReverseMap(lang: string): Map<string, string> {
  if (reverseMapCache.has(lang)) return reverseMapCache.get(lang)!;
  const map = new Map<string, string>();
  for (const [canonical, translations] of Object.entries(ROUTE_TRANSLATIONS)) {
    const translated = translations[lang] || canonical;
    map.set(translated, canonical);
  }
  reverseMapCache.set(lang, map);
  return map;
}

/**
 * Normalize a localized path back to canonical (German) segments.
 * e.g. "/movies/123" with lang "en" → "/filme/123"
 */
export function canonicalizePath(path: string, lang: string): string {
  if (!path.startsWith("/")) return path;
  const reverseMap = getReverseMap(lang);
  const segments = path.split("/");
  for (let i = 1; i < segments.length; i++) {
    const canonical = reverseMap.get(segments[i]);
    if (canonical) {
      segments[i] = canonical;
    }
  }
  return segments.join("/");
}

/**
 * Get all route path variants for a canonical path segment.
 * Returns array of unique translated values across all languages.
 */
export function getAllRouteVariants(canonical: string): string[] {
  const translations = ROUTE_TRANSLATIONS[canonical];
  if (!translations) return [canonical];
  return [...new Set(Object.values(translations))];
}

