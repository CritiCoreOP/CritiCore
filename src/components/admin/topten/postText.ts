import { filledEntries, type TopTenData, type TopTenWorld } from "./types";

// Hashtag for the world, in the language of the post
const WORLD_TAG: Record<string, Record<TopTenWorld, string>> = {
  de: { anime: "Anime", movies: "Filme", series: "Serien", games: "Gaming" },
  en: { anime: "Anime", movies: "Movies", series: "TVSeries", games: "Gaming" },
  fr: { anime: "Anime", movies: "Cinema", series: "Series", games: "JeuxVideo" },
  es: { anime: "Anime", movies: "Cine", series: "Series", games: "Videojuegos" },
  th: { anime: "อนิเมะ", movies: "หนัง", series: "ซีรีส์", games: "เกม" },
};

/**
 * Text to post with the graphic: heading, the list in words (for screen readers and for people who
 * do not open the picture), the source line and a few hashtags.
 */
export function postText(data: TopTenData): string {
  const showValues = data.showValues !== false;
  const list = filledEntries(data).map((e, i) => {
    const extra = e.subtitle ? ` (${e.subtitle})` : "";
    const value = showValues && e.value ? `: ${e.value}` : "";
    return `${i + 1}. ${e.title}${extra}${value}`;
  });
  const tag = (WORLD_TAG[data.lang] ?? WORLD_TAG.en)[data.world];
  return [
    [data.title || "Top 10", data.period].filter(Boolean).join("\n"),
    list.join("\n"),
    [data.footer, "criticore.cc"].filter(Boolean).join("\n"),
    `#CritiCore #Top10 #${tag}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
