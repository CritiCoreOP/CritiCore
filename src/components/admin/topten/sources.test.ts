import { describe, expect, it } from "vitest";
import de from "@/i18n/locales/de.json";
import { autoTexts, isoWeek, SOURCES, sourceFor, sourcesFor } from "./sources";

// The German texts, as i18next would fill them in
const tr = (key: string, options: Record<string, unknown> = {}) => {
  const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], de);
  return String(text ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name]));
};

describe("sources", () => {
  it("offers several lists per world, each with a name and a heading", () => {
    for (const world of ["anime", "movies", "series", "games"] as const) {
      expect(sourcesFor(world).length).toBeGreaterThanOrEqual(3);
    }
    expect(sourcesFor("anime").some((s) => s.provider === "tmdb")).toBe(true);
    for (const s of SOURCES) {
      expect(de.admin.topten.lists).toHaveProperty(s.kind);
      expect(de.admin.topten.autoTitles).toHaveProperty(s.kind);
    }
    expect(new Set(SOURCES.map((s) => s.id)).size).toBe(SOURCES.length);
  });

  it("falls back to the first list of the world", () => {
    expect(sourceFor("movies", "anilist-season").id).toBe("tmdb-movies-trending");
    expect(sourceFor("anime", undefined).id).toBe("anilist-trending");
    expect(sourceFor("games", "igdb-anticipated").id).toBe("igdb-anticipated");
  });

  it("writes heading, period and source line in the graphic's language", () => {
    const friday = new Date(2026, 9, 9);
    expect(autoTexts(sourceFor("anime", "anilist-trending"), "de", tr, friday)).toEqual({
      title: "Top 10 Anime der Woche",
      period: "KW 41 · 2026",
      footer: "Quelle: AniList · Trends der Woche",
    });
    expect(autoTexts(sourceFor("anime", "anilist-season"), "de", tr, friday).period).toBe("Herbst 2026");
    expect(autoTexts(sourceFor("movies", "tmdb-movies-cinema"), "de", tr, friday).title).toBe("Top 10 Filme im Kino");
    expect(autoTexts(sourceFor("movies", "tmdb-movies-upcoming"), "de", tr, friday).period).toBe("Oktober 2026");
    expect(autoTexts(sourceFor("movies", "tmdb-movies-top-rated"), "de", tr, friday).period).toBe("");
  });

  it("counts weeks the ISO way", () => {
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ week: 1, year: 2026 });
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ week: 53, year: 2026 });
    expect(isoWeek(new Date(2026, 11, 28))).toEqual({ week: 53, year: 2026 });
  });
});
