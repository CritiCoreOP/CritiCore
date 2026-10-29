import { describe, expect, it } from "vitest";
import { averageScore, checkAvatarFile, daysUntilChange, initialsOf, karmaRank, normalizeUsername, scoreBuckets, sortReviews } from "./profileStats";

const at = (iso: string, score: number) => ({ created_at: iso, score });

describe("profile stats", () => {
  it("counts half points towards the point above", () => {
    const buckets = scoreBuckets([at("2026-01-01", 0.5), at("2026-01-02", 7.5), at("2026-01-03", 8), at("2026-01-04", 10)]);
    expect(buckets).toEqual([1, 0, 0, 0, 0, 0, 0, 2, 0, 1]);
  });

  it("averages with one decimal and has none without reviews", () => {
    expect(averageScore([])).toBeNull();
    expect(averageScore([at("2026-01-01", 7), at("2026-01-02", 8.5), at("2026-01-03", 6)])).toBe(7.2);
  });

  it("sorts by date or score, ties by date", () => {
    const list = [at("2026-01-01T00:00:00Z", 8), at("2026-03-01T00:00:00Z", 5), at("2026-02-01T00:00:00Z", 8)];
    expect(sortReviews(list, "newest").map((r) => r.score)).toEqual([5, 8, 8]);
    expect(sortReviews(list, "best").map((r) => r.created_at)).toEqual(["2026-02-01T00:00:00Z", "2026-01-01T00:00:00Z", "2026-03-01T00:00:00Z"]);
    expect(sortReviews(list, "worst")[0].score).toBe(5);
    // The input stays as it was
    expect(list[0].score).toBe(8);
  });

  it("counts cooldown days up to the next allowed change", () => {
    const now = Date.parse("2026-10-13T12:00:00Z");
    expect(daysUntilChange(null, 30, now)).toBe(0);
    expect(daysUntilChange("2026-10-12T12:00:00Z", 7, now)).toBe(6);
    expect(daysUntilChange("2026-10-06T11:00:00Z", 7, now)).toBe(0);
  });

  it("ranks karma at the known thresholds", () => {
    expect(karmaRank(99)).toBeNull();
    expect(karmaRank(100)).toBe("active");
    expect(karmaRank(500)).toBe("experienced");
    expect(karmaRank(1000)).toBe("veteran");
    expect(karmaRank(5000)).toBe("legend");
  });

  it("keeps handles to the allowed characters and length", () => {
    expect(normalizeUsername("Max Mustermann!")).toBe("maxmustermann");
    expect(normalizeUsername("a.b-c_d")).toBe("a.b-c_d");
    expect(normalizeUsername("x".repeat(40))).toHaveLength(30);
  });

  it("builds initials from the first two words", () => {
    expect(initialsOf("ada lovelace byron")).toBe("AL");
    expect(initialsOf("  ")).toBe("?");
  });

  it("accepts raster images up to 5 MB only", () => {
    expect(checkAvatarFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(checkAvatarFile({ type: "image/svg+xml", size: 1000 })).toBe("type");
    expect(checkAvatarFile({ type: "image/jpeg", size: 6 * 1024 * 1024 })).toBe("size");
  });
});
