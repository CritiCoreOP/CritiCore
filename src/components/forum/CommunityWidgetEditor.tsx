import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE } from "@/lib/compressImage";
import { toast } from "sonner";
import { Plus as AddTwoTone, Bookmark as BookmarkTwoTone, X as CloseTwoTone, Trash as DeleteTwoTone, GripVertical as DragIndicatorTwoTone, Gavel as GavelTwoTone, Image as ImageTwoTone, CalendarDays as CalendarMonthTwoTone, MousePointerClick as SmartButtonTwoTone, Pointer as TouchAppTwoTone } from "lucide-react";
type WidgetType = "image" | "button" | "image_button" | "bookmarks" | "rules" | "calendar";

interface Widget {
  id?: string;
  community_id: string;
  widget_type: WidgetType;
  title: string;
  content: any;
  sort_order: number;
}

const WIDGET_TYPES: { type: WidgetType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "image", label: "Bild", icon: <ImageTwoTone className="!text-lg" />, desc: "Ein Bild mit optionalem Link" },
  { type: "button", label: "Button", icon: <SmartButtonTwoTone className="!text-lg" />, desc: "Ein klickbarer Button" },
  { type: "image_button", label: "Bild-Button", icon: <TouchAppTwoTone className="!text-lg" />, desc: "Ein Bild als Button mit Link" },
  { type: "bookmarks", label: "Lesezeichen", icon: <BookmarkTwoTone className="!text-lg" />, desc: "Liste von Links" },
  { type: "rules", label: "Regeln", icon: <GavelTwoTone className="!text-lg" />, desc: "Community-Regeln" },
  { type: "calendar", label: "Kalender", icon: <CalendarMonthTwoTone className="!text-lg" />, desc: "Termine und Events" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  communityId: string;
  widgets: Widget[];
  onUpdated: () => void;
}

