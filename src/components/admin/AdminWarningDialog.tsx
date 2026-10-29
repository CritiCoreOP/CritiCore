import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetDisplayName: string | null;
}

const CATEGORIES = [
  { value: "rule_violation", labelKey: "warnings.categories.rule_violation" },
  { value: "spam", labelKey: "warnings.categories.spam" },
  { value: "harassment", labelKey: "warnings.categories.harassment" },
  { value: "misinformation", labelKey: "warnings.categories.misinformation" },
  { value: "other", labelKey: "warnings.categories.other" },
];

export default function AdminWarningDialog({ open, onOpenChange, targetUserId, targetDisplayName }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!category || !user) return;
    setSending(true);

    const { error } = await supabase.from("user_warnings").insert({
      user_id: targetUserId,
      issued_by: user.id,
      category,
      message: message.trim() || null,
    });

    if (error) {
      toast.error(t("warnings.sendError", "Warnung konnte nicht gesendet werden"));
    } else {
      // Log moderation action
      await supabase.from("moderation_logs").insert({
        admin_id: user.id,
        target_type: "user",
        target_id: targetUserId,
        action: `warning_${category}`,
        reason: message.trim() || null,
      });
      toast.success(t("warnings.sent", "Warnung gesendet"));
      setCategory("");
      setMessage("");
      onOpenChange(false);
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("warnings.sendWarning", "Warnung senden")} – {targetDisplayName || t("admin.users.unnamed")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("warnings.category", "Kategorie")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t("warnings.selectCategory", "Kategorie wählen")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {t(c.labelKey, c.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("warnings.message", "Nachricht (optional)")}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("warnings.messagePlaceholder", "Beschreibe den Grund der Warnung...")}
              maxLength={1000}
              rows={4}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!category || sending}
            className="w-full"
            variant="destructive"
          >
            {t("warnings.send", "Warnung senden")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
