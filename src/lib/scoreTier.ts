/**
 * Shared score → tier utility (0–10 scale).
 *
 *   score >= 7.0 → "high" (uses --score-high)
 *   score >= 5.0 → "mid"  (uses --score-mid)
 *   score  < 5.0 → "low"  (uses --score-low)
 *
 * Utility classes here reference semantic tokens only — never hard-coded colors.
 */

export type ScoreTier = "high" | "mid" | "low";

export const getScoreTier = (score: number): ScoreTier => {
  if (score >= 7) return "high";
  if (score >= 5) return "mid";
  return "low";
};

/** Text color class for the score number and the star icon (via currentColor). */
export const scoreTierTextClass = (tier: ScoreTier) =>
  tier === "high" ? "text-score-high" : tier === "mid" ? "text-score-mid" : "text-score-low";

/** Border color at 40% opacity — matches the tier. */
export const scoreTierBorderClass = (tier: ScoreTier) =>
  tier === "high" ? "border-score-high/40" : tier === "mid" ? "border-score-mid/40" : "border-score-low/40";

/** Subtle tier glow shadow, referenced as an arbitrary value class. */
export const scoreTierGlowClass = (tier: ScoreTier) =>
  tier === "high"
    ? "shadow-[0_0_16px_-6px_hsl(var(--score-high)/0.35)]"
    : tier === "mid"
      ? "shadow-[0_0_16px_-6px_hsl(var(--score-mid)/0.35)]"
      : "shadow-[0_0_16px_-6px_hsl(var(--score-low)/0.35)]";
