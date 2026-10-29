import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImagePlus, Loader2, Pin, Send, Siren, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { imageFileError, uploadArticleImage } from "@/components/article-editor/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { applyChange, LIVE_BODY_MAX, LIVE_TITLE_MAX, type LiveStatus, type LiveUpdate } from "@/lib/liveBlog";

interface Props {
  articleId: string;
  status: LiveStatus;
  onStatusChange: (next: LiveStatus) => Promise<void>;
  /** An update to change instead of writing a new one */
  editing: LiveUpdate | null;
  onDoneEditing: () => void;
}

const COLUMNS = "id, article_id, author_id, title, body, image_url, is_key, is_pinned, created_at, updated_at";

/** Where the newsroom writes the live blog: on the article page, above the updates readers see */
export default function LiveUpdateComposer({ articleId, status, onStatusChange, editing, onDoneEditing }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isKey, setIsKey] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(editing?.title ?? "");
    setBody(editing?.body ?? "");
    setImage(editing?.image_url ?? null);
    setIsKey(editing?.is_key ?? false);
    setPinned(editing?.is_pinned ?? false);
    if (editing) bodyRef.current?.focus();
  }, [editing]);

  const reset = () => {
    setTitle("");
    setBody("");
    setImage(null);
    setIsKey(false);
    setPinned(false);
  };

  const pickImage = async (file: File | undefined) => {
    if (!file || !user) return;
    const problem = imageFileError(file);
    if (problem) {
      toast.error(t(problem));
      return;
    }
    setUploading(true);
    const url = await uploadArticleImage(file, user.id);
    setUploading(false);
    if (url) setImage(url);
    else toast.error(t("live.uploadError"));
  };

  const submit = async () => {
    const text = body.trim();
    if (!text || busy || !user) return;
    setBusy(true);
    const fields = { title: title.trim() || null, body: text, image_url: image, is_key: isKey, is_pinned: pinned };
    const { data, error } = editing
      ? await supabase.from("article_live_updates").update(fields).eq("id", editing.id).select(COLUMNS).single()
      : await supabase.from("article_live_updates").insert({ ...fields, article_id: articleId, author_id: user.id }).select(COLUMNS).single();
    setBusy(false);
    if (error || !data) {
      toast.error(t("live.error"), { description: error?.message });
      return;
    }
    // Shown right away; the Realtime copy that follows replaces it by id
    client.setQueryData<LiveUpdate[]>(["live-updates", articleId], (prev) => applyChange(prev ?? [], editing ? "UPDATE" : "INSERT", data as LiveUpdate));
    toast.success(editing ? t("live.saved") : t("live.posted"));
    reset();
    if (editing) onDoneEditing();
  };

  const changeStatus = async () => {
    const next: LiveStatus = status === "live" ? "ended" : "live";
    if (next === "ended" && !window.confirm(t("live.confirmEnd"))) return;
    setStatusBusy(true);
    try {
      await onStatusChange(next);
    } finally {
      setStatusBusy(false);
    }
  };

  const toggleClass = (on: boolean) =>
    cn("h-8 gap-1.5 rounded-full px-3 text-xs", on ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background" : "text-muted-foreground");

  return (
    <section aria-labelledby="live-composer-title" className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="live-composer-title" className="font-display text-base font-bold text-foreground">
          {editing ? t("live.editing") : t("live.composerTitle")}
        </h3>
        {!editing && (
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={changeStatus} disabled={statusBusy}>
            {status === "live" ? t("live.end") : t("live.restart")}
          </Button>
        )}
      </div>

      <div className="grid gap-2.5">
        <label htmlFor="live-title" className="sr-only">{t("live.titleLabel")}</label>
        <Input
          id="live-title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, LIVE_TITLE_MAX))}
          placeholder={t("live.titlePlaceholder")}
          className="font-semibold"
        />
        <label htmlFor="live-body" className="sr-only">{t("live.bodyLabel")}</label>
        <Textarea
          id="live-body"
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, LIVE_BODY_MAX))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={t("live.bodyPlaceholder")}
          rows={4}
          className="min-h-[7rem] resize-y leading-relaxed [field-sizing:content]"
        />
        {image && (
          <div className="relative w-fit">
            <img src={image} alt="" className="max-h-40 rounded-xl object-cover" />
            <Button type="button" size="icon" variant="secondary" className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full" onClick={() => setImage(null)} title={t("live.removeImage")}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{t("live.removeImage")}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ""; }} />
        <Button type="button" variant="ghost" size="sm" className={toggleClass(false)} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />}
          {t("live.addImage")}
        </Button>
        <Button type="button" variant="ghost" size="sm" className={toggleClass(isKey)} aria-pressed={isKey} onClick={() => setIsKey((v) => !v)}>
          <Siren className="h-3.5 w-3.5" aria-hidden="true" />
          {t("live.key")}
        </Button>
        <Button type="button" variant="ghost" size="sm" className={toggleClass(pinned)} aria-pressed={pinned} onClick={() => setPinned((v) => !v)}>
          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
          {t("live.pin")}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{t("live.shortcut")}</span>
          {editing && (
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => { reset(); onDoneEditing(); }}>
              {t("live.cancelEdit")}
            </Button>
          )}
          <Button type="button" size="sm" className="h-9 gap-1.5 active:scale-[0.98]" onClick={submit} disabled={!body.trim() || busy || uploading}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {editing ? t("live.save") : t("live.post")}
          </Button>
        </div>
      </div>
    </section>
  );
}
