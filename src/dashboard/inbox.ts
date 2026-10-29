/** Everything that waits for an admin, merged into one list (the overview's "to do today") */

export type QueueKind = "reports" | "support" | "dmca" | "press" | "images" | "review";

export const QUEUE_KINDS: QueueKind[] = ["reports", "support", "dmca", "press", "images", "review"];

export interface QueueRow {
  id: string;
  title: string;
  /** Since when it waits (ISO) */
  at: string;
}

export interface QueueResult {
  kind: QueueKind;
  count: number;
  /** Oldest first */
  rows: QueueRow[];
}

export interface InboxEntry extends QueueRow {
  kind: QueueKind;
  ageHours: number;
  overdue: boolean;
  href: string;
}

/** After this long an item counts as overdue */
export const OVERDUE_HOURS = 48;

export const QUEUE_HREF: Record<QueueKind, string> = {
  reports: "/dashboard/admin/reports",
  support: "/dashboard/admin/support",
  dmca: "/dashboard/admin/dmca",
  press: "/dashboard/admin/press",
  images: "/dashboard/admin/images",
  review: "/news/board",
};

/** All queues as one list, the longest waiting first */
export function buildInbox(results: QueueResult[], now: number, limit = 12): InboxEntry[] {
  return results
    .flatMap((r) =>
      r.rows.map((row) => {
        const ageHours = Math.max(0, (now - new Date(row.at).getTime()) / 3_600_000);
        return { ...row, kind: r.kind, ageHours, overdue: ageHours >= OVERDUE_HOURS, href: QUEUE_HREF[r.kind] };
      }),
    )
    .sort((a, b) => b.ageHours - a.ageHours)
    .slice(0, limit);
}

export type QueueCounts = Record<QueueKind, number> & { all: number };

export function queueCounts(results: QueueResult[]): QueueCounts {
  const counts = Object.fromEntries(QUEUE_KINDS.map((k) => [k, 0])) as Record<QueueKind, number>;
  for (const r of results) counts[r.kind] = r.count;
  return { ...counts, all: QUEUE_KINDS.reduce((sum, k) => sum + counts[k], 0) };
}
