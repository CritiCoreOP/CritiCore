import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getScoreTier,
  scoreTierBorderClass,
  scoreTierGlowClass,
  scoreTierTextClass,
} from "@/lib/scoreTier";
import { useTheme } from "@/hooks/useTheme";

interface ScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: {
    pill: "h-6 px-2 py-0.5 gap-1 text-xs sm:h-7 sm:px-3 sm:py-1 sm:gap-1.5 sm:text-sm",
    icon: 12,
    suffix: "hidden text-[10px] sm:inline sm:text-[11px]",
  },
  md: {
    pill: "h-7 px-3 py-1 gap-1.5 text-sm",
    icon: 13,
    suffix: "text-[11px]",
  },
  lg: {
    pill: "h-9 px-4 gap-2 text-base",
    icon: 16,
    suffix: "text-xs",
  },
} as const;

const RETRO_UNLOCK_KEY = "criticore-retro-unlocked";
const RETRO_MESSAGES = [
  "🚧 Y0u f0und the s3cret!! 🚧",
  "💾 Welcome to 1999! 💾",
  "🌐 GeoCities called... they want their theme back! 🌐",
  "⭐ Achievement unlocked: Time Traveler ⭐",
  "🎵 *midi intensifies* 🎵",
];

export const isRetroUnlocked = () => {
  try {
    return localStorage.getItem(RETRO_UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
};

/**
 * Rating badge — glass pill with tier-colored star + score.
 * Keeps the easter egg (10 clicks → retro theme).
 */
const ScoreBadge = ({ score, size = "md", className }: ScoreBadgeProps) => {
  const [clicks, setClicks] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("");
  const { badgeStyle } = useTheme();
  const { t } = useTranslation();

  const handleClick = useCallback(() => {
    const next = clicks + 1;
    setClicks(next);
    if (next >= 10 && !unlocked) {
      setUnlocked(true);
      try { localStorage.setItem(RETRO_UNLOCK_KEY, "true"); } catch {}
      setMessage(RETRO_MESSAGES[Math.floor(Math.random() * RETRO_MESSAGES.length)]);
      window.dispatchEvent(new Event("retro-unlocked"));
    }
  }, [clicks, unlocked]);

  const sizeCfg = SIZE_CLASSES[size];
  const isNA = score == null || score === 0;
  const isOld = badgeStyle === "old";

  if (isNA) {
    return (
      <div className="relative">
        <div
          role="img"
          aria-label={t("reviews.scoreNone")}
          onClick={handleClick}
          className={cn(
            isOld
              ? "inline-flex items-center rounded-md bg-black/70 border border-white/20 text-white/70"
              : "inline-flex items-center rounded-full bg-media-scrim/85 border border-border/70 text-muted-foreground",
            "font-display font-bold tabular-nums select-none cursor-pointer",
            sizeCfg.pill,
            className,
          )}
        >
          N/A
        </div>
      </div>
    );
  }

  // No backdrop-blur on the pill: it sits on every poster in a grid, and 20+ blurred badges
  // have to be re-blurred on each scroll frame, which made scrolling stutter on phones
  const tier = getScoreTier(score);
  const tierText = scoreTierTextClass(tier);
  const tierBorder = scoreTierBorderClass(tier);
  const tierGlow = scoreTierGlowClass(tier);

  return (
    <div className="relative">
      <div
        role="img"
        aria-label={t("reviews.scoreLabel", { score: score.toFixed(1) })}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center font-display font-bold tabular-nums select-none cursor-pointer leading-none",
          sizeCfg.pill,
          isOld
            ? "rounded-md bg-black/75 border border-white/20"
            : cn("rounded-full bg-media-scrim/85 border", tierBorder, tierGlow),
          className,
        )}
      >
        <Star
          size={sizeCfg.icon}
          className={cn("shrink-0 fill-current", isOld ? "text-amber-400" : tierText)}
          aria-hidden="true"
        />
        <span className={isOld ? "text-white" : tierText}>{score.toFixed(1)}</span>
        <span className={cn("font-normal", isOld ? "text-white/60" : "text-muted-foreground", sizeCfg.suffix)}>/10</span>
      </div>

      {message && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap z-50 px-3 py-1.5 text-xs font-bold rounded border-2 border-dashed border-primary bg-background text-primary animate-bounce shadow-lg"
          style={{ fontFamily: "'Comic Sans MS', cursive" }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default ScoreBadge;
