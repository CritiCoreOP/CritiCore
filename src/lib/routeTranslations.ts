/**
 * Locales and translated route segments without any app dependency, so the sitemap function on
 * Cloudflare can build the same paths as the router. localeRouting.ts re-exports all of it.
 */

export const LANG_TO_LOCALE: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  th: "th-TH",
};

export const SUPPORTED_LANGS = Object.keys(LANG_TO_LOCALE);

/**
 * Localized route path segments.
 * Keys are the canonical (German) path segments used in code.
 * Values are the translated segments per language.
 */
export const ROUTE_TRANSLATIONS: Record<string, Record<string, string>> = {
  filme:          { de: "filme",          en: "movies",         fr: "films",          es: "peliculas",      th: "filme" },
  serien:         { de: "serien",         en: "series",         fr: "series",         es: "series",         th: "serien" },
  games:          { de: "games",          en: "games",          fr: "jeux",           es: "juegos",         th: "games" },
  news:           { de: "news",           en: "news",           fr: "actualites",     es: "noticias",       th: "news" },
  entdecken:      { de: "entdecken",      en: "explore",        fr: "explorer",       es: "explorar",       th: "entdecken" },
  suche:          { de: "suche",          en: "search",         fr: "recherche",      es: "buscar",         th: "suche" },
  anime:          { de: "anime",          en: "anime",          fr: "anime",          es: "anime",          th: "anime" },
  profil:         { de: "profil",         en: "profile",        fr: "profil",         es: "perfil",         th: "profil" },
  einstellungen:  { de: "einstellungen",  en: "settings",       fr: "parametres",     es: "ajustes",        th: "einstellungen" },
  impressum:      { de: "impressum",      en: "imprint",        fr: "mentions-legales", es: "aviso-legal",  th: "impressum" },
  datenschutz:    { de: "datenschutz",    en: "privacy",        fr: "confidentialite", es: "privacidad",    th: "datenschutz" },
  agb:            { de: "agb",            en: "terms",          fr: "conditions",     es: "terminos",       th: "agb" },
  transparenz:    { de: "transparenz",    en: "transparency",   fr: "transparence",   es: "transparencia",  th: "transparency" },
  "ueber-uns":    { de: "ueber-uns",      en: "about",          fr: "a-propos",       es: "sobre-nosotros", th: "about" },
  dmca:           { de: "dmca",           en: "dmca",           fr: "dmca",           es: "dmca",           th: "dmca" },
  support:        { de: "support",        en: "support",        fr: "support",        es: "soporte",        th: "support" },
  spenden:        { de: "spenden",        en: "donate",         fr: "faire-un-don",   es: "donar",          th: "spenden" },
  forum:          { de: "forum",          en: "forum",          fr: "forum",          es: "foro",           th: "forum" },
  
  umfragen:       { de: "umfragen",       en: "polls",          fr: "sondages",       es: "encuestas",      th: "umfragen" },
  erstellen:      { de: "erstellen",      en: "create",         fr: "creer",          es: "crear",          th: "erstellen" },
  auth:           { de: "auth",           en: "auth",           fr: "auth",           es: "auth",           th: "auth" },
  developers:     { de: "developers",     en: "developers",     fr: "developpeurs",   es: "desarrolladores", th: "developers" },
  cast:           { de: "cast",           en: "cast",           fr: "casting",        es: "reparto",        th: "cast" },
  admin:          { de: "admin",          en: "admin",          fr: "admin",          es: "admin",          th: "admin" },
  staffel:        { de: "staffel",        en: "season",         fr: "saison",         es: "temporada",      th: "staffel" },
  schreiben:      { de: "schreiben",      en: "write",          fr: "ecrire",         es: "escribir",       th: "schreiben" },
  entwuerfe:      { de: "entwuerfe",      en: "drafts",         fr: "brouillons",     es: "borradores",     th: "entwuerfe" },
  ticket:         { de: "ticket",         en: "ticket",         fr: "ticket",         es: "ticket",         th: "ticket" },
  invite:         { de: "invite",         en: "invite",         fr: "invite",         es: "invite",         th: "invite" },
  rw:             { de: "rw",             en: "rw",             fr: "rw",             es: "rw",             th: "rw" },
  "metadata-galerie": { de: "metadata-galerie", en: "metadata-gallery", fr: "galerie-metadata", es: "galeria-metadata", th: "metadata-galerie" },
  "meine-daten":      { de: "meine-daten",      en: "my-data",           fr: "mes-donnees",     es: "mis-datos",        th: "meine-daten" },
  presse:             { de: "presse",           en: "press",             fr: "presse",          es: "prensa",           th: "presse" },
  listen:             { de: "listen",           en: "lists",             fr: "listes",          es: "listas",           th: "listen" },
  benachrichtigungen: { de: "benachrichtigungen", en: "notifications",     fr: "notifications",   es: "notificaciones",   th: "benachrichtigungen" },
  feed:               { de: "feed",               en: "feed",              fr: "feed",            es: "feed",             th: "feed" },
  subs:               { de: "subs",               en: "subs",              fr: "subs",            es: "subs",             th: "subs" },
  freunde:            { de: "freunde",            en: "friends",           fr: "amis",            es: "amigos",           th: "freunde" },
};

/**
 * Translate a canonical path (using German segments) to the localized version.
 * e.g. "/filme/123" with lang "en" → "/movies/123"
 */
export function translatePath(path: string, lang: string): string {
  if (!path.startsWith("/")) return path;
  const segments = path.split("/");
  // segments[0] is "" (before leading /)
  for (let i = 1; i < segments.length; i++) {
    const translation = ROUTE_TRANSLATIONS[segments[i]];
    if (translation && translation[lang]) {
      segments[i] = translation[lang];
    }
  }
  return segments.join("/");
}
