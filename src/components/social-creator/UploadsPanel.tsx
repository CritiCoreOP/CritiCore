import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Film, ImageIcon, Pencil, Check } from "lucide-react";
import {
  useSocialAssets,
  captureVideoFrame,
  type SocialAsset,
} from "@/hooks/useSocialAssets";

interface Props {
  onAddImage: (src: string, label?: string, fit?: "cover" | "contain") => void;
  onSetBackground?: (src: string) => void;
}

const prettySize = (bytes: number | null) =>
  !bytes ? "" : bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export default function UploadsPanel({ onAddImage, onSetBackground }: Props) {
  const { t } = useTranslation();
  const { assets, loading, uploading, upload, remove, rename } = useSocialAssets();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const err = await upload(file);
      if (err) {
        const known = ["unsupported", "tooLargeImage", "tooLargeVideo", "notSignedIn"];
        toast.error(known.includes(err) ? t(`socialCreator.uploads.error.${err}`) : err);
      } else {
        toast.success(t("socialCreator.uploads.uploaded", { name: file.name }));
      }
    }
  };

  const insert = async (asset: SocialAsset) => {
    if (asset.kind === "image") {
      onAddImage(asset.url, asset.name, "contain");
      return;
    }
    setBusy(asset.id);
    const frame = await captureVideoFrame(asset.url);
    setBusy(null);
    if (!frame) {
      toast.error(t("socialCreator.uploads.error.frame"));
      return;
    }
    onAddImage(frame, asset.name, "cover");
    toast.success(t("socialCreator.uploads.frameAdded"));
  };

  return (
    <div className="p-2.5 space-y-2.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border border-dashed p-4 text-center bg-card shadow-[var(--shadow-card)] transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          dragging
            ? "border-primary bg-primary/10"
            : "border-border/60 hover:border-border hover:shadow-[var(--shadow-card-hover)]"
        }`}

      >
        {uploading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
        ) : (
          <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
        )}
        <p className="mt-2 text-xs font-medium">{t("socialCreator.uploads.dropTitle")}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{t("socialCreator.uploads.dropHint")}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && assets.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-6">{t("socialCreator.uploads.empty")}</p>
      )}

      {!loading && assets.length > 0 && (
        <div className="space-y-2">
          {assets.map((asset) => (
            <div key={asset.id} className="rounded-lg border border-border/60 bg-card p-2.5 shadow-[var(--shadow-card)] transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-border hover:shadow-[var(--shadow-card-hover)]">
              <div className="flex gap-2.5">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary flex items-center justify-center">
                  {asset.kind === "image" ? (
                    <img src={asset.url} alt={asset.name} className="h-full w-full object-contain" loading="lazy" />

                  ) : (
                    <Film className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {editing === asset.id ? (
                    <div className="flex gap-1">
                      <Input
                        value={draftName}
                        autoFocus
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            rename(asset, draftName);
                            setEditing(null);
                          }
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="h-6 text-xs rounded-md"
                      />
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6 shrink-0 rounded-md"
                        onClick={() => {
                          rename(asset, draftName);
                          setEditing(null);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs font-medium truncate flex items-center gap-1">
                      {asset.kind === "video" ? <Film className="h-3 w-3 shrink-0" /> : <ImageIcon className="h-3 w-3 shrink-0" />}
                      {asset.name}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
                    {prettySize(asset.size_bytes)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 px-2.5 text-[10px] rounded-sm"
                      disabled={busy === asset.id}
                      onClick={() => insert(asset)}
                    >
                      {busy === asset.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : asset.kind === "video" ? (
                        t("socialCreator.uploads.useFrame")
                      ) : (
                        t("socialCreator.uploads.insert")
                      )}
                    </Button>
                    {asset.kind === "image" && onSetBackground && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2.5 text-[10px] rounded-sm"
                        onClick={() => onSetBackground(asset.url)}
                      >
                        {t("socialCreator.uploads.asBackground")}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-md"
                      title={t("socialCreator.uploads.rename")}
                      onClick={() => {
                        setEditing(asset.id);
                        setDraftName(asset.name);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-md text-destructive"
                      title={t("socialCreator.uploads.delete")}
                      onClick={() => remove(asset)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
