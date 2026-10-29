import { describe, expect, it } from "vitest";
import { postText } from "./postText";
import { emptyTopTen, newEntry } from "./types";

describe("postText", () => {
  it("writes the list out with values, source and hashtags in the post language", () => {
    const data = {
      ...emptyTopTen("de"),
      title: "Top 10 Anime der Woche",
      period: "Woche 41",
      footer: "Quelle: AniList Trending",
      entries: [
        { ...newEntry(), title: "Frieren", value: "9,0" },
        { ...newEntry(), title: "Apothecary Diaries", subtitle: "Staffel 3", value: "8,7" },
        newEntry(),
      ],
    };
    expect(postText(data)).toBe(
      "Top 10 Anime der Woche\nWoche 41\n\n1. Frieren: 9,0\n2. Apothecary Diaries (Staffel 3): 8,7\n\nQuelle: AniList Trending\ncriticore.cc\n\n#CritiCore #Top10 #Anime",
    );
  });

  it("leaves the values out when the graphic hides them", () => {
    const data = { ...emptyTopTen("en"), world: "movies" as const, showValues: false, entries: [{ ...newEntry(), title: "Dune", value: "8.1" }] };
    expect(postText(data)).toBe("Top 10\n\n1. Dune\n\ncriticore.cc\n\n#CritiCore #Top10 #Movies");
  });
});
