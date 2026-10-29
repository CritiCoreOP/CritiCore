import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/locale";
import { toast } from "sonner";
import { ExternalLink as OpenInNewTwoTone, Search as SearchTwoTone, Headphones as SupportAgentTwoTone } from "lucide-react";

interface SupportTicket {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
}

const AdminSupport = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error(t("admin.tickets.updateError")); return; }
    if (user) {
      await supabase.from("moderation_logs").insert({
        admin_id: user.id, target_type: "support_ticket", target_id: id, action: `support_${newStatus}`,
      });
    }
    toast.success(t("admin.tickets.statusUpdated"));
    setSelected(null);
    loadData();
  };

  const filtered = tickets.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary", in_progress: "default", resolved: "outline", closed: "destructive",
    };
    return <Badge variant={map[status] || "secondary"} className="capitalize text-xs">{t(`admin.tickets.support_${status}`, status)}</Badge>;
  };

  const categoryBadge = (cat: string) => (
    <Badge variant="outline" className="capitalize text-xs">{t(`support.cat${cat.charAt(0).toUpperCase() + cat.slice(1)}`, cat)}</Badge>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SupportAgentTwoTone className="w-6 h-6 text-primary" />
          {t("admin.tickets.supportTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("admin.tickets.supportSubtitle", { count: tickets.length })}</p>
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
            <SelectItem value="open">{t("admin.tickets.support_open")}</SelectItem>
            <SelectItem value="in_progress">{t("admin.tickets.support_in_progress")}</SelectItem>
            <SelectItem value="resolved">{t("admin.tickets.support_resolved")}</SelectItem>
            <SelectItem value="closed">{t("admin.tickets.support_closed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>{t("admin.tickets.subject")}</TableHead>
                <TableHead>{t("admin.tickets.name")}</TableHead>
                <TableHead>{t("admin.tickets.category")}</TableHead>
                <TableHead>{t("admin.tickets.statusCol")}</TableHead>
                <TableHead>{t("admin.tickets.date")}</TableHead>
                <TableHead className="text-right">{t("admin.tickets.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t("admin.tickets.noTickets")}</TableCell></TableRow>
              )}
              {filtered.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(ticket)}>
                  <TableCell className="font-mono text-xs">{ticket.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{ticket.subject}</TableCell>
                  <TableCell className="text-sm">{ticket.name}</TableCell>
                  <TableCell>{categoryBadge(ticket.category)}</TableCell>
                  <TableCell>{statusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(ticket.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(ticket); }}>
                      <OpenInNewTwoTone className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Ticket #{selected.id.slice(0, 8).toUpperCase()}
                  {statusBadge(selected.status)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.name")}</p><p className="font-medium">{selected.name}</p></div>
                  <div><p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.email")}</p><p className="font-medium">{selected.email}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.subject")}</p><p className="font-medium">{selected.subject}</p></div>
                  <div><p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.category")}</p>{categoryBadge(selected.category)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t("admin.tickets.message")}</p>
                  <p className="whitespace-pre-wrap">{selected.message}</p>
                </div>
                {selected.user_id && (
                  <div><p className="text-muted-foreground text-xs mb-1">User ID</p><p className="font-mono text-xs">{selected.user_id}</p></div>
                )}
                <div className="flex gap-2 pt-2 flex-wrap">
                  {selected.status !== "in_progress" && <Button size="sm" variant="secondary" onClick={() => updateStatus(selected.id, "in_progress")}>{t("admin.tickets.support_in_progress")}</Button>}
                  {selected.status !== "resolved" && <Button size="sm" onClick={() => updateStatus(selected.id, "resolved")}>{t("admin.tickets.support_resolved")}</Button>}
                  {selected.status !== "closed" && <Button size="sm" variant="destructive" onClick={() => updateStatus(selected.id, "closed")}>{t("admin.tickets.support_closed")}</Button>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupport;
