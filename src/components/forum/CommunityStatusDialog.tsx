import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, AVATAR_IMAGE } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { X as CloseTwoTone } from "lucide-react";

const COMMUNITY_EMOJIS = [
  "🎉","🔥","📢","⚡","🏆","🎮","🎬","📺","🎵","💡",
  "🚀","⭐","❤️","🌟","🎯","💬","📰","🤖","🌍","🎨",
  "🛡️","👑","🎊","🎁","📌","🔔","💎","🧩","🏅","✨",
  "😎","🤝","📣","🎤","🎧","🕹️","📸","🌈","💪","🙌",
];

const MAX_ICON_SIZE = 512 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  currentEmoji: string | null;
  currentText: string | null;
  currentIconUrl?: string | null;
  onUpdated: (emoji: string | null, text: string | null, iconUrl?: string | null) => void;
}

export default function CommunityStatusDialog({
  open,
  onOpenChange,
  communityId,
  currentEmoji,
  currentText,
  currentIconUrl,
  onUpdated,
}: Props) {
  const [emoji, setEmoji] = useState(currentEmoji || "");
  const [text, setText] = useState(currentText || "");
  const [saving, setSaving] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(currentIconUrl || null);
  const [useCustomIcon, setUseCustomIcon] = useState(!!currentIconUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!iconFile) return;
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ICON_SIZE) { toast.error("Max. 512KB."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Nur Bilder erlaubt."); return; }
    setIconFile(file);
    setUseCustomIcon(true);
    setEmoji("");
  };

  const clearIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    setUseCustomIcon(false);
  };

  const handleApply = async () => {
    if (!emoji && !useCustomIcon) {
      toast.error("Ein Emoji oder Icon ist erforderlich.");
      return;
    }
    setSaving(true);

    let iconUrl: string | null = currentIconUrl || null;

    if (iconFile) {
      const icon = await compressImage(iconFile, AVATAR_IMAGE);
      const ext = icon.name.split(".").pop();
      const path = `communities/${communityId}/status-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("forum-images").upload(path, icon);
      if (uploadErr) {
        toast.error("Upload fehlgeschlagen.");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("forum-images").getPublicUrl(path);
      iconUrl = urlData.publicUrl;
    } else if (!useCustomIcon) {
      iconUrl = null;
    }

    const { error } = await supabase
      .from("forum_communities")
      .update({
        status_emoji: useCustomIcon ? null : (emoji || null),
        status_text: text.trim() || null,
        status_icon_url: iconUrl,
      } as any)
      .eq("id", communityId);

    if (error) {
      toast.error("Status konnte nicht gespeichert werden.");
    } else {
      toast.success("Community-Status aktualisiert!");
      onUpdated(
        useCustomIcon ? null : (emoji || null),
        text.trim() || null,
        iconUrl
      );
      onOpenChange(false);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    setSaving(true);
    await supabase
      .from("forum_communities")
      .update({ status_emoji: null, status_text: null, status_icon_url: null } as any)
      .eq("id", communityId);
    onUpdated(null, null, null);
    onOpenChange(false);
    setSaving(false);
    toast.success("Status entfernt.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Community-Status hinzufügen</DialogTitle>
          <DialogDescription>
            Lass die Community wissen, dass etwas Besonderes passiert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Status input with emoji/icon */}
          <div className="rounded-lg border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <div className="flex items-center gap-2 px-3 py-2.5">
              {/* Icon or emoji display */}
              {useCustomIcon && iconPreview ? (
                <div className="relative shrink-0">
                  <img src={iconPreview} alt="" className="w-6 h-6 rounded object-cover" />
                  <button
                    onClick={clearIcon}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              ) : (
                <span className="text-xl shrink-0">{emoji || "😀"}</span>
              )}
              <Input
                placeholder="Status"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={100}
                className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              />
            </div>
          </div>

          {!emoji && !useCustomIcon && (
            <p className="text-xs text-destructive font-medium">Ein Emoji oder Icon ist erforderlich</p>
          )}

          {/* Custom icon upload */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Icon</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3" /> Bild/GIF hochladen
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={handleIconSelect}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">PNG, JPG, GIF, WebP · max. 512KB · Wird neben dem Community-Namen angezeigt</p>
          </div>

          {/* Emoji grid */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Oder Emoji</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMUNITY_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => { setEmoji(e); clearIcon(); }}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === e && !useCustomIcon
                      ? "bg-primary/20 ring-2 ring-primary scale-110"
                      : "bg-secondary hover:bg-secondary/80 hover:scale-105"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {(currentEmoji || currentText || currentIconUrl) && (
                <Button variant="ghost" size="sm" onClick={handleRemove} disabled={saving} className="text-xs text-destructive hover:text-destructive">
                  <CloseTwoTone className="!text-sm mr-1" /> Entfernen
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleApply} disabled={saving || (!emoji && !useCustomIcon)}>
                {saving ? "Speichern..." : "Anwenden"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
