import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isBot } from "@/lib/bot";

const IP_CHECK_KEY = "cc_ip_ban_check";
// A clean result holds for six hours; a ban is checked again on every load
const IP_CHECK_TTL = 6 * 3600_000;

function recentCleanCheck(): boolean {
  try {
    const at = Number(localStorage.getItem(IP_CHECK_KEY));
    return Number.isFinite(at) && Date.now() - at < IP_CHECK_TTL;
  } catch {
    return false;
  }
}

interface BanState {
  banned: boolean;
  reason: string | null;
  type: "account" | "ip" | null;
  loading: boolean;
}

export function useBanCheck(): BanState {
  const { user } = useAuth();
  const [state, setState] = useState<BanState>({ banned: false, reason: null, type: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Check account ban using secure function (doesn't expose ban_reason publicly)
      if (user) {
        const { data: banInfo } = await supabase.rpc("get_own_ban_info");

        if (!cancelled && banInfo && banInfo.length > 0 && banInfo[0].status === "banned") {
          setState({ banned: true, reason: banInfo[0].ban_reason, type: "account", loading: false });
          return;
        }
      }

      // IP ban via edge function, at most every six hours per browser; crawlers skip it
      try {
        if (!isBot() && !recentCleanCheck()) {
          const { data } = await supabase.functions.invoke("check-ip-ban");
          if (!cancelled && data?.banned) {
            setState({ banned: true, reason: data.reason, type: "ip", loading: false });
            return;
          }
          if (data && !data.banned) {
            try { localStorage.setItem(IP_CHECK_KEY, String(Date.now())); } catch { /* storage blocked */ }
          }
        }
      } catch (e) {
        // Don't block the app if IP check fails
        console.warn("IP ban check failed:", e);
      }

      if (!cancelled) {
        setState({ banned: false, reason: null, type: null, loading: false });
      }
    };

    check();
    return () => { cancelled = true; };
  }, [user]);

  return state;
}
