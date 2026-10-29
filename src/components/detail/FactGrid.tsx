import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Key facts in a compact grid, right under the plot where people read about the title */
export const FactGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <dl className={cn("mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/40 pt-6 sm:grid-cols-3 xl:grid-cols-4", className)}>
    {children}
  </dl>
);

export const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-1 break-words text-sm font-medium text-foreground">{children}</dd>
  </div>
);
