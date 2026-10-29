/** Last search terms, shared by the search overlay and the search results page (this browser only) */
const RECENTS_KEY = "cc:recent-searches";
export const MAX_RECENT_SEARCHES = 6;

export function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

/** Puts `query` first (case-insensitive, no duplicates) and returns the new list */
export function rememberSearch(query: string): string[] {
  const term = query.trim();
  const current = readRecentSearches();
  if (term.length < 2) return current;
  const next = [term, ...current.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
  return next;
}
