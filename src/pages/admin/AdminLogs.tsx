import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/locale";
import { Search as SearchTwoTone } from "lucide-react";

interface ModerationLog { id: string; admin_id: string; target_type: string; target_id: string; action: string; reason: string | null; created_at: string; }

const AdminLogs = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => { const { data } = await supabase.from("moderation_logs").select("*").order("created_at", { ascending: false }).limit(200); if (data) setLogs(data); }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const filtered = logs.filter((l) => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.target_type.toLowerCase().includes(search.toLowerCase()) || l.target_id.toLowerCase().includes(search.toLowerCase()));
  const actionColor = (action: string) => { if (action.includes("ban") || action.includes("delete")) return "destructive" as const; if (action.includes("verify")) return "default" as const; return "outline" as const; };

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">{t("admin.logs.title")}</h1><p className="text-muted-foreground text-sm">{t("admin.logs.subtitle")}</p></div>
      <div className="relative max-w-sm"><SearchTwoTone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.logs.searchPlaceholder")} className="pl-9" /></div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>{t("admin.logs.action")}</TableHead><TableHead>{t("admin.logs.type")}</TableHead><TableHead>{t("admin.logs.targetId")}</TableHead><TableHead>{t("admin.logs.adminId")}</TableHead><TableHead>{t("admin.logs.reason")}</TableHead><TableHead>{t("admin.logs.timestamp")}</TableHead>
      </TableRow></TableHeader><TableBody>
        {filtered.map((log) => (
          <TableRow key={log.id}>
            <TableCell><Badge variant={actionColor(log.action)} className="capitalize text-xs">{log.action.replace(/_/g, " ")}</Badge></TableCell>
            <TableCell><Badge variant="secondary" className="capitalize text-xs">{log.target_type}</Badge></TableCell>
            <TableCell><code className="text-xs text-muted-foreground">{log.target_id.slice(0, 8)}...</code></TableCell>
            <TableCell><code className="text-xs text-muted-foreground">{log.admin_id.slice(0, 8)}...</code></TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{log.reason || "–"}</TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
          </TableRow>
        ))}
        {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.logs.noLogs")}</TableCell></TableRow>}
      </TableBody></Table></CardContent></Card>
    </div>
  );
};

export default AdminLogs;
