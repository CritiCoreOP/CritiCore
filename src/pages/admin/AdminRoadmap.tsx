import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus as AddTwoTone, Trash as DeleteTwoTone, Pencil as EditTwoTone, EyeOff as VisibilityOffTwoTone, Eye as VisibilityTwoTone, ArrowDown as ArrowDownwardTwoTone, ArrowUp as ArrowUpwardTwoTone } from "lucide-react";
interface RoadmapItem {
  id: string;
  title_key: string;
  desc_key: string;
  status: string;
  quarter: string | null;
  old_quarter: string | null;
  sort_order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_ITEM = {
  title_key: "",
  desc_key: "",
  status: "planned",
  quarter: "",
  old_quarter: "",
  visible: true,
};

const AdminRoadmap = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<RoadmapItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("roadmap_items")
      .select("*")
      .order("sort_order");
    if (data) setItems(data as RoadmapItem[]);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) : 0;
    setEditingItem({ ...EMPTY_ITEM, sort_order: maxSort + 1 });
    setDialogOpen(true);
  };

  const openEdit = (item: RoadmapItem) => {
    setEditingItem({ ...item });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem?.title_key || !editingItem?.desc_key) {
      toast({ title: "Title Key und Desc Key sind Pflichtfelder", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title_key: editingItem.title_key,
      desc_key: editingItem.desc_key,
      status: editingItem.status || "planned",
      quarter: editingItem.quarter || null,
      old_quarter: editingItem.old_quarter || null,
      sort_order: editingItem.sort_order ?? 0,
      visible: editingItem.visible ?? true,
    };

    if (editingItem.id) {
      const { error } = await supabase.from("roadmap_items").update(payload).eq("id", editingItem.id);
      if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
      else toast({ title: "Gespeichert" });
    } else {
      const { error } = await supabase.from("roadmap_items").insert(payload);
      if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
      else toast({ title: "Erstellt" });
    }
    setSaving(false);
    setDialogOpen(false);
    setEditingItem(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    await supabase.from("roadmap_items").delete().eq("id", id);
    toast({ title: "Gelöscht" });
    fetchItems();
  };

  const handleToggleVisibility = async (item: RoadmapItem) => {
    await supabase.from("roadmap_items").update({ visible: !item.visible }).eq("id", item.id);
    fetchItems();
  };

  const handleMove = async (item: RoadmapItem, direction: "up" | "down") => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(i => i.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await Promise.all([
      supabase.from("roadmap_items").update({ sort_order: other.sort_order }).eq("id", item.id),
      supabase.from("roadmap_items").update({ sort_order: item.sort_order }).eq("id", other.id),
    ]);
    fetchItems();
  };

  const statusColor: Record<string, string> = {
    done: "bg-green-500/15 text-green-400 border-green-500/30",
    "in-progress": "bg-amber-500/15 text-amber-400 border-amber-500/30",
    planned: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roadmap</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} Einträge</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <AddTwoTone className="!text-[18px]" />
          Neuer Eintrag
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title Key</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quarter</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sichtbar</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Laden…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Keine Einträge</td></tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{item.sort_order}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{t(item.title_key)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.title_key}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColor[item.status] || ""}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {item.old_quarter && (
                        <span className="line-through text-muted-foreground text-xs">{item.old_quarter}</span>
                      )}
                      <span className="text-foreground text-xs">{item.quarter || "–"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleVisibility(item)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {item.visible ? <VisibilityTwoTone className="!text-[18px]" /> : <VisibilityOffTwoTone className="!text-[18px]" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleMove(item, "up")} disabled={idx === 0}
                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                        <ArrowUpwardTwoTone className="!text-[16px] text-muted-foreground" />
                      </button>
                      <button onClick={() => handleMove(item, "down")} disabled={idx === items.length - 1}
                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                        <ArrowDownwardTwoTone className="!text-[16px] text-muted-foreground" />
                      </button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <EditTwoTone className="!text-[16px] text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <DeleteTwoTone className="!text-[16px] text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? "Eintrag bearbeiten" : "Neuer Eintrag"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <Label>Title Key (i18n)</Label>
              <Input value={editingItem?.title_key || ""} onChange={e => setEditingItem(prev => ({ ...prev, title_key: e.target.value }))}
                placeholder="roadmap.items.xxx.title" />
            </div>
            <div>
              <Label>Description Key (i18n)</Label>
              <Input value={editingItem?.desc_key || ""} onChange={e => setEditingItem(prev => ({ ...prev, desc_key: e.target.value }))}
                placeholder="roadmap.items.xxx.desc" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editingItem?.status || "planned"} onValueChange={v => setEditingItem(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quarter</Label>
                <Input value={editingItem?.quarter || ""} onChange={e => setEditingItem(prev => ({ ...prev, quarter: e.target.value }))}
                  placeholder="Q2 2026" />
              </div>
              <div>
                <Label>Old Quarter</Label>
                <Input value={editingItem?.old_quarter || ""} onChange={e => setEditingItem(prev => ({ ...prev, old_quarter: e.target.value }))}
                  placeholder="Q1 2026" />
              </div>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={editingItem?.sort_order ?? 0}
                onChange={e => setEditingItem(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editingItem?.visible ?? true}
                onCheckedChange={v => setEditingItem(prev => ({ ...prev, visible: v }))} />
              <Label>Sichtbar</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Speichern…" : "Speichern"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoadmap;
