import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDataOptOut } from "@/hooks/useDataOptOut";
import { Button } from "@/components/ui/button";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Bookmark as BookmarkBorderTwoTone, Bookmark as BookmarkTwoTone } from "lucide-react";

interface SaveButtonProps {
  targetId: string;
  targetType: "game" | "movie" | "series";
}

const SaveButton = ({ targetId, targetType }: SaveButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isOptedOut, guardOptOut } = useDataOptOut();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveId, setSaveId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkSaved();
    }
  }, [user, targetId, targetType]);

  const checkSaved = async () => {
    const { data } = await supabase
      .from("user_saves")
      .select("id")
      .eq("user_id", user!.id)
      .eq("target_id", targetId)
      .eq("target_type", targetType)
      .maybeSingle();

    if (data) {
      setSaved(true);
      setSaveId(data.id);
    } else {
      setSaved(false);
      setSaveId(null);
    }
  };

  const toggleSave = async () => {
    if (!user) {
      toast({
        title: t("save.notLoggedIn"),
        description: t("save.loginPrompt"),
        variant: "destructive",
      });
      return;
    }
    if (guardOptOut()) return;

    setLoading(true);
    try {
      if (saved && saveId) {
        await supabase.from("user_saves").delete().eq("id", saveId);
        setSaved(false);
        setSaveId(null);
        toast({ title: t("save.removed"), description: t("save.removedDesc") });
      } else {
        const { data } = await supabase
          .from("user_saves")
          .insert({
            user_id: user.id,
            target_id: targetId,
            target_type: targetType,
          })
          .select("id")
          .single();

        if (data) {
          setSaved(true);
          setSaveId(data.id);
          toast({ title: t("save.savedTitle"), description: t("save.savedDesc") });
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: t("save.error"), description: t("save.errorDesc"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size="sm"
      onClick={toggleSave}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <M3LoadingIndicator size={16} />
      ) : saved ? (
        <BookmarkTwoTone className="w-4 h-4" />
      ) : (
        <BookmarkBorderTwoTone className="w-4 h-4" />
      )}
      {/* Icon only on phones so the detail action row fits on one line; the text stays the accessible name */}
      <span className="max-sm:sr-only">{saved ? t("save.saved") : t("save.save")}</span>
    </Button>
  );
};

export default SaveButton;
