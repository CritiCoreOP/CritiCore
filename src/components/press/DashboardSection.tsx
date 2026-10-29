import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  id: string;
  title: string;
  /** Link or button on the right of the heading */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
  "data-tour"?: string;
}

/** One block of the press dashboard: a plain heading over its content, same frame everywhere */
export default function DashboardSection({ id, title, action, className, children, ...rest }: DashboardSectionProps) {
  return (
    <section aria-labelledby={id} className={cn("rounded-2xl border border-border/50 bg-card/40 p-4 sm:p-5", className)} data-tour={rest["data-tour"]}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className="font-display text-lg font-bold text-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
