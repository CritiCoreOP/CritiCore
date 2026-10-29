export type ReminderMediaType = "game" | "movie" | "series" | "anime";

/**
 * The release day when it is known to the day and still ahead, else null. IGDB files games that
 * only have a year under 31 December, so a game on that day counts as "day unknown".
 */
export function upcomingReleaseDay(iso: string | null | undefined, type: ReminderMediaType, now = new Date()): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const day = iso.slice(0, 10);
  if (type === "game" && day.endsWith("-12-31")) return null;
  // The mails go out in the morning German time, so "ahead" means from tomorrow on in Berlin
  const today = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  return day > today ? day : null;
}
