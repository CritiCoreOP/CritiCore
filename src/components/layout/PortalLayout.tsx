import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useLayoutPrefs } from "@/lib/layoutPrefs";
import { cn } from "@/lib/utils";

/** Same breakpoint as Tailwind's lg: below it the page has one column and no rail */
export const RAIL_QUERY = "(min-width: 1024px)";

interface PortalLayoutProps {
  children: ReactNode;
  /** Side column; left out (and never mounted, so it fetches nothing) below lg or when switched off */
  rail?: ReactNode;
  className?: string;
}

/** Whether the side rail is on screen: desktop width and not switched off in the settings */
export function useRailShown(): boolean {
  const wide = useMediaQuery(RAIL_QUERY);
  return useLayoutPrefs().sideRail && wide;
}

/** Portal layout: main column plus a 20rem side rail (22rem from xl) */
export function PortalLayout({ children, rail, className }: PortalLayoutProps) {
  const { t } = useTranslation();
  const showRail = useRailShown() && Boolean(rail);

  return (
    <div className={cn(showRail && "grid grid-cols-[minmax(0,1fr)_20rem] gap-10 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-12", className)}>
      <div className="min-w-0">{children}</div>
      {showRail && <aside aria-label={t("layout.railLabel")}>{rail}</aside>}
    </div>
  );
}
