import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

interface ExploreEmptyStateProps {
  /** Lucide icon component rendered above the title. */
  icon: ComponentType<LucideProps>;
  title: string;
  description?: string;
  /** A way out, e.g. a reset button */
  action?: ReactNode;
  /** `alert` surfaces errors to assistive tech; `status` for neutral empties. */
  tone?: "empty" | "error";
}

/**
 * Single reusable placeholder for the Explore grid — used for both the empty
 * feed and the load-error state so all "nothing to show" surfaces look and
 * behave identically. Motion stays within the shared fade token (no bounce).
 */
const ExploreEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  tone = "empty",
}: ExploreEmptyStateProps) => (
  <div
    role={tone === "error" ? "alert" : "status"}
    className="explore-fade-in flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[var(--mcc-shape-lg)] border border-dashed border-border/50 bg-card/30 px-6 text-center"
  >
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon size={28} />
    </span>
    <p className="font-display text-lg font-semibold text-foreground">{title}</p>
    {description && (
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    )}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default ExploreEmptyState;
