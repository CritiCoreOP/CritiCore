import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Editor } from "@tiptap/react";
import { ImagePlus, Trash as DeleteTwoTone, Images as PhotoLibraryTwoTone } from "lucide-react";

interface MediaGalleryProps {
  userId?: string;
  editor: Editor | null;
}

interface StorageFile {
  name: string;
  url: string;
  created_at: string;
}

const MediaGallery = ({ userId, editor }: MediaGalleryProps) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    setLoading(true);
    supabase.storage
      .from("article-images")
      .list(userId, { limit: 50, sortBy: { column: "created_at", order: "desc" } })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error) {
          toast.error(t("article.loadError"));
          return;
        }
        setFiles(
          (data || [])
            .filter((f) => !f.name.startsWith("."))
            .map((f) => ({
              name: f.name,
              url: supabase.storage.from("article-images").getPublicUrl(`${userId}/${f.name}`).data.publicUrl,
              created_at: f.created_at || "",
            })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId, t]);

  const insertImage = (url: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url }).run();
    setOpen(false);
    toast.success(t("article.imageInserted"));
  };

  const deleteFile = async (name: string) => {
    if (!userId) return;
    const { error } = await supabase.storage.from("article-images").remove([`${userId}/${name}`]);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    setFiles((prev) => prev.filter((f) => f.name !== name));
    toast.success(t("article.imageDeleted"));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title={t("article.mediaGallery")}>
            <PhotoLibraryTwoTone className="w-4 h-4" />
            <span className="sr-only">{t("article.mediaGallery")}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("article.mediaGallery")}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("article.noMedia")}</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0">
              {files.map((file) => (
                <li key={file.name} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={file.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  {/* Visible on touch screens; on desktop on hover or keyboard focus */}
                  <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-within:opacity-100">
                    <Button variant="secondary" size="sm" className="h-8 gap-1.5" onClick={() => insertImage(file.url)}>
                      <ImagePlus className="w-4 h-4" />
                      {t("article.insertImage")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setPendingDelete(file.name)}
                      aria-label={t("article.deleteImage")}
                    >
                      <DeleteTwoTone className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Deleting removes the file from storage; articles that embed it lose the image */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("article.deleteImage")}</AlertDialogTitle>
            <AlertDialogDescription>{t("article.deleteImageConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) deleteFile(pendingDelete);
                setPendingDelete(null);
              }}
            >
              {t("article.deleteImage")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MediaGallery;
