import type { ComponentProps, ReactNode } from "react";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

interface PageProps extends Omit<ComponentProps<"main">, "className"> {
  children: ReactNode;
  /** Classes of the outer wrapper (e.g. overflow-x-clip) */
  className?: string;
  /** Classes of <main>; spacing below the header comes from .page-main (--page-top in index.css) */
  mainClassName?: string;
  footer?: boolean;
}

/**
 * Frame of a regular page: background, <main> with the shared offset below the header, footer.
 * Pages no longer set their own pt-20/pt-24, so a header change is one line in index.css.
 */
export function Page({ children, className, mainClassName, footer = true, ...mainProps }: PageProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <main className={cn("page-main", mainClassName)} {...mainProps}>
        {children}
      </main>
      {footer && <Footer />}
    </div>
  );
}
