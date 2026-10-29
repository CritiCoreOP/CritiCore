import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNTS_CHANGED, readAccounts, type SavedAccount } from "@/lib/accountStore";
import { switchAccount } from "@/lib/accounts";
import { useNavigate } from "@/lib/locale-router";

export interface SwitchableAccount extends SavedAccount {
  name: string;
  avatarUrl: string | null;
}

/** Accounts saved on this device except the active one, with name and avatar from their profiles */
export function useSavedAccounts(currentUserId: string | undefined) {
  const [saved, setSaved] = useState(readAccounts);

  useEffect(() => {
    const update = () => setSaved(readAccounts());
    window.addEventListener(ACCOUNTS_CHANGED, update);
    // Another tab signed in or out
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(ACCOUNTS_CHANGED, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const others = saved.filter((a) => a.userId !== currentUserId);
  const ids = others.map((a) => a.userId).sort();

  const { data: profiles } = useQuery({
    queryKey: ["saved-account-profiles", ids.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", ids);
      return data ?? [];
    },
    enabled: ids.length > 0,
    staleTime: 10 * 60_000,
  });

  return others.map((a): SwitchableAccount => {
    const p = profiles?.find((x) => x.user_id === a.userId);
    return { ...a, name: p?.display_name || p?.username || a.email || "?", avatarUrl: p?.avatar_url ?? null };
  });
}

export function useAccountActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const switchTo = async (account: SwitchableAccount) => {
    const result = await switchAccount(account.userId);
    if (result === "ok") {
      // Start fresh: cached queries, realtime channels and page state belong to the previous account
      window.location.reload();
      return;
    }
    toast.error(t("account.sessionExpired", { name: account.name }));
    navigate("/auth?add=1");
  };

  const addAccount = () => navigate("/auth?add=1");

  return { switchTo, addAccount };
}
