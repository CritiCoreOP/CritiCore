import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check as CheckTwoTone, Copy as ContentCopyTwoTone, Share2 as ShareTwoTone } from "lucide-react";

interface ArticleShareButtonProps {
  title: string;
  slug: string;
}

/**
 * Generates a short code for articles: first 2 uppercase letters of title + "-" + first 8 chars of slug
 * e.g. "Breaking News Update" → "BR-breaking-n"
 * Short link: /a/BR-breaking-n
 */
export function generateArticleShortCode(title: string, slug: string): string {
  const letters = title
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
  const shortSlug = slug.slice(0, 12);
  return `${letters}-${shortSlug}`;
}

const ArticleShareButton = ({ title, slug }: ArticleShareButtonProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shortCode = generateArticleShortCode(title, slug);
  const shortPath = `/a/${shortCode}`;

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${shortPath}`;

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
  }, [shortPath, title, t]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-1.5"
      title={t("share.title", "Teilen")}
    >
      {copied ? (
        <CheckTwoTone className="w-4 h-4" />
      ) : (
        <ShareTwoTone className="w-4 h-4" />
      )}
      {t("share.label", "Teilen")}
    </Button>
  );
};

export default ArticleShareButton;
