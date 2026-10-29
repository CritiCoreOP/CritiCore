import { describe, expect, it } from "vitest";
import { articleLanguage, deadlineInfo, htmlWordCount } from "./press";

describe("press helpers", () => {
  it("counts words without tags and entities", () => {
    expect(htmlWordCount("<h2>Fazit</h2><p>Ein <strong>gutes</strong>&nbsp;Spiel.</p>")).toBe(4);
    expect(htmlWordCount("")).toBe(0);
    expect(htmlWordCount(null)).toBe(0);
  });

  it("rates deadlines by calendar day", () => {
    const now = new Date(2026, 9, 7, 18, 0);
    expect(deadlineInfo(new Date(2026, 9, 6, 23, 0).toISOString(), now)).toEqual({ days: -1, state: "overdue" });
    expect(deadlineInfo(new Date(2026, 9, 7, 8, 0).toISOString(), now)).toEqual({ days: 0, state: "today" });
    expect(deadlineInfo(new Date(2026, 9, 10).toISOString(), now)).toEqual({ days: 3, state: "soon" });
    expect(deadlineInfo(new Date(2026, 9, 20).toISOString(), now).state).toBe("later");
  });

  it("maps the interface language to an article language", () => {
    expect(articleLanguage("en-US")).toBe("en");
    expect(articleLanguage("th")).toBe("th");
    expect(articleLanguage("ja")).toBe("de");
  });
});
