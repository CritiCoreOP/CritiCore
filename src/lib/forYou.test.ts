import { describe, expect, it } from "vitest";
import { mergeRecommendations, pickSeeds, type ForYouCard, type Signal } from "./forYou";

const s = (id: string, type: Signal["type"], weight: number, at = "2026-10-01"): Signal => ({ id, type, weight, at });
const c = (id: string, type: ForYouCard["type"] = "movie"): ForYouCard => ({ id, type, title: id, poster: null, score: null });

describe("Für dich", () => {
  it("seeds from the strongest, newest signals, two per type at most", () => {
    const seeds = pickSeeds([
      s("1", "game", 1),
      s("2", "game", 3, "2026-10-05"),
      s("3", "game", 3, "2026-10-02"),
      s("4", "game", 4),
      s("5", "movie", 2),
      s("2", "game", 1, "2026-10-09"),
      s("6", "series", 0),
    ]);
    expect(seeds.map((x) => `${x.type}:${x.id}`)).toEqual(["game:4", "game:2", "movie:5"]);
  });

  it("puts titles several seeds suggest first, then takes turns, and skips known ones", () => {
    const row = mergeRecommendations(
      [
        [c("a"), c("b"), c("shared")],
        [c("x"), c("shared"), c("seen")],
      ],
      new Set(["movie:seen"]),
    );
    expect(row.map((x) => x.id)).toEqual(["shared", "a", "x", "b"]);
  });

  it("keeps films and series with the same number apart", () => {
    const row = mergeRecommendations([[c("7", "movie")], [c("7", "series")]], new Set());
    expect(row).toHaveLength(2);
  });
});
