import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check as CheckTwoTone, Share2 as ShareTwoTone } from "lucide-react";

interface ShareButtonProps {
  title: string;
  mediaId: number;
  /** "m" for movie, "s" for series, "g" for game */
  mediaType: "m" | "s" | "g";
  /** Override the generated short-link with a custom full URL */
  customUrl?: string;
}

/**
 * Generates a short code: first 2 uppercase letters of title + "-" + full ID
 * e.g. "The Holdovers" + 1159831 → "TH-1159831"
 * Short link: /m/TH-1159831
 */
export function generateShortCode(title: string, id: number): string {
  const letters = title
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
  return `${letters}-${id}`;
}

const ShareButton = ({ title, mediaId, mediaType, customUrl }: ShareButtonProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shortCode = generateShortCode(title, mediaId);
  const shortPath = `/${mediaType}/${shortCode}`;

  const handleShare = useCallback(async () => {
    const url = customUrl || `${window.location.origin}${shortPath}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.copied", "Link kopiert!"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("share.error", "Fehler beim Kopieren"));
    }
  }, [shortPath, title, t, customUrl]);

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={t("share.title", "Teilen")}
      className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 px-2.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/10 hover:bg-primary/20 transition-all duration-200 backdrop-blur-sm"
      title={t("share.title", "Teilen")}
    >
      {copied ? (
        <CheckTwoTone className="w-4 h-4" />
      ) : (
        <ShareTwoTone className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">{t("share.label", "Teilen")}</span>
    </button>
  );
};

export default ShareButton;
