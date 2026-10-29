import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const STORAGE_KEY_PREFIX = "cc_full_optout_";

/**
 * Returns whether the current user has activated the full data-collection opt-out.
 * Also provides a guard function that shows a toast and returns `true` if blocked.
 */
export const useDataOptOut = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const isOptedOut = !!user && localStorage.getItem(`${STORAGE_KEY_PREFIX}${user.id}`) === "true";

  /** Call before any data-writing action. Returns true if the action should be blocked. */
  const guardOptOut = (): boolean => {
    if (isOptedOut) {
      toast.error(
        t("transparency.optOutBlocked", "Datensammlung ist deaktiviert"),
        {
          description: t(
            "transparency.optOutBlockedDesc",
            "Du hast die Datensammlung vollständig deaktiviert. Reaktiviere sie unter \"Meine Daten\", um diese Funktion zu nutzen."
          ),
        }
      );
      return true;
    }
    return false;
  };

  return { isOptedOut, guardOptOut };
};
