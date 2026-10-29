import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import { Link } from "@/lib/locale-router";

interface ListPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Explore media type, adds a link to the filtered Explore page (the list pages have no filters themselves) */
  exploreType?: "movie" | "series" | "game";
  /** Extra controls under the title, e.g. tabs */
  children?: ReactNode;
}

/** Shared header for the Games / Filme / Serien / Anime list pages */
const ListPageHeader = ({ title, subtitle, exploreType, children }: ListPageHeaderProps) => {
  const { t } = useTranslation();

  return (
    <header className="mb-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-[60ch] text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {exploreType && (
          <Link
            to={`/entdecken?type=${exploreType}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border/70 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] motion-reduce:active:scale-100"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t("pages.filterInExplore")}
          </Link>
        )}
      </div>
      {children}
    </header>
  );
};

export default ListPageHeader;
