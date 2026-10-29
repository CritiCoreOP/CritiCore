import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X as CloseTwoTone, Image as ImageTwoTone, Loader2 } from "lucide-react";
import { imageFileError, normalizeUrl, uploadArticleImage } from "./utils";
import type { CoverCredit } from "./types";

interface CoverImageUploadProps {
  coverImage: string | null;
  setCoverImage: (url: string | null) => void;
  credit: CoverCredit;
  onCreditChange: (credit: CoverCredit) => void;
  userId?: string;
}

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Credit of the cover picture: who it is from, and optionally where it comes from */
function CoverCreditFields({ credit, onCreditChange }: Pick<CoverImageUploadProps, "credit" | "onCreditChange">) {
  const { t } = useTranslation();
  const urlInvalid = !!credit.url.trim() && !normalizeUrl(credit.url);
  const missing = !credit.credit.trim();
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" data-testid="cover-credit">
      <div className="grid gap-1.5">
        <label htmlFor="cover-credit" className="text-xs font-medium text-muted-foreground">
          {t("article.coverCredit.label")}
        </label>
        <input
          id="cover-credit"
          value={credit.credit}
          maxLength={160}
          onChange={(e) => onCreditChange({ ...credit, credit: e.target.value })}
          placeholder={t("article.coverCredit.placeholder")}
          aria-describedby="cover-credit-hint"
          className={inputClass}
        />
        <p id="cover-credit-hint" className={missing ? "text-xs text-amber-500" : "text-xs text-muted-foreground"}>
          {missing ? t("article.coverCredit.missing") : t("article.coverCredit.hint")}
        </p>
      </div>
      <div className="grid content-start gap-1.5">
        <label htmlFor="cover-credit-url" className="text-xs font-medium text-muted-foreground">
          {t("article.coverCredit.urlLabel")}
        </label>
        <input
          id="cover-credit-url"
          value={credit.url}
          inputMode="url"
          maxLength={500}
          onChange={(e) => onCreditChange({ ...credit, url: e.target.value })}
          placeholder="https://"
          aria-invalid={urlInvalid}
          aria-describedby={urlInvalid ? "cover-credit-url-error" : undefined}
          className={`${inputClass} ${urlInvalid ? "border-destructive" : ""}`}
        />
        {urlInvalid && (
          <p id="cover-credit-url-error" className="text-xs text-destructive">
            {t("article.image.creditLinkInvalid")}
          </p>
        )}
      </div>
    </div>
  );
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

const CoverImageUpload = ({ coverImage, setCoverImage, credit, onCreditChange, userId }: CoverImageUploadProps) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file || !userId) return;
    const problem = imageFileError(file);
    if (problem) {
      toast.error(t(problem));
      return;
    }
    setUploading(true);
    const url = await uploadArticleImage(file, userId);
    setUploading(false);
    if (!url) {
      toast.error(t("article.uploadError"));
      return;
    }
    setCoverImage(url);
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    upload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    upload(e.dataTransfer.files?.[0]);
  };

  // Visually hidden but focusable, so the upload works with the keyboard as well
  const fileInput = <input type="file" accept={ACCEPT} className="sr-only" onChange={onInput} disabled={uploading} />;

  if (coverImage) {
    return (
      <div>
      <div className="relative rounded-xl overflow-hidden aspect-[21/9] bg-muted group">
        <img src={coverImage} alt="" className="w-full h-full object-cover" />
        {/* Always visible on touch screens (no hover there); on desktop shown on hover or keyboard focus */}
        <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-3 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-within:opacity-100">
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus-within:ring-2 focus-within:ring-primary">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageTwoTone className="w-4 h-4" />}
            {uploading ? t("article.uploading") : t("article.changeCover")}
            {fileInput}
          </label>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setCoverImage(null)}
          >
            <CloseTwoTone className="w-4 h-4" /> {t("article.removeCover")}
          </button>
        </div>
      </div>
      <CoverCreditFields credit={credit} onCreditChange={onCreditChange} />
      </div>
    );
  }

  return (
    <label
      // Compact while empty: the 21:9 placeholder pushed title and text half a screen down
      className={`flex items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer h-20 sm:h-24 w-full px-4 focus-within:ring-2 focus-within:ring-primary ${
        dragOver ? "border-primary bg-primary/10" : "border-muted-foreground/20 hover:border-primary/40 bg-muted/30 hover:bg-muted/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      aria-busy={uploading}
    >
      {uploading ? <Loader2 className="w-6 h-6 shrink-0 text-primary animate-spin" /> : <ImageTwoTone className="w-6 h-6 shrink-0 text-muted-foreground/60" />}
      <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
        <span className="text-sm font-medium text-muted-foreground">{uploading ? t("article.uploading") : t("article.addCover")}</span>
        {!uploading && <span className="text-xs text-muted-foreground/70 hidden sm:inline">{t("article.dragDrop")}</span>}
      </span>
      {fileInput}
    </label>
  );
};

export default CoverImageUpload;
