import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";

interface SectionProps {
  children: ReactNode;
  title?: ReactNode;
  /** "Alle ansehen" link next to the title */
  viewAllLink?: string;
  /** Anything else next to the title (buttons, filters); replaces the view-all link */
  action?: ReactNode;
  className?: string;
}

/** A block of a page with its heading; the vertical rhythm between sections comes from the parent (space-y-*) */
export function Section({ children, title, viewAllLink, action, className }: SectionProps) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <section aria-labelledby={title ? headingId : undefined} className={className}>
      {title && (
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id={headingId} className="font-display text-xl font-bold text-foreground">
            {title}
          </h2>
          {action ??
            (viewAllLink && (
              <Link to={viewAllLink} className="-my-2 inline-flex items-center gap-1 py-2 text-xs text-muted-foreground transition-colors hover:text-primary">
                {t("home.viewAll")} <span aria-hidden="true">→</span>
              </Link>
            ))}
        </div>
      )}
      {children}
    </section>
  );
}

/** Small block of the side rail: a hairline on top and a compact heading */
export function RailSection({ children, title, viewAllLink, className }: Omit<SectionProps, "action">) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn("border-t border-border pt-4", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-xs text-muted-foreground transition-colors hover:text-primary">
            {t("home.viewAll")}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
