import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface CoverCreditProps {
  credit: string | null | undefined;
  url?: string | null;
  className?: string;
}

/** "Quelle: Nintendo" under an article's cover picture, linked when the author gave a source */
export default function CoverCredit({ credit, url, className }: CoverCreditProps) {
  const { t } = useTranslation();
  const text = credit?.trim();
  if (!text) return null;
  const href = url && /^https?:\/\//i.test(url) ? url : null;
  return (
    <figcaption className={cn("text-xs leading-relaxed text-muted-foreground", className)} data-testid="cover-credit-line">
      {t("article.image.creditLabel")}{" "}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground">
          {text}
        </a>
      ) : (
        text
      )}
    </figcaption>
  );
}
