import i18n from "@/i18n";

const localeMap: Record<string, string> = {
  de: "de-DE",
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
  th: "th-TH",
};

export function getLocale(): string {
  return localeMap[i18n.language] || "de-DE";
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString(getLocale(), options);
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(getLocale());
}
