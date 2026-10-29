import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT_PREFS, moveItem, sanitizeLayoutPrefs } from "./layoutPrefs";

describe("sanitizeLayoutPrefs", () => {
  it("falls back to the news-first defaults", () => {
    expect(sanitizeLayoutPrefs(null)).toEqual(DEFAULT_LAYOUT_PREFS);
    expect(sanitizeLayoutPrefs("broken")).toEqual(DEFAULT_LAYOUT_PREFS);
  });

  it("keeps valid choices", () => {
    const prefs = sanitizeLayoutPrefs({ homeOrder: "media", dock: ["anime", "news"], sideRail: false, nav: ["anime", "news", "games", "filme", "serien", "entdecken"] });
    expect(prefs.homeOrder).toBe("media");
    expect(prefs.dock).toEqual(["anime", "news"]);
    expect(prefs.sideRail).toBe(false);
    expect(prefs.nav[0]).toBe("anime");
  });

  it("drops unknown and duplicate sections and caps the dock at four", () => {
    const prefs = sanitizeLayoutPrefs({ dock: ["news", "news", "podcasts", "games", "filme", "serien", "anime"] });
    expect(prefs.dock).toEqual(["news", "games", "filme", "serien"]);
  });

  it("an empty dock gets the default sections back", () => {
    expect(sanitizeLayoutPrefs({ dock: [] }).dock).toEqual(DEFAULT_LAYOUT_PREFS.dock);
  });

  it("appends sections missing from a stored navbar order", () => {
    expect(sanitizeLayoutPrefs({ nav: ["serien", "news"] }).nav).toEqual(["serien", "news", "games", "filme", "anime", "entdecken"]);
  });
});

describe("moveItem", () => {
  it("swaps with the neighbour", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("does nothing at the ends", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 1)).toBe(list);
  });
});
