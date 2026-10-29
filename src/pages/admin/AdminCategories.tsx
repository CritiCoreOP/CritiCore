import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch as AccountTreeTwoTone, Plus as AddTwoTone, Trash as DeleteTwoTone, Pencil as EditTwoTone, Layers as LayersTwoTone, Search as SearchTwoTone } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
}

interface MediaCategory {
  id: string;
  media_id: string;
  media_type: string;
  category_id: string;
  created_at: string;
}

const emptyForm = { name: "", slug: "", description: "", parent_id: "", sort_order: 0 };

const AdminCategories = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<MediaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Category CRUD
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState(emptyForm);
  const [catSaving, setCatSaving] = useState(false);

  // Assignment form
  const [mediaIds, setMediaIds] = useState("");
  const [mediaType, setMediaType] = useState<string>("movie");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    const [catRes, assignRes] = await Promise.all([
      supabase.from("categories").select("id, name, slug, description, parent_id, sort_order").order("sort_order"),
      supabase.from("media_categories").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (assignRes.data) setAssignments(assignRes.data);
    setSelectedAssignments(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Category CRUD handlers ---
  const openCreateDialog = () => {
    setEditingCat(null);
    setCatForm(emptyForm);
    setCatDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      parent_id: cat.parent_id || "",
      sort_order: cat.sort_order ?? 0,
    });
    setCatDialogOpen(true);
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const handleCatSave = async () => {
    if (!catForm.name.trim()) { toast.error("Name ist erforderlich."); return; }
    const slug = catForm.slug.trim() || autoSlug(catForm.name);
    setCatSaving(true);

    const payload: any = {
      name: catForm.name.trim(),
      slug,
      description: catForm.description.trim() || null,
      parent_id: catForm.parent_id || null,
      sort_order: catForm.sort_order,
    };

    if (editingCat) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editingCat.id);
      if (error) toast.error("Fehler: " + error.message);
      else toast.success("Kategorie aktualisiert.");
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) toast.error("Fehler: " + error.message);
      else toast.success("Kategorie erstellt.");
    }
    setCatSaving(false);
    setCatDialogOpen(false);
    await loadData();
  };

  const handleCatDelete = async (id: string) => {
    const hasChildren = categories.some(c => c.parent_id === id);
    if (hasChildren) { toast.error("Kategorie hat Unterkategorien. Bitte zuerst entfernen."); return; }
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error("Fehler: " + error.message);
    else { toast.success("Kategorie gelöscht."); await loadData(); }
  };

  // --- Assignment handlers (unchanged logic) ---
  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleBulkAdd = async () => {
    const ids = mediaIds.split(",").map(s => s.trim()).filter(Boolean);
    if (ids.length === 0 || selectedCategories.length === 0) {
      toast.error("Bitte mindestens eine Media-ID und eine Kategorie angeben."); return;
    }
    setAdding(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const existingSet = new Set(assignments.map(a => `${a.media_id}|${a.media_type}|${a.category_id}`));
    const rows = ids.flatMap(id =>
      selectedCategories
        .filter(catId => !existingSet.has(`${id}|${mediaType}|${catId}`))
        .map(catId => ({ media_id: id, media_type: mediaType, category_id: catId, assigned_by: userId }))
    );
    if (rows.length === 0) { toast.error("Alle Zuordnungen existieren bereits."); setAdding(false); return; }
    const { error } = await supabase.from("media_categories").insert(rows);
    if (error) toast.error("Fehler: " + error.message);
    else { toast.success(`${rows.length} Zuordnung(en) erstellt!`); setMediaIds(""); setSelectedCategories([]); await loadData(); }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("media_categories").delete().eq("id", id);
    if (error) toast.error("Fehler beim Entfernen.");
    else { toast.success("Zuordnung entfernt."); setAssignments(prev => prev.filter(a => a.id !== id)); }
  };

  const handleBulkRemove = async () => {
    if (selectedAssignments.size === 0) return;
    const ids = Array.from(selectedAssignments);
    const { error } = await supabase.from("media_categories").delete().in("id", ids);
    if (error) toast.error("Fehler beim Entfernen.");
    else { toast.success(`${ids.length} Zuordnung(en) entfernt.`); setAssignments(prev => prev.filter(a => !selectedAssignments.has(a.id))); setSelectedAssignments(new Set()); }
  };

  const toggleAssignment = (id: string) => {
    setSelectedAssignments(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const filtered = filterCategory === "all" ? assignments : assignments.filter(a => a.category_id === filterCategory);

  const toggleAllFiltered = () => {
    const filteredIds = filtered.map(a => a.id);
    const allSelected = filteredIds.every(id => selectedAssignments.has(id));
    setSelectedAssignments(prev => {
      const next = new Set(prev);
      filteredIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
  const getParentName = (id: string | null) => id ? (categories.find(c => c.id === id)?.name || "–") : "–";

  const mediaTypeLabel = (type: string) => {
    switch (type) { case "movie": return "Film"; case "series": return "Serie"; case "game": return "Game"; default: return type; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.categories.title", "Kategorien verwalten")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.categories.subtitle", "Kategorien erstellen, bearbeiten und Media zuweisen")}</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories" className="flex items-center gap-1.5">
            <AccountTreeTwoTone className="w-4 h-4" /> Kategorien
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-1.5">
            <LayersTwoTone className="w-4 h-4" /> Zuweisungen
          </TabsTrigger>
        </TabsList>

        {/* === TAB 1: Category CRUD === */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{categories.length} Kategorien</span>
            <Button size="sm" onClick={openCreateDialog}>
              <AddTwoTone className="w-4 h-4 mr-1" /> Neue Kategorie
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><M3LoadingIndicator size={32} /></div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Eltern</TableHead>
                    <TableHead className="text-center">Reihenfolge</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell>{getParentName(cat.parent_id)}</TableCell>
                      <TableCell className="text-center">{cat.sort_order ?? 0}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(cat)}>
                          <EditTwoTone className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleCatDelete(cat.id)}>
                          <DeleteTwoTone className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Keine Kategorien vorhanden.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* === TAB 2: Assignments (existing) === */}
        <TabsContent value="assignments" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><LayersTwoTone className="w-4 h-4" /> Bulk-Zuordnung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Film</SelectItem>
                    <SelectItem value="series">Serie</SelectItem>
                    <SelectItem value="game">Game</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Media-IDs (kommagetrennt)" value={mediaIds} onChange={e => setMediaIds(e.target.value)} className="flex-1" />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Kategorien auswählen:</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button key={c.id} type="button" onClick={() => toggleCategory(c.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${selectedCategories.includes(c.id) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleBulkAdd} disabled={adding}>
                  {adding ? <M3LoadingIndicator size={16} /> : <AddTwoTone className="w-4 h-4 mr-1" />}
                  Zuweisen
                </Button>
                {mediaIds && selectedCategories.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {mediaIds.split(",").filter(s => s.trim()).length} ID(s) × {selectedCategories.length} Kategorie(n)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 flex-wrap">
            <SearchTwoTone className="w-4 h-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{filtered.length} Zuordnungen</span>
            {selectedAssignments.size > 0 && (
              <Button size="sm" variant="destructive" onClick={handleBulkRemove}>
                <DeleteTwoTone className="w-3.5 h-3.5 mr-1" /> {selectedAssignments.size} entfernen
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><M3LoadingIndicator size={32} /></div>
          ) : (
            <div className="space-y-2">
              {filtered.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <Checkbox checked={filtered.length > 0 && filtered.every(a => selectedAssignments.has(a.id))} onCheckedChange={toggleAllFiltered} />
                  <span className="text-xs text-muted-foreground">Alle auswählen</span>
                </div>
              )}
              {filtered.map(a => (
                <Card key={a.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox checked={selectedAssignments.has(a.id)} onCheckedChange={() => toggleAssignment(a.id)} />
                        <Badge variant="secondary" className="capitalize shrink-0">{mediaTypeLabel(a.media_type)}</Badge>
                        <span className="text-sm font-mono text-foreground">{a.media_id}</span>
                        <span className="text-muted-foreground text-sm">→</span>
                        <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0">{getCategoryName(a.category_id)}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => handleRemove(a.id)}>
                        <DeleteTwoTone className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Zuordnungen vorhanden.</CardContent></Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Category Create/Edit Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Kategorie bearbeiten" : "Neue Kategorie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value, slug: f.slug || autoSlug(e.target.value) }))} placeholder="z.B. Sci-Fi" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generiert" />
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung</Label>
              <Textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Elternkategorie</Label>
                <Select value={catForm.parent_id || "none"} onValueChange={v => setCatForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine</SelectItem>
                    {categories.filter(c => c.id !== editingCat?.id).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reihenfolge</Label>
                <Input type="number" value={catForm.sort_order} onChange={e => setCatForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCatSave} disabled={catSaving}>
              {catSaving && <M3LoadingIndicator size={16} className="inline-flex mr-1" />}
              {editingCat ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
