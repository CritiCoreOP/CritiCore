import { supabase } from "@/integrations/supabase/client";
import { forgetAccount, readAccounts, saveAccount } from "@/lib/accountStore";

let listening = false;

/** Keeps the stored tokens of the active account current, so switching back later still works */
export function rememberSignedInAccounts() {
  if (listening) return;
  listening = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) return;
    if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      saveAccount({
        userId: session.user.id,
        email: session.user.email ?? null,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
    }
  });
}

/**
 * Makes a saved account the active one. The other account stays signed in on the server, so it can
 * be switched back to. "expired" when its refresh token no longer works (logged out elsewhere).
 */
export async function switchAccount(userId: string): Promise<"ok" | "expired"> {
  const target = readAccounts().find((a) => a.userId === userId);
  if (!target) return "expired";
  const { error } = await supabase.auth.setSession({ access_token: target.accessToken, refresh_token: target.refreshToken });
  if (error) {
    forgetAccount(userId);
    return "expired";
  }
  return "ok";
}

/** Logs out the active account and removes it from this device; other saved accounts stay */
export async function signOutCurrent() {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  await supabase.auth.signOut();
  if (userId) forgetAccount(userId);
}
