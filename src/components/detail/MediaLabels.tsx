import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface MediaLabel {
  /** Stable key, e.g. "status" */
  id: string;
  text: string;
  icon?: LucideIcon;
  /** positive: running/available, negative: cancelled/adult, accent: news worth noticing */
  tone?: "default" | "positive" | "negative" | "accent";
  /** Longer explanation on hover/focus */
  title?: string;
}

const TONES: Record<NonNullable<MediaLabel["tone"]>, string> = {
  default: "border-border/45 text-foreground/90",
  positive: "border-score-high/45 text-score-high",
  negative: "border-score-low/45 text-score-low",
  accent: "border-accent-light/50 text-accent-light",
};

/**
 * Short facts readable at a glance (status, age rating, format, special features).
 * Sits on the hero backdrop, so every chip brings its own frosted background.
 */
const MediaLabels = ({ labels, leading }: { labels: MediaLabel[]; leading?: ReactNode }) => {
  const { t } = useTranslation();
  if (!labels.length && !leading) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label={t("details.labelsAria")}>
      {leading && <li className="flex">{leading}</li>}
      {labels.map(({ id, text, icon: Icon, tone = "default", title }) => (
        <li key={id}>
          <span
            title={title}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border bg-background/65 px-3 text-xs font-semibold backdrop-blur-md",
              TONES[tone],
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default MediaLabels;
