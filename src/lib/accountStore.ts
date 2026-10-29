/**
 * Accounts signed in on this device, for switching without logging in again.
 * Holds the same tokens Supabase already keeps in localStorage for the active account; logging out
 * removes the account (see signOutCurrent in accounts.ts).
 */
export interface SavedAccount {
  userId: string;
  email: string | null;
  accessToken: string;
  refreshToken: string;
  lastUsed: number;
}

const KEY = "criticore-accounts";
const MAX_ACCOUNTS = 5;
export const ACCOUNTS_CHANGED = "criticore-accounts-changed";

const isAccount = (a: unknown): a is SavedAccount => {
  const x = a as SavedAccount;
  return !!x && typeof x.userId === "string" && typeof x.refreshToken === "string" && typeof x.accessToken === "string";
};

export function readAccounts(): SavedAccount[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter(isAccount) : [];
  } catch {
    return [];
  }
}

function write(list: SavedAccount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(ACCOUNTS_CHANGED));
  } catch {
    // Private mode or full storage: switching is just not offered
  }
}

/** Adds or refreshes an account; the most recently used one comes first, the oldest drops out after five */
export function saveAccount(account: Omit<SavedAccount, "lastUsed">) {
  const others = readAccounts().filter((a) => a.userId !== account.userId);
  write([{ ...account, lastUsed: Date.now() }, ...others].slice(0, MAX_ACCOUNTS));
}

export function forgetAccount(userId: string) {
  const list = readAccounts();
  if (list.some((a) => a.userId === userId)) write(list.filter((a) => a.userId !== userId));
}
