import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/locale-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE } from "@/lib/compressImage";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { slugify } from "@/components/article-editor/types";
import { CheckCircle2 as CheckCircleTwoTone, X as CloseTwoTone, Camera as PhotoCameraTwoTone, Send as SendTwoTone } from "lucide-react";
interface UploadItem {
  file: File;
  preview: string;
  url?: string;
  status: "pending" | "uploading" | "done" | "error";
}

const SubmitStoryPage = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: UploadItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ file: f, preview: URL.createObjectURL(f), status: "pending" as const }));
    setItems((prev) => [...prev, ...next]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadOne = async (item: UploadItem): Promise<string | null> => {
    if (!user) return null;
    const file = await compressImage(item.file, ARTICLE_IMAGE);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("article-images").upload(path, file);
    if (error) return null;
    return supabase.storage.from("article-images").getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error(t("workflow.titleRequired"));
      return;
    }
    setSubmitting(true);

    // Upload media sequentially with progress feedback
    const uploaded: string[] = [];
    for (let i = 0; i < items.length; i++) {
      setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: "uploading" } : it)));
      const url = await uploadOne(items[i]);
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, url: url || undefined, status: url ? "done" : "error" } : it)),
      );
      if (url) uploaded.push(url);
    }

    // Build simple HTML body with the uploaded media appended
    const paragraphs = body
      .trim()
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
    const gallery = uploaded.map((u) => `<img src="${u}" alt="" />`).join("");
    const content = `${paragraphs}${gallery}` || "<p></p>";

    const { data, error } = await supabase
      .from("articles")
      .insert({
        user_id: user.id,
        title: title.trim(),
        slug: `${slugify(title.trim())}-${Date.now().toString(36)}`,
        content,
        excerpt: body.trim().slice(0, 200),
        article_type: "news",
        category: "general",
        cover_image_url: uploaded[0] || null,
        published: false,
        status: "idea",
        language: "de",
      } as never)
      .select("id")
      .single();

    setSubmitting(false);
    if (error) {
      toast.error(t("workflow.submitError"));
      return;
    }
    toast.success(t("workflow.submitSuccess"));
    // Reset
    items.forEach((it) => URL.revokeObjectURL(it.preview));
    setTitle("");
    setBody("");
    setItems([]);
    // Offer to keep editing
    navigate(`/news/schreiben?edit=${(data as { id: string }).id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pt-20 pb-28 sm:pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-6">
            <Badge variant="secondary" className="mb-2">{t("workflow.reporterMode")}</Badge>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              {t("workflow.submitTitle")}
            </h1>
            <p className="text-muted-foreground text-sm">{t("workflow.submitDesc")}</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("workflow.storyTitle")}</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("workflow.storyTitlePlaceholder")}
                className="text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("workflow.storyText")}</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("workflow.storyTextPlaceholder")}
                rows={8}
                className="text-base resize-y"
              />
            </div>

            {/* Media upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("workflow.media")}</label>
              <div className="grid grid-cols-3 gap-2">
                {items.map((it, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={it.preview} alt="" className="w-full h-full object-cover" />
                    {it.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {it.status === "done" && (
                      <div className="absolute top-1 right-1 text-green-400">
                        <CheckCircleTwoTone className="w-5 h-5" />
                      </div>
                    )}
                    {it.status !== "uploading" && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="absolute top-1 left-1 bg-black/60 rounded-full p-0.5 text-white"
                      >
                        <CloseTwoTone className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/40 flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  <PhotoCameraTwoTone className="w-7 h-7" />
                  <span className="text-[11px]">{t("workflow.addMedia")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </label>
              </div>
              {items.length > 0 && (
                <p className="text-xs text-muted-foreground">{t("workflow.mediaCount", { count: items.length })}</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky submit bar (mobile-friendly) */}
      <div className="fixed sm:static bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border/50 sm:border-0 sm:bg-transparent p-4 sm:pb-8">
        <div className="container mx-auto max-w-2xl">
          <Button
            className="w-full gap-2 h-12 text-base"
            disabled={submitting || !title.trim()}
            onClick={handleSubmit}
          >
            <SendTwoTone className="w-5 h-5" />
            {submitting ? t("workflow.submitting") : t("workflow.saveDraft")}
          </Button>
        </div>
      </div>

      <div className="hidden sm:block">
        <Footer />
      </div>
    </div>
  );
};

export default SubmitStoryPage;