export default function CommunityWidgetEditor({ open, onClose, communityId, widgets, onUpdated }: Props) {
  const [adding, setAdding] = useState<WidgetType | null>(null);
  const [saving, setSaving] = useState(false);

  // New widget form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState<any>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const resetForm = () => {
    setAdding(null);
    setNewTitle("");
    setNewContent({});
  };

  const handleUploadWidgetImage = async (original: File): Promise<string | null> => {
    setUploadingImage(true);
    const file = await compressImage(original, ARTICLE_IMAGE);
    const ext = file.name.split(".").pop();
    const path = `communities/${communityId}/widget-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("forum-images").upload(path, file);
    if (error) { toast.error("Upload fehlgeschlagen"); setUploadingImage(false); return null; }
    const { data } = supabase.storage.from("forum-images").getPublicUrl(path);
    setUploadingImage(false);
    return data.publicUrl;
  };

  const handleSaveWidget = async () => {
    if (!adding || !newTitle.trim()) { toast.error("Titel erforderlich"); return; }
    setSaving(true);
    const { error } = await supabase.from("forum_community_widgets" as any).insert({
      community_id: communityId,
      widget_type: adding,
      title: newTitle.trim(),
      content: newContent,
      sort_order: widgets.length,
    });
    if (!error) {
      toast.success("Widget hinzugefügt!");
      resetForm();
      onUpdated();
    } else {
      toast.error("Fehler beim Speichern");
    }
    setSaving(false);
  };

  const handleDeleteWidget = async (widgetId: string) => {
    const { error } = await supabase.from("forum_community_widgets" as any).delete().eq("id", widgetId);
    if (!error) {
      toast.success("Widget entfernt");
      onUpdated();
    } else {
      toast.error("Fehler beim Löschen");
    }
  };

  const renderAddForm = () => {
    if (!adding) return null;

    return (
      <div className="space-y-3 border border-primary/30 rounded-xl p-4 bg-secondary/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {WIDGET_TYPES.find((w) => w.type === adding)?.label} hinzufügen
          </h3>
          <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
            <CloseTwoTone className="!text-lg" />
          </button>
        </div>

        <Input placeholder="Widget-Titel" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="text-sm" />

        {/* Type-specific fields */}
        {adding === "image" && (
          <div className="space-y-2">
            {newContent.image_url && (
              <img src={newContent.image_url} alt="" className="w-full rounded-lg max-h-32 object-cover" />
            )}
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              <ImageTwoTone className="!text-sm" />
              {uploadingImage ? "Hochladen..." : "Bild auswählen"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await handleUploadWidgetImage(f);
                    if (url) setNewContent((c: any) => ({ ...c, image_url: url }));
                  }
                }} />
            </label>
            <Input placeholder="Link (optional)" value={newContent.link_url || ""} onChange={(e) => setNewContent((c: any) => ({ ...c, link_url: e.target.value }))} className="text-sm" />
          </div>
        )}

        {adding === "button" && (
          <div className="space-y-2">
            <Input placeholder="Button-Text" value={newContent.label || ""} onChange={(e) => setNewContent((c: any) => ({ ...c, label: e.target.value }))} className="text-sm" />
            <Input placeholder="Link-URL" value={newContent.link_url || ""} onChange={(e) => setNewContent((c: any) => ({ ...c, link_url: e.target.value }))} className="text-sm" />
          </div>
        )}

        {adding === "image_button" && (
          <div className="space-y-2">
            {newContent.image_url && (
              <img src={newContent.image_url} alt="" className="w-full rounded-lg max-h-32 object-cover" />
            )}
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              <ImageTwoTone className="!text-sm" />
              {uploadingImage ? "Hochladen..." : "Bild auswählen"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await handleUploadWidgetImage(f);
                    if (url) setNewContent((c: any) => ({ ...c, image_url: url }));
                  }
                }} />
            </label>
            <Input placeholder="Link-URL" value={newContent.link_url || ""} onChange={(e) => setNewContent((c: any) => ({ ...c, link_url: e.target.value }))} className="text-sm" />
          </div>
        )}

        {adding === "bookmarks" && (
          <div className="space-y-2">
            {(newContent.links || []).map((link: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Label" value={link.label} className="text-sm flex-1"
                  onChange={(e) => {
                    const links = [...(newContent.links || [])];
                    links[i] = { ...links[i], label: e.target.value };
                    setNewContent((c: any) => ({ ...c, links }));
                  }} />
                <Input placeholder="URL" value={link.url} className="text-sm flex-1"
                  onChange={(e) => {
                    const links = [...(newContent.links || [])];
                    links[i] = { ...links[i], url: e.target.value };
                    setNewContent((c: any) => ({ ...c, links }));
                  }} />
                <button onClick={() => {
                  const links = (newContent.links || []).filter((_: any, j: number) => j !== i);
                  setNewContent((c: any) => ({ ...c, links }));
                }} className="text-muted-foreground hover:text-destructive">
                  <CloseTwoTone className="!text-sm" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
              setNewContent((c: any) => ({ ...c, links: [...(c.links || []), { label: "", url: "" }] }));
            }}>
              <AddTwoTone className="!text-sm" /> Link hinzufügen
            </Button>
          </div>
        )}

        {adding === "rules" && (
          <div className="space-y-2">
            {(newContent.rules || []).map((rule: string, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground font-bold w-5 shrink-0">{i + 1}.</span>
                <Input value={rule} className="text-sm flex-1"
                  onChange={(e) => {
                    const rules = [...(newContent.rules || [])];
                    rules[i] = e.target.value;
                    setNewContent((c: any) => ({ ...c, rules }));
                  }} />
                <button onClick={() => {
                  const rules = (newContent.rules || []).filter((_: any, j: number) => j !== i);
                  setNewContent((c: any) => ({ ...c, rules }));
                }} className="text-muted-foreground hover:text-destructive">
                  <CloseTwoTone className="!text-sm" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
              setNewContent((c: any) => ({ ...c, rules: [...(c.rules || []), ""] }));
            }}>
              <AddTwoTone className="!text-sm" /> Regel hinzufügen
            </Button>
          </div>
        )}

        {adding === "calendar" && (
          <div className="space-y-2">
            {(newContent.events || []).map((event: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <Input type="date" value={event.date || ""} className="text-sm w-36"
                  onChange={(e) => {
                    const events = [...(newContent.events || [])];
                    events[i] = { ...events[i], date: e.target.value };
                    setNewContent((c: any) => ({ ...c, events }));
                  }} />
                <Input placeholder="Event-Name" value={event.name || ""} className="text-sm flex-1"
                  onChange={(e) => {
                    const events = [...(newContent.events || [])];
                    events[i] = { ...events[i], name: e.target.value };
                    setNewContent((c: any) => ({ ...c, events }));
                  }} />
                <button onClick={() => {
                  const events = (newContent.events || []).filter((_: any, j: number) => j !== i);
                  setNewContent((c: any) => ({ ...c, events }));
                }} className="text-muted-foreground hover:text-destructive">
                  <CloseTwoTone className="!text-sm" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
              setNewContent((c: any) => ({ ...c, events: [...(c.events || []), { date: "", name: "" }] }));
            }}>
              <AddTwoTone className="!text-sm" /> Event hinzufügen
            </Button>
          </div>
        )}

        <Button size="sm" onClick={handleSaveWidget} disabled={saving || !newTitle.trim()} className="w-full">
          {saving ? "Speichern..." : "Widget speichern"}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Widgets bearbeiten</DialogTitle>
        </DialogHeader>

        {/* Existing widgets */}
        {widgets.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Aktive Widgets</p>
            {widgets.map((w) => (
              <div key={w.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border">
                <DragIndicatorTwoTone className="!text-sm text-muted-foreground" />
                <span className="text-xs flex-1 font-medium">{w.title}</span>
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {WIDGET_TYPES.find((t) => t.type === w.widget_type)?.label}
                </span>
                <button onClick={() => handleDeleteWidget(w.id!)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <DeleteTwoTone className="!text-sm" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form or type selector */}
        {adding ? renderAddForm() : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Widget hinzufügen</p>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_TYPES.map((wt) => (
                <button
                  key={wt.type}
                  onClick={() => setAdding(wt.type)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/50 transition-all text-left"
                >
                  <span className="text-primary">{wt.icon}</span>
                  <div>
                    <p className="text-xs font-medium">{wt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{wt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
