const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Counts per local day over the last `days` days; index 0 is the oldest day, the last one is today */
export function dailyBuckets(dates: (string | null | undefined)[], days: number, now: Date): number[] {
  const buckets = new Array<number>(days).fill(0);
  const today = startOfDay(now);
  for (const iso of dates) {
    if (!iso) continue;
    const t = new Date(iso);
    const back = Math.round((today - startOfDay(t)) / DAY);
    if (back >= 0 && back < days) buckets[days - 1 - back] += 1;
  }
  return buckets;
}

/** The last seven days against the seven before, as a whole percentage; null when there is nothing to compare */
export function weekTrend(buckets: number[]): number | null {
  const last = buckets.slice(-7).reduce((a, b) => a + b, 0);
  const before = buckets.slice(-14, -7).reduce((a, b) => a + b, 0);
  if (before === 0) return null;
  return Math.round(((last - before) / before) * 100);
}
