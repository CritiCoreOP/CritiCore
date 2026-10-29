import { getLocale } from "@/lib/locale";

/** Number with the locale's separators; scores keep one decimal */
export const formatNumber = (n: number) => new Intl.NumberFormat(getLocale()).format(n);
export const formatScore = (n: number) => new Intl.NumberFormat(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

/** Tabs of the own profile, in order; the first one has no ?tab= in the URL */
export const OWN_TABS = ["reviews", "saves", "status", "lists", "friends", "badges"] as const;
export type OwnTab = (typeof OWN_TABS)[number];

export interface SavedEntry {
  id: string;
  target_id: string;
  target_type: string;
  created_at: string;
}
