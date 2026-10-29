import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { forgetAccount } from "@/lib/accountStore";
import { useNavigate } from "@/lib/locale-router";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Deletes the signed-in account right away. One confirmation, no reason asked */
export default function DeleteAccountDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!user) return;
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
    if (error) {
      let code: string | undefined;
      try {
        code = (await (error as { context?: Response }).context?.json())?.error;
      } catch {
        /* no JSON body */
      }
      toast.error(code === "admin" ? t("account.delete.adminError") : t("account.delete.error"));
      setDeleting(false);
      return;
    }
    forgetAccount(user.id);
    // The login no longer exists; only this browser's session is left to clear
    await supabase.auth.signOut({ scope: "local" });
    onOpenChange(false);
    setDeleting(false);
    toast.success(t("account.delete.done"));
    navigate("/");
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("account.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("account.delete.body")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("account.delete.keep")}</AlertDialogCancel>
          {/* A plain button: the dialog must stay open while the deletion runs */}
          <Button type="button" variant="destructive" onClick={remove} disabled={deleting} className="gap-1.5">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            {deleting ? t("account.delete.deleting") : t("account.delete.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
