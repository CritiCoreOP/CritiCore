import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { Ban as BlockTwoTone, Trash as DeleteTwoTone, Pencil as EditTwoTone, Gavel as GavelTwoTone, ShieldCheck as VerifiedUserTwoTone, AlertTriangle as WarningTwoTone } from "lucide-react";

interface LogEntry {
  id: string;
  type: "warning" | "moderation";
  action: string;
  message?: string | null;
  category?: string;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; variant: "destructive" | "secondary" | "default" | "outline" }> = {
  ban: { icon: <BlockTwoTone className="!text-[14px]" />, label: "Gesperrt", variant: "destructive" },
  unban: { icon: <VerifiedUserTwoTone className="!text-[14px]" />, label: "Entsperrt", variant: "default" },
  warning: { icon: <WarningTwoTone className="!text-[14px]" />, label: "Verwarnung", variant: "secondary" },
  verify_press: { icon: <VerifiedUserTwoTone className="!text-[14px]" />, label: "Presse verifiziert", variant: "default" },
  revoke_press: { icon: <BlockTwoTone className="!text-[14px]" />, label: "Presse entzogen", variant: "destructive" },
  delete_comment: { icon: <DeleteTwoTone className="!text-[14px]" />, label: "Kommentar gelöscht", variant: "secondary" },
  delete_review: { icon: <DeleteTwoTone className="!text-[14px]" />, label: "Review gelöscht", variant: "secondary" },
  role_add_admin: { icon: <VerifiedUserTwoTone className="!text-[14px]" />, label: "Admin-Rolle erhalten", variant: "default" },
  role_add_press: { icon: <VerifiedUserTwoTone className="!text-[14px]" />, label: "Presse-Rolle erhalten", variant: "default" },
  role_remove_admin: { icon: <BlockTwoTone className="!text-[14px]" />, label: "Admin-Rolle entfernt", variant: "destructive" },
  role_remove_press: { icon: <BlockTwoTone className="!text-[14px]" />, label: "Presse-Rolle entfernt", variant: "destructive" },
};

function getActionDisplay(action: string) {
  return ACTION_CONFIG[action] || {
    icon: <EditTwoTone className="!text-[14px]" />,
    label: action.replace(/_/g, " "),
    variant: "secondary" as const,
  };
}

const WARNING_CATEGORIES: Record<string, string> = {
  spam: "Spam",
  harassment: "Belästigung",
  inappropriate: "Unangemessener Inhalt",
  misinformation: "Fehlinformation",
  other: "Sonstiges",
};

interface Props {
  userId: string;
}

const TransparencyLog = ({ userId }: Props) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [warningsRes, logsRes] = await Promise.all([
        supabase
          .from("user_warnings")
          .select("id, category, message, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("moderation_logs")
          .select("id, action, reason, created_at")
          .eq("target_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      const warningEntries: LogEntry[] = (warningsRes.data || []).map((w) => ({
        id: `w-${w.id}`,
        type: "warning",
        action: "warning",
        message: w.message,
        category: w.category,
        created_at: w.created_at,
      }));

      const modEntries: LogEntry[] = (logsRes.data || []).map((l) => ({
        id: `m-${l.id}`,
        type: "moderation",
        action: l.action,
        message: l.reason,
        created_at: l.created_at,
      }));

      const all = [...warningEntries, ...modEntries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setEntries(all);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-16 bg-secondary rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GavelTwoTone className="!text-[20px] text-primary" />
          {t("profile.transparencyLog", "Transparenz-Log")}
        </CardTitle>
        <CardDescription>
          {t("profile.transparencyLogDesc", "Alle Moderationsaktionen und Verwarnungen zu deinem Account.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("profile.noLogEntries", "Keine Einträge vorhanden – alles sauber! ✨")}
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const display = getActionDisplay(entry.action);
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50"
                >
                  <div className="shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 rounded-full bg-secondary">
                    {display.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={display.variant} className="text-[10px] h-5">
                        {display.label}
                      </Badge>
                      {entry.category && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {WARNING_CATEGORIES[entry.category] || entry.category}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                    {entry.message && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {entry.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransparencyLog;
