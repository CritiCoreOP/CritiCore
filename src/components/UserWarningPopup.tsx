import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { AlertTriangle as WarningAmberTwoTone } from "lucide-react";

interface Warning {
  id: string;
  category: string;
  message: string | null;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  rule_violation: "bg-red-600/20 text-red-400 border-red-600/30",
  spam: "bg-orange-600/20 text-orange-400 border-orange-600/30",
  harassment: "bg-red-600/20 text-red-400 border-red-600/30",
  misinformation: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  other: "bg-muted text-muted-foreground",
};

export default function UserWarningPopup() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("user_warnings")
        .select("id, category, message, created_at")
        .eq("user_id", user.id)
        .eq("acknowledged", false)
        .order("created_at", { ascending: true });
      if (data && data.length > 0) setWarnings(data);
    };
    load();
  }, [user]);

  const current = warnings[currentIdx];
  if (!current) return null;

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    await supabase
      .from("user_warnings")
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq("id", current.id);

    const next = currentIdx + 1;
    if (next < warnings.length) {
      setCurrentIdx(next);
    } else {
      setWarnings([]);
    }
    setAcknowledging(false);
  };

  const categoryLabel = t(`warnings.categories.${current.category}`, current.category);

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md border-destructive/40 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
            <WarningAmberTwoTone className="w-8 h-8 text-destructive" />
          </div>

          <h2 className="text-xl font-bold">{t("warnings.title", "Warnung")}</h2>

          <Badge className={CATEGORY_COLORS[current.category] || CATEGORY_COLORS.other}>
            {categoryLabel}
          </Badge>

          {current.message && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              {current.message}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {new Date(current.created_at).toLocaleDateString()}
          </p>

          {warnings.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {t("warnings.count", "Warnung {{current}} von {{total}}", {
                current: currentIdx + 1,
                total: warnings.length,
              })}
            </p>
          )}

          <Button
            onClick={handleAcknowledge}
            disabled={acknowledging}
            className="w-full mt-2"
            variant="destructive"
          >
            {t("warnings.acknowledge", "Verstanden")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
