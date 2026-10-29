/** Pure helpers behind the profile pages, kept apart so they can be tested without React */

export type ReviewSort = "newest" | "best" | "worst";

export interface ScoredReview {
  score: number;
  created_at: string;
}

const DAY = 24 * 60 * 60 * 1000;

/** Days until a cooldown since `changedAt` is over; 0 when a change is allowed now */
export function daysUntilChange(changedAt: string | null | undefined, cooldownDays: number, now = Date.now()): number {
  if (!changedAt) return 0;
  const next = new Date(changedAt).getTime() + cooldownDays * DAY;
  return now >= next ? 0 : Math.ceil((next - now) / DAY);
}

/** Average score with one decimal, or null without reviews */
export function averageScore(reviews: ScoredReview[]): number | null {
  if (reviews.length === 0) return null;
  return Math.round((reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length) * 10) / 10;
}

/**
 * Reviews per whole point, 1 to 10. Scores go from 0.5 to 10 in half steps; a half step counts
 * towards the point above it (0.5 is 1, 7.5 is 8), the way the score is shown rounded elsewhere.
 */
export function scoreBuckets(reviews: ScoredReview[]): number[] {
  const buckets = Array.from({ length: 10 }, () => 0);
  for (const r of reviews) {
    const point = Math.min(10, Math.max(1, Math.ceil(r.score)));
    buckets[point - 1]++;
  }
  return buckets;
}

export function sortReviews<T extends ScoredReview>(reviews: T[], sort: ReviewSort): T[] {
  const byDate = (a: T, b: T) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  const copy = [...reviews];
  if (sort === "best") return copy.sort((a, b) => b.score - a.score || byDate(a, b));
  if (sort === "worst") return copy.sort((a, b) => a.score - b.score || byDate(a, b));
  return copy.sort(byDate);
}

export type KarmaRank = "legend" | "veteran" | "experienced" | "active";

export function karmaRank(karma: number): KarmaRank | null {
  if (karma >= 5000) return "legend";
  if (karma >= 1000) return "veteran";
  if (karma >= 500) return "experienced";
  if (karma >= 100) return "active";
  return null;
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 300;

export const normalizeUsername = (value: string) => value.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, USERNAME_MAX);

/** Initials for the avatar fallback: first letters of the first two words */
export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]).join("").toUpperCase() || "?";
}

export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export type AvatarProblem = "type" | "size" | null;

export function checkAvatarFile(file: { type: string; size: number }): AvatarProblem {
  if (!AVATAR_TYPES.includes(file.type)) return "type";
  if (file.size > AVATAR_MAX_BYTES) return "size";
  return null;
}
