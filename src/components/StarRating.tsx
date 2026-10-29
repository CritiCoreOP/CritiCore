import { useState, useRef, KeyboardEvent } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number; // 0..10, halves allowed
  onChange: (value: number) => void;
  ariaLabel?: string;
  max?: number; // number of stars, default 10
}

/**
 * Interactive 10-star rating (halves supported).
 * - Hover shows preview
 * - Click sets value
 * - Keyboard: arrow keys change by 0.5, Home/End jump to 1/max
 * - Rendered as radiogroup for a11y
 */
const StarRating = ({ value, onChange, ariaLabel = "Bewertung", max = 10 }: StarRatingProps) => {
  const [hover, setHover] = useState<number | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const display = hover ?? value;

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = value;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(max, (value || 0) + 0.5);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(0.5, (value || 0) - 0.5);
    else if (e.key === "Home") next = 0.5;
    else if (e.key === "End") next = max;
    else return;
    e.preventDefault();
    onChange(next);
  };

  return (
    <div className="flex items-center gap-4">
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={handleKey}
        onMouseLeave={() => setHover(null)}
        className="flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-light,var(--primary)))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {Array.from({ length: max }).map((_, i) => {
          const starValue = i + 1;
          const filled = display >= starValue;
          const half = !filled && display >= starValue - 0.5;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={value === starValue}
              aria-label={`${starValue} / ${max}`}
              tabIndex={-1}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const isLeft = e.clientX - rect.left < rect.width / 2;
                onChange(isLeft ? starValue - 0.5 : starValue);
              }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const isLeft = e.clientX - rect.left < rect.width / 2;
                setHover(isLeft ? starValue - 0.5 : starValue);
              }}
              className="relative p-0.5 transition-transform motion-safe:hover:scale-110 focus:outline-none"
            >
              <Star
                className="w-6 h-6 text-muted-foreground/40"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {(filled || half) && (
                <span
                  className="pointer-events-none absolute inset-0 overflow-hidden p-0.5"
                  style={{ width: half ? "50%" : "100%" }}
                  aria-hidden="true"
                >
                  <Star
                    className="w-6 h-6 fill-[hsl(var(--accent-light,var(--primary)))] text-[hsl(var(--accent-light,var(--primary)))]"
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-baseline gap-1 whitespace-nowrap" aria-hidden="true">
        <span className="text-2xl font-bold text-foreground tabular-nums">
          {value ? value.toFixed(value % 1 === 0 ? 0 : 1) : "—"}
        </span>
        <span className="text-sm text-muted-foreground">/{max}</span>
      </div>
    </div>
  );
};

export default StarRating;
