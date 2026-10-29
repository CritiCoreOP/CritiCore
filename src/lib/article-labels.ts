import type { TFunction } from "i18next";

// Articles store category/type as raw slugs ("games", "general", "review"); these map them to i18n keys
export const ARTICLE_CATEGORY_KEYS: Record<string, string> = {
  all: "news.all",
  games: "news.games",
  movies: "news.movies",
  series: "news.series",
  general: "news.general",
  patchnotes: "news.patchnotes",
};

export const ARTICLE_TYPE_KEYS: Record<string, string> = {
  news: "news.typeNews",
  review: "news.typeReview",
  opinion: "news.typeOpinion",
  interview: "news.typeInterview",
};

export const articleCategoryLabel = (t: TFunction, category: string) =>
  t(ARTICLE_CATEGORY_KEYS[category] || "news.general");

export const articleTypeLabel = (t: TFunction, type: string) =>
  t(ARTICLE_TYPE_KEYS[type] || "news.typeNews");

/**
 * Opinion pieces have to be recognisable as such wherever they appear (separation of news and
 * opinion, Pressekodex Ziffer 2): an unmistakable "MEINUNG" label, not just a grey type word.
 * A review is an opinion piece too (an assessment); it is labelled "REVIEW · MEINUNG".
 */
export const isOpinion = (type: string | null | undefined) => type === "opinion" || type === "review";
export const isReview = (type: string | null | undefined) => type === "review";

/** The label in the article's own language, for graphics and post texts that leave the site */
export const OPINION_WORDS: Record<string, string> = { de: "Meinung", en: "Opinion", es: "Opinión", fr: "Opinion", th: "ความคิดเห็น" };
export const REVIEW_WORDS: Record<string, string> = { de: "Review", en: "Review", es: "Reseña", fr: "Critique", th: "รีวิว" };
export const opinionWord = (language: string | null | undefined, type?: string | null) => {
  const lang = OPINION_WORDS[language || "de"] ? language || "de" : "de";
  return isReview(type) ? `${REVIEW_WORDS[lang]} · ${OPINION_WORDS[lang]}` : OPINION_WORDS[lang];
};
