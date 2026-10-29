import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { User as PersonTwoTone } from "lucide-react";

export default function UsernameRequiredDialog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) { setOpen(false); setChecked(false); return; }
    // Check if user already has a username
    supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setChecked(true);
        if (!data?.username) {
          setOpen(true);
        }
      });
  }, [user]);

  if (!user || !checked) return null;

  const handleSave = async () => {
    const trimmed = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    if (trimmed.length < 3) {
      toast.error(t("usernameRequired.tooShort"));
      return;
    }
    if (trimmed.length > 30) {
      toast.error(t("usernameRequired.tooLong"));
      return;
    }
    setSaving(true);

    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", trimmed)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      toast.error(t("profile.usernameTaken"));
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed, username_changed_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error(t("profile.saveError"));
    } else {
      toast.success(t("usernameRequired.success"));
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm gap-0 p-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-8 pb-5 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 mb-3">
            <PersonTwoTone className="!text-2xl text-primary" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">{t("usernameRequired.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("usernameRequired.description")}</p>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("profile.username")}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                placeholder={t("profile.usernamePlaceholder")}
                className="pl-7"
                maxLength={30}
                autoFocus
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">{t("usernameRequired.rules")}</p>
          </div>

          <Button onClick={handleSave} disabled={saving || username.trim().length < 3} className="w-full">
            {saving ? t("common.loading") : t("usernameRequired.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
