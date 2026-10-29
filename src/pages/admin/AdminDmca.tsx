import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/locale";
import { toast } from "sonner";
import { Gavel as GavelTwoTone, ExternalLink as OpenInNewTwoTone, Search as SearchTwoTone } from "lucide-react";

interface DmcaRequest {
  id: string;
  full_name: string;
  email: string;
  content_url: string;
  original_work_url: string | null;
  description: string;
  sworn_statement: boolean;
  status: string;
  created_at: string;
}

const AdminDmca = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState<DmcaRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DmcaRequest | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("dmca_requests").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("dmca_requests").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error(t("admin.tickets.updateError")); return; }
    if (user) {
      await supabase.from("moderation_logs").insert({
        admin_id: user.id, target_type: "dmca_request", target_id: id, action: `dmca_${newStatus}`,
      });
    }
    toast.success(t("admin.tickets.statusUpdated"));
    setSelected(null);
    loadData();
  };

  const filtered = requests.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary", in_review: "default", resolved: "outline", rejected: "destructive",
    };
    return <Badge variant={map[status] || "secondary"} className="capitalize text-xs">{t(`admin.tickets.status_${status}`, status)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GavelTwoTone className="w-6 h-6 text-primary" />
          {t("admin.tickets.dmcaTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("admin.tickets.dmcaSubtitle", { count: requests.length })}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchTwoTone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("admin.tickets.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.tickets.allFilter")}</SelectItem>
            <SelectItem value="pending">{t("admin.tickets.status_pending")}</SelectItem>
            <SelectItem value="in_review">{t("admin.tickets.status_in_review")}</SelectItem>
            <SelectItem value="resolved">{t("admin.tickets.status_resolved")}</SelectItem>
            <SelectItem value="rejected">{t("admin.tickets.status_rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>{t("admin.tickets.name")}</TableHead>
                <TableHead>{t("admin.tickets.email")}</TableHead>
                <TableHead>{t("admin.tickets.statusCol")}</TableHead>
                <TableHead>{t("admin.tickets.date")}</TableHead>
                <TableHead className="text-right">{t("admin.tickets.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.tickets.noTickets")}</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                  <TableCell className="font-mono text-xs">{r.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.email}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>
                      <OpenInNewTwoTone className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  DMCA #{selected.id.slice(0, 8).toUpperCase()}
                  {statusBadge(selected.status)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.name")}</p><p className="font-medium">{selected.full_name}</p></div>
                  <div><p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.email")}</p><p className="font-medium">{selected.email}</p></div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.contentUrl")}</p>
                  <a href={selected.content_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{selected.content_url}</a>
                </div>
                {selected.original_work_url && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.originalUrl")}</p>
                    <a href={selected.original_work_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{selected.original_work_url}</a>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.description")}</p>
                  <p className="whitespace-pre-wrap">{selected.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.sworn")}</p>
                  <Badge variant={selected.sworn_statement ? "default" : "destructive"}>{selected.sworn_statement ? "✓" : "✗"}</Badge>
                </div>
                <div className="flex gap-2 pt-2 flex-wrap">
                  {selected.status !== "in_review" && <Button size="sm" variant="secondary" onClick={() => updateStatus(selected.id, "in_review")}>{t("admin.tickets.status_in_review")}</Button>}
                  {selected.status !== "resolved" && <Button size="sm" onClick={() => updateStatus(selected.id, "resolved")}>{t("admin.tickets.status_resolved")}</Button>}
                  {selected.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => updateStatus(selected.id, "rejected")}>{t("admin.tickets.status_rejected")}</Button>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDmca;
