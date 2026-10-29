import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { XCircle as CancelTwoTone, CheckCircle2 as CheckCircleTwoTone, Trash as DeleteTwoTone } from "lucide-react";

interface Report { id: string; reporter_id: string; target_type: string; target_id: string; reason: string; description: string | null; status: string; created_at: string; }

const AdminReports = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState("open");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => { const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }); if (data) setReports(data); }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const logMod = async (targetId: string, action: string) => { await supabase.from("moderation_logs").insert({ admin_id: user!.id, target_type: "report", target_id: targetId, action }); };

  const resolveReport = async (report: Report) => { setActionLoading(report.id); await supabase.from("reports").update({ status: "resolved", resolved_by: user!.id, resolved_at: new Date().toISOString() }).eq("id", report.id); await logMod(report.id, "resolve_report"); toast.success(t("admin.reports.reportResolved")); await loadData(); setActionLoading(null); };
  const ignoreReport = async (report: Report) => { setActionLoading(report.id); await supabase.from("reports").update({ status: "ignored", resolved_by: user!.id, resolved_at: new Date().toISOString() }).eq("id", report.id); await logMod(report.id, "ignore_report"); toast.success(t("admin.reports.reportIgnored")); await loadData(); setActionLoading(null); };
  const deleteTarget = async (report: Report) => {
    if (!confirm(t("admin.reports.confirmDelete"))) return; setActionLoading(report.id);
    if (report.target_type === "comment") await supabase.from("comments").delete().eq("id", report.target_id);
    else if (report.target_type === "article") await supabase.from("articles").delete().eq("id", report.target_id);
    else if (report.target_type === "review") await supabase.from("reviews").delete().eq("id", report.target_id);
    await supabase.from("reports").update({ status: "resolved", resolved_by: user!.id, resolved_at: new Date().toISOString() }).eq("id", report.id);
    await logMod(report.id, "delete_reported_content"); toast.success(t("admin.reports.contentDeleted")); await loadData(); setActionLoading(null);
  };

  const filtered = reports.filter((r) => statusFilter === "all" || r.status === statusFilter);
  const statusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline" className="text-yellow-400 border-yellow-600/30">{t("admin.reports.open")}</Badge>;
      case "resolved": return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">{t("admin.reports.resolved")}</Badge>;
      case "ignored": return <Badge variant="secondary">{t("admin.reports.ignored")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t("admin.reports.title")}</h1><p className="text-muted-foreground text-sm">{t("admin.reports.openReports", { count: reports.filter((r) => r.status === "open").length })}</p></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="open">{t("admin.reports.open")}</SelectItem><SelectItem value="resolved">{t("admin.reports.resolved")}</SelectItem><SelectItem value="ignored">{t("admin.reports.ignored")}</SelectItem><SelectItem value="all">{t("admin.reports.all")}</SelectItem>
        </SelectContent></Select>
      </div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>{t("admin.reports.type")}</TableHead><TableHead>{t("admin.reports.reason")}</TableHead><TableHead>{t("admin.reports.description")}</TableHead><TableHead>{t("admin.reports.status")}</TableHead><TableHead>{t("admin.reports.date")}</TableHead><TableHead className="text-right">{t("admin.reports.actions")}</TableHead>
      </TableRow></TableHeader><TableBody>
        {filtered.map((report) => (
          <TableRow key={report.id}>
            <TableCell><Badge variant="secondary" className="capitalize text-xs">{report.target_type}</Badge></TableCell>
            <TableCell className="text-sm">{report.reason}</TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{report.description || "–"}</TableCell>
            <TableCell>{statusBadge(report.status)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(report.created_at)}</TableCell>
            <TableCell>{report.status === "open" ? (
              <div className="flex items-center gap-1 justify-end">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => resolveReport(report)} disabled={actionLoading === report.id}><CheckCircleTwoTone className="w-4 h-4 text-green-400" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => ignoreReport(report)} disabled={actionLoading === report.id}><CancelTwoTone className="w-4 h-4 text-muted-foreground" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTarget(report)} disabled={actionLoading === report.id}>{actionLoading === report.id ? <M3LoadingIndicator size={16} /> : <DeleteTwoTone className="w-4 h-4" />}</Button>
              </div>
            ) : <span className="text-xs text-muted-foreground">–</span>}</TableCell>
          </TableRow>
        ))}
        {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.reports.noReports")}</TableCell></TableRow>}
      </TableBody></Table></CardContent></Card>
    </div>
  );
};

export default AdminReports;
