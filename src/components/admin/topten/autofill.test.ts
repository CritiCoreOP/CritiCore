import { describe, expect, it } from "vitest";
import { rollSnapshots, trendAgainst } from "./autofill";

const DAY = 24 * 3600 * 1000;

describe("trendAgainst", () => {
  it("reads movement against last week's list", () => {
    const last = ["a", "b", "c", "d"];
    expect(trendAgainst(last, "c", 0)).toEqual({ trend: "up", trendBy: 2 });
    expect(trendAgainst(last, "a", 3)).toEqual({ trend: "down", trendBy: 3 });
    expect(trendAgainst(last, "b", 1)).toEqual({ trend: "same", trendBy: 1 });
    expect(trendAgainst(last, "x", 0)).toEqual({ trend: "new", trendBy: 1 });
    // Nothing to compare with: no badge, rather than "new" on every place
    expect(trendAgainst(null, "a", 0)).toEqual({ trend: "none", trendBy: 1 });
  });
});

describe("rollSnapshots", () => {
  it("compares with the list from a week ago, not with a fetch earlier the same week", () => {
    const first = rollSnapshots({}, ["a", "b"], 0);
    expect(first.compare).toBeNull();

    // Two days later: still the same week, nothing to compare with yet, first list kept
    const again = rollSnapshots(first.next, ["b", "a"], 2 * DAY);
    expect(again.compare).toBeNull();
    expect(again.next.latest?.keys).toEqual(["a", "b"]);

    // A week later: the first list is last week's
    const week = rollSnapshots(again.next, ["b", "c"], 7 * DAY);
    expect(week.compare).toEqual({ at: 0, keys: ["a", "b"] });
    expect(week.next.latest?.keys).toEqual(["b", "c"]);

    // Fetching again that week keeps comparing with the same list
    expect(rollSnapshots(week.next, ["c", "b"], 8 * DAY).compare?.keys).toEqual(["a", "b"]);
  });
});
