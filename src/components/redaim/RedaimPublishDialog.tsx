import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { RwPage } from "@/hooks/useRedaimPages";

interface Props {
  page: RwPage | null;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RedaimPublishDialog({ page, workspaceId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(page?.title || "");
  const [excerpt, setExcerpt] = useState("");
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    if (!user || !page) return;
    setLoading(true);

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

    // Convert TipTap JSON to HTML-like content string
    const content = JSON.stringify(page.content);

    const { data: article, error } = await supabase
      .from("articles")
      .insert({
        title,
        slug,
        content,
        excerpt: excerpt || null,
        article_type: "colab",
        user_id: user.id,
        published: true,
        language: document.documentElement.lang || "de",
      })
      .select()
      .single();

    if (error || !article) {
      toast({ title: "Fehler", description: "Veröffentlichung fehlgeschlagen.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Add all workspace members as collaborators
    const { data: members } = await supabase
      .from("rw_members" as any)
      .select("user_id, role")
      .eq("workspace_id", workspaceId);

    if (members) {
      const collabs = (members as any[])
        .filter((m) => m.role === "owner" || m.role === "user")
        .map((m) => ({
          article_id: article.id,
          user_id: m.user_id,
          invited_by: user.id,
          accepted: true,
          role: "editor",
        }));
      if (collabs.length > 0) {
        await supabase.from("article_collaborators").insert(collabs);
      }
    }

    toast({ title: "Veröffentlicht!", description: "Der Beitrag wurde als Colab auf CritiCore veröffentlicht." });
    onOpenChange(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="redaim-dialog">
        <DialogHeader>
          <DialogTitle>Auf CritiCore veröffentlichen</DialogTitle>
          <DialogDescription>Dieses Dokument als Colab-Beitrag publizieren</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium redaim-text-muted">Titel</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="redaim-input mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium redaim-text-muted">Excerpt</label>
            <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="redaim-input mt-1" rows={3} placeholder="Kurze Zusammenfassung..." />
          </div>
          <Button onClick={publish} disabled={loading || !title} className="w-full redaim-btn-primary">
            {loading ? "Veröffentliche..." : "Veröffentlichen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
