import { describe, expect, it } from "vitest";
import { rowWidths, snapWidth, validRatio, widthFromDrag } from "./imageLayout";

describe("snapWidth", () => {
  it("lands on quarters and thirds when close, rounds otherwise", () => {
    expect(snapWidth(49.2)).toBe(50);
    expect(snapWidth(34.1)).toBe(33.3);
    expect(snapWidth(43.6)).toBe(44);
    expect(snapWidth(140)).toBe(100);
    expect(snapWidth(3)).toBe(15);
  });
});

describe("widthFromDrag", () => {
  it("grows a centred image on both sides", () => {
    // 100 px on a 1000 px column is 10 %, doubled for a centred image
    expect(widthFromDrag({ start: 40, dx: 100, container: 1000, align: "center", side: "right" })).toBe(60);
    expect(widthFromDrag({ start: 40, dx: 100, container: 1000, align: "center", side: "left" })).toBe(20);
  });

  it("grows a floating image towards the dragged side only", () => {
    expect(widthFromDrag({ start: 40, dx: -100, container: 1000, align: "right", side: "left" })).toBe(50);
    expect(widthFromDrag({ start: 40, dx: 100, container: 1000, align: "left", side: "right" })).toBe(50);
  });
});

describe("rowWidths", () => {
  it("gives wider images more room, so all come out equally tall", () => {
    // 16:9 next to 4:5
    const [a, b] = rowWidths([16 / 9, 4 / 5]);
    expect(a).toBeCloseTo(69, 0);
    expect(b).toBeCloseTo(31, 0);
    expect(a + b).toBeCloseTo(100, 0);
  });

  it("assumes a photo for images not measured yet", () => {
    expect(rowWidths([null, undefined, 1.5])).toEqual([33.3, 33.3, 33.3]);
  });
});

describe("validRatio", () => {
  it("keeps sane ratios and drops the rest", () => {
    expect(validRatio(1.77777)).toBe(1.778);
    expect(validRatio("0.8")).toBe(0.8);
    expect(validRatio(0)).toBeNull();
    expect(validRatio("abc")).toBeNull();
    expect(validRatio(50)).toBeNull();
  });
});
