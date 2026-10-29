import { useState } from "react";
import { useNavigate } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE, AVATAR_IMAGE } from "@/lib/compressImage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X as CloseTwoTone, Image as ImageTwoTone } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateCommunityDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("💬");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const slug = name
    .toLowerCase()
    .replace(/[äöüß]/g, (m) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[m] || m))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (original: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    const file = await compressImage(original, folder.includes("icon") ? AVATAR_IMAGE : ARTICLE_IMAGE);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${slug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("forum-images").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("forum-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!user) { toast.error("Bitte anmelden."); return; }
    if (!name.trim() || name.trim().length < 3) { toast.error("Name muss mindestens 3 Zeichen lang sein."); return; }
    if (!slug) { toast.error("Ungültiger Name."); return; }
    setCreating(true);

    // Upload images
    let bannerUrl: string | null = null;
    let iconUrl: string | null = null;
    if (bannerFile) bannerUrl = await uploadImage(bannerFile, "banners");
    if (iconFile) iconUrl = await uploadImage(iconFile, "icons");

    const { data, error } = await supabase.from("forum_communities").insert({
      name: name.trim(),
      slug,
      description: description.trim() || null,
      icon: iconUrl ? null : icon, // Use emoji if no custom icon
      banner_url: bannerUrl,
      created_by: user.id,
    }).select("id, slug").single();

    if (error) {
      if (error.code === "23505") {
        toast.error("Eine Community mit diesem Namen existiert bereits.");
      } else {
        toast.error("Community konnte nicht erstellt werden.");
      }
      setCreating(false);
      return;
    }

    // If custom icon uploaded, store it (reuse icon field or a separate approach)
    if (iconUrl && data) {
      await supabase.from("forum_communities").update({ icon: iconUrl }).eq("id", data.id);
    }

    // Auto-join as owner
    if (data) {
      await supabase.from("forum_community_members").upsert({
        community_id: data.id,
        user_id: user.id,
        role: "owner",
      }, { onConflict: "community_id,user_id" });
    }

    toast.success("Community erstellt!");
    onOpenChange(false);
    setName(""); setDescription(""); setIcon("💬");
    setBannerFile(null); setBannerPreview(null);
    setIconFile(null); setIconPreview(null);
    setCreating(false);
    navigate(`/forum/c/${data?.slug || slug}`);
  };

  const EMOJIS = ["💬", "🎮", "🎬", "📺", "🎵", "📰", "🔥", "⚡", "🌟", "🎯", "🏆", "💡", "🎨", "🤖", "🌍", "❓"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Community erstellen</DialogTitle>
          <DialogDescription>Erstelle eine neue c/ Community für Diskussionen.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Banner upload */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Banner</label>
            <div className="relative group">
              <div
                className="h-24 rounded-lg overflow-hidden bg-secondary flex items-center justify-center cursor-pointer border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("banner-upload")?.click()}
              >
                {bannerPreview ? (
                  <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageTwoTone className="!text-2xl" />
                    <span className="text-xs">Banner hochladen (optional)</span>
                  </div>
                )}
              </div>
              {bannerPreview && (
                <button
                  onClick={() => { setBannerFile(null); setBannerPreview(null); }}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <CloseTwoTone className="!text-sm" />
                </button>
              )}
              <input id="banner-upload" type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </div>
          </div>

          {/* Icon: emoji or custom image */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Icon</label>
            <div className="flex items-start gap-3">
              {/* Custom icon upload */}
              <div
                className="w-14 h-14 shrink-0 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer overflow-hidden transition-colors"
                onClick={() => document.getElementById("icon-upload")?.click()}
              >
                {iconPreview ? (
                  <img src={iconPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{icon}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1.5">Eigenes Bild oder Emoji wählen:</p>
                <div className="flex flex-wrap gap-1">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => { setIcon(e); setIconFile(null); setIconPreview(null); }}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                        icon === e && !iconPreview ? "bg-primary/20 ring-2 ring-primary scale-110" : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <input id="icon-upload" type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
            <Input placeholder="z.B. Gaming News" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            {slug && <p className="text-xs text-muted-foreground mt-1">c/{slug}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Beschreibung</label>
            <Textarea placeholder="Worum geht es in dieser Community?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
          </div>

          <Button onClick={handleCreate} disabled={creating || !name.trim() || name.trim().length < 3} className="w-full">
            {creating ? "Erstellen..." : "Community erstellen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCommunityDialog;
