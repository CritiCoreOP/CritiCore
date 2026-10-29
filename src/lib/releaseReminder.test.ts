import { describe, expect, it } from "vitest";
import { upcomingReleaseDay } from "./releaseReminder";

describe("upcomingReleaseDay", () => {
  // 21:30 UTC is 23:30 in Berlin, still the 16th there
  const now = new Date("2026-10-16T21:30:00Z");

  it("offers a reminder from tomorrow on, by German date", () => {
    expect(upcomingReleaseDay("2026-10-17", "movie", now)).toBe("2026-10-17");
    expect(upcomingReleaseDay("2026-10-16", "movie", now)).toBeNull();
    expect(upcomingReleaseDay("2026-11-20T00:00:00Z", "series", now)).toBe("2026-11-20");
  });

  it("skips unknown days", () => {
    expect(upcomingReleaseDay("", "game", now)).toBeNull();
    expect(upcomingReleaseDay("2027", "anime", now)).toBeNull();
    // IGDB's stand-in for "sometime in 2027"
    expect(upcomingReleaseDay("2027-12-31", "game", now)).toBeNull();
    expect(upcomingReleaseDay("2027-12-31", "movie", now)).toBe("2027-12-31");
  });
});
