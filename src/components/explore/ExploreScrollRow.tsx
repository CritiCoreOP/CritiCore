import { ChevronLeft as ChevronLeftTwoTone, ChevronRight as ChevronRightTwoTone } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
interface ExploreScrollRowProps {
  children: ReactNode;
  role?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Horizontal chip row with scroll-position-aware edge fades and optional
 * hover scroll arrows. The fades resolve to the page background (#1e1f25 via
 * --background) so a scrollable row never ends in a hard cut-off:
 * - right fade + arrow appear whenever more content sits to the right,
 * - left fade + arrow appear only once the user has scrolled away from the start.
 * Purely presentational — children keep their own semantics.
 */
const ExploreScrollRow = ({
  children,
  role,
  ariaLabel,
  className,
}: ExploreScrollRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 1);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(180, el.clientWidth * 0.7),
      behavior: "smooth",
    });
  };

  return (
    <div className={`group/scroll relative ${className ?? ""}`}>
      <div
        ref={scrollRef}
        role={role}
        aria-label={ariaLabel}
        className="no-scrollbar flex items-center gap-2 overflow-x-auto px-0.5 pb-0.5"
      >
        {children}
      </div>

      {/* Left edge — soft fade + hover arrow (only once scrolled off start) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-background via-background/70 to-transparent transition-opacity duration-200 ease-[var(--mcc-ease-out)] ${
          canLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => scrollByDir(-1)}
        className={`nav-arrow-button explore-glass absolute left-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-media-scrim-foreground transition-opacity duration-200 ease-[var(--mcc-ease-out)] ${
          canLeft
            ? "opacity-0 group-hover/scroll:opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronLeftTwoTone size={18} />
      </button>

      {/* Right edge — soft fade + hover arrow (whenever more content remains) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-background via-background/70 to-transparent transition-opacity duration-200 ease-[var(--mcc-ease-out)] ${
          canRight ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => scrollByDir(1)}
        className={`nav-arrow-button explore-glass absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-media-scrim-foreground transition-opacity duration-200 ease-[var(--mcc-ease-out)] ${
          canRight
            ? "opacity-0 group-hover/scroll:opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronRightTwoTone size={18} />
      </button>
    </div>
  );
};

export default ExploreScrollRow;
