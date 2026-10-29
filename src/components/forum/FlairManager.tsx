import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, AVATAR_IMAGE } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import FlairBadge from "./FlairBadge";
import { Trash2, Plus, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface Flair {
  id: string;
  name: string;
  color: string;
  bg_color: string;
  emoji: string | null;
  icon_url: string | null;
  flair_type: string;
  sort_order: number;
}

interface FlairManagerProps {
  communityId: string;
  userId: string;
}

const PRESET_COLORS = [
  { bg: "#ef4444", fg: "#ffffff", label: "Rot" },
  { bg: "#f97316", fg: "#ffffff", label: "Orange" },
  { bg: "#eab308", fg: "#000000", label: "Gelb" },
  { bg: "#22c55e", fg: "#ffffff", label: "Grün" },
  { bg: "#3b82f6", fg: "#ffffff", label: "Blau" },
  { bg: "#8b5cf6", fg: "#ffffff", label: "Lila" },
  { bg: "#ec4899", fg: "#ffffff", label: "Pink" },
  { bg: "#6b7280", fg: "#ffffff", label: "Grau" },
];

const MAX_ICON_SIZE = 512 * 1024; // 512KB

const FlairManager = ({ communityId, userId }: FlairManagerProps) => {
  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newType, setNewType] = useState<"post" | "user">("post");
  const [selectedPreset, setSelectedPreset] = useState(4);
  const [adding, setAdding] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFlairs = async () => {
    const { data } = await supabase
      .from("forum_flairs")
      .select("*")
      .eq("community_id", communityId)
      .order("flair_type")
      .order("sort_order");
    setFlairs((data as Flair[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadFlairs(); }, [communityId]);

  // Icon preview
  useEffect(() => {
    if (!iconFile) { setIconPreview(null); return; }
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ICON_SIZE) {
      toast.error("Icon darf max. 512KB groß sein.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Nur Bilddateien erlaubt (PNG, JPG, GIF, WebP).");
      return;
    }
    setIconFile(file);
    setNewEmoji(""); // Clear emoji when icon is selected
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const preset = PRESET_COLORS[selectedPreset];

    let iconUrl: string | null = null;
    if (iconFile) {
      const icon = await compressImage(iconFile, AVATAR_IMAGE);
      const ext = icon.name.split(".").pop();
      const path = `flairs/${communityId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("forum-images").upload(path, icon);
      if (uploadErr) {
        toast.error("Icon-Upload fehlgeschlagen.");
        setAdding(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("forum-images").getPublicUrl(path);
      iconUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("forum_flairs").insert({
      community_id: communityId,
      name: newName.trim(),
      emoji: iconUrl ? null : (newEmoji || null),
      icon_url: iconUrl,
      color: preset.fg,
      bg_color: preset.bg,
      flair_type: newType,
      sort_order: flairs.filter(f => f.flair_type === newType).length,
      created_by: userId,
    } as any);
    if (!error) {
      setNewName("");
      setNewEmoji("");
      setIconFile(null);
      toast.success("Flair erstellt!");
      await loadFlairs();
    } else {
      toast.error("Fehler beim Erstellen.");
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Flair löschen?")) return;
    await supabase.from("forum_flairs").delete().eq("id", id);
    toast.success("Flair gelöscht.");
    await loadFlairs();
  };

  const postFlairs = flairs.filter(f => f.flair_type === "post");
  const userFlairs = flairs.filter(f => f.flair_type === "user");

  if (loading) return <div className="h-32 bg-muted animate-pulse rounded-lg" />;

  const renderFlairRow = (flair: Flair) => (
    <div key={flair.id} className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg">
      <FlairBadge
        name={flair.name}
        color={flair.color}
        bgColor={flair.bg_color}
        emoji={flair.emoji}
        iconUrl={flair.icon_url}
        size="md"
      />
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(flair.id)}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Create new flair */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Neues Flair erstellen</h3>
          
          <div className="flex gap-2">
            <button
              onClick={() => setNewType("post")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${newType === "post" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            >
              Post-Flair
            </button>
            <button
              onClick={() => setNewType("user")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${newType === "user" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            >
              User-Flair
            </button>
          </div>

          <div className="flex gap-2">
            {/* Icon upload or emoji */}
            {iconFile ? (
              <div className="relative w-14 h-9 border border-border rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                <img src={iconPreview!} alt="" className="w-6 h-6 object-contain" />
                <button
                  onClick={() => setIconFile(null)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-1 shrink-0">
                <Input
                  value={newEmoji}
                  onChange={e => setNewEmoji(e.target.value.slice(0, 2))}
                  placeholder="😀"
                  className="w-14 text-center"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-9 h-9 border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  title="Bild/GIF hochladen"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value.slice(0, 30))}
              placeholder="Flair-Name"
              className="flex-1"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={handleIconSelect}
            />
          </div>

          <p className="text-[10px] text-muted-foreground">PNG, JPG, GIF oder WebP · max. 512KB · Animierte GIFs werden unterstützt</p>

          {/* Color presets */}
          <div className="flex items-center gap-1.5">
            {PRESET_COLORS.map((preset, i) => (
              <button
                key={i}
                onClick={() => setSelectedPreset(i)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${i === selectedPreset ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: preset.bg }}
              />
            ))}
          </div>

          {/* Preview */}
          {newName && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Vorschau:</span>
              <FlairBadge
                name={newName}
                color={PRESET_COLORS[selectedPreset].fg}
                bgColor={PRESET_COLORS[selectedPreset].bg}
                emoji={iconFile ? null : (newEmoji || null)}
                iconUrl={iconPreview}
                size="md"
              />
            </div>
          )}

          <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Erstellen
          </Button>
        </CardContent>
      </Card>

      {/* Post Flairs */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">Post-Flairs ({postFlairs.length})</h3>
        {postFlairs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Noch keine Post-Flairs erstellt.</p>
        ) : (
          <div className="space-y-1.5">{postFlairs.map(renderFlairRow)}</div>
        )}
      </div>

      {/* User Flairs */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">User-Flairs ({userFlairs.length})</h3>
        {userFlairs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Noch keine User-Flairs erstellt.</p>
        ) : (
          <div className="space-y-1.5">{userFlairs.map(renderFlairRow)}</div>
        )}
      </div>
    </div>
  );
};

export default FlairManager;
