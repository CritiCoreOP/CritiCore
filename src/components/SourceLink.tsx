import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SourceLinkProps {
  href: string;
  /** Name of the data source, e.g. "TMDB" */
  label: string;
  className?: string;
}

/**
 * Labelled link to an external data source (TMDB, IMDb, IGDB). Replaces 16px logos at 40% opacity
 * that were hard to see and did not say where they lead.
 */
const SourceLink = ({ href, label, className }: SourceLinkProps) => {
  const { t } = useTranslation();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("details.openSource", { source: label })}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs font-semibold text-muted-foreground",
        "transition-colors hover:border-border hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
};

export default SourceLink;
