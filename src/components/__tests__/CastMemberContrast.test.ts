import { describe, it, expect } from "vitest";

/**
 * Contrast verification for Cast-Row UI (CastMemberOverlay).
 * Ensures WCAG AA (4.5:1) for the character role name (dimmed 60% opacity)
 * and the hover state (accent-light) against the card background.
 *
 * Colors mirror the tokens in src/index.css (default classic theme):
 *   --background: 232 10% 13%   → cast button sits on page bg
 *   --foreground: 231 56% 94%   → name color
 *   --accent-light: 219 83% 65% → hover color
 * Role text uses text-foreground/60 = foreground blended over background at 0.6 alpha.
 */

type RGB = { r: number; g: number; b: number };

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}

function blend(fg: RGB, bg: RGB, alpha: number): RGB {
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  };
}

function relLuminance({ r, g, b }: RGB): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function contrast(a: RGB, b: RGB): number {
  const l1 = relLuminance(a);
  const l2 = relLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const background = hslToRgb(232, 10, 13);
const foreground = hslToRgb(231, 56, 94);
const accentLight = hslToRgb(219, 83, 65);

describe("Cast row contrast (WCAG AA)", () => {
  it("name color (foreground) meets 4.5:1 on background", () => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("character role at 60% opacity meets 4.5:1 on background", () => {
    const dimmed = blend(foreground, background, 0.6);
    expect(contrast(dimmed, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("hover color (accent-light) meets 4.5:1 on background", () => {
    expect(contrast(accentLight, background)).toBeGreaterThanOrEqual(4.5);
  });
});
