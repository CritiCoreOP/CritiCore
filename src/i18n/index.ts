import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// German is built in: it is the fallback for missing keys and what most visitors read.
// The other languages are separate chunks, loaded only when someone uses them; all five
// together were a 520 KB script that every visitor downloaded and parsed on startup.
import de from "./locales/de.json";

const otherLocales = import.meta.glob<{ default: Record<string, unknown> }>(["./locales/*.json", "!./locales/de.json"]);

const LANG_KEY = "criticore-lang";
// Same mapping as LOCALE_TO_LANG in lib/localeRouting, which imports this file
const LOCALE_PREFIX_TO_LANG: Record<string, string> = { "de-DE": "de", "en-US": "en", "fr-FR": "fr", "es-ES": "es", "th-TH": "th" };

function getSavedLang(): string | null {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

// Browser settings instead of an IP lookup: ipapi.co rate-limits at 1000 requests/day (429 without CORS,
// so most visitors silently fell back to German) and sent every visitor's IP to a third party.
export function detectBrowserLanguage(): string {
  const supported = ["de", "en", "fr", "es", "th"];
  const tags = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const base = tag?.toLowerCase().split("-")[0];
    if (base && supported.includes(base)) return base;
  }
  return "de";
}

export const supportedLanguages = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "th", label: "ไทย (Beta)", flag: "🇹🇭" },
];

/** Adds a language's texts to i18next; German is always there. */
export async function loadLanguage(lang: string): Promise<void> {
  if (lang === "de" || i18n.hasResourceBundle(lang, "translation")) return;
  const load = otherLocales[`./locales/${lang}.json`];
  if (!load) return;
  const mod = await load();
  i18n.addResourceBundle(lang, "translation", mod.default, true, true);
}

const savedLang = getSavedLang();
// The URL prefix wins (a shared /en-US/ link opens in English), then the saved choice, then the browser
const pathLang = typeof window === "undefined" ? undefined : LOCALE_PREFIX_TO_LANG[window.location.pathname.split("/")[1]];
const startLang = pathLang || savedLang || detectBrowserLanguage();

i18n.use(initReactI18next).init({
  resources: { de: { translation: de } },
  partialBundledLanguages: true,
  lng: startLang,
  fallbackLng: "de",
  interpolation: { escapeValue: false },
  // Re-render when a language bundle arrives after start
  react: { bindI18nStore: "added" },
});

// No saved language yet: remember the one we start with
if (!savedLang) {
  try { localStorage.setItem(LANG_KEY, startLang); } catch { /* storage blocked */ }
}

/** Resolves once the start language is available; main.tsx waits for it before the first render. */
export const i18nReady: Promise<void> = loadLanguage(startLang).catch((err) => {
  // Offline or a failed chunk: German texts via the fallback are better than no page
  console.error("Could not load language", startLang, err);
});

// The note box in articles (.article-note in index.css) takes its label from this CSS variable,
// so every language version shows its own word while the stored HTML stays the same. The same for
// "Quelle:" in front of image credits (.image-credit).
const setNoteLabel = () => {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  root.setProperty("--article-note-label", JSON.stringify(i18n.t("article.note.label")));
  root.setProperty("--image-credit-label", JSON.stringify(`${i18n.t("article.image.creditLabel")} `));
};
i18nReady.then(setNoteLabel);
i18n.on("languageChanged", setNoteLabel);

export function changeLanguage(lang: string) {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage blocked */ }
  // Switch once the texts are there, otherwise the page shows keys for a moment
  return loadLanguage(lang)
    .catch((err) => console.error("Could not load language", lang, err))
    .then(() => i18n.changeLanguage(lang));
}

export default i18n;
