import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type AgeRatingSystem = "FSK" | "USK" | "PEGI" | "ESRB" | "ADULT";

// FSK has official marks in public/static/fsk
const FSK_MARKS: Record<string, string> = {
  "0": "/static/fsk/fsk-0.png",
  "6": "/static/fsk/fsk-6.png",
  "12": "/static/fsk/fsk-12.png",
  "16": "/static/fsk/fsk-16.png",
  "18": "/static/fsk/fsk-18.png",
};

// USK uses the same colors as FSK; PEGI has its own green/orange/red steps
const USK_COLORS: Record<string, string> = {
  "0": "bg-[#f4f4f4] text-[#1a1a1a]",
  "6": "bg-[#ffed00] text-[#1a1a1a]",
  "12": "bg-[#00a651] text-white",
  "16": "bg-[#0096d6] text-white",
  "18": "bg-[#e3000f] text-white",
};
const PEGI_COLORS: Record<string, string> = {
  "3": "bg-[#5fb534] text-white",
  "7": "bg-[#5fb534] text-white",
  "12": "bg-[#f7a70f] text-[#1a1a1a]",
  "16": "bg-[#f7a70f] text-[#1a1a1a]",
  "18": "bg-[#e3000f] text-white",
};

/**
 * Age rating at a glance: the official FSK mark, otherwise a badge in the rating board's colors.
 * The visible number is backed by a full sentence for screen readers.
 */
const AgeRatingMark = ({ system, rating, className }: { system: AgeRatingSystem; rating: string; className?: string }) => {
  const { t } = useTranslation();
  const label =
    system === "ADULT"
      ? t("details.ageRating.adult")
      : t("details.ageRating.label", { system, rating });

  if (system === "FSK" && FSK_MARKS[rating]) {
    return <img src={FSK_MARKS[rating]} alt={label} title={label} className={cn("h-9 w-9 shrink-0 rounded-md object-contain", className)} />;
  }

  const colors =
    system === "USK" ? USK_COLORS[rating] : system === "PEGI" ? PEGI_COLORS[rating] : undefined;
  const text = system === "ADULT" ? "18+" : rating;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 min-w-9 shrink-0 flex-col items-center justify-center rounded-md px-1 font-bold leading-none",
        colors ?? "border border-border/50 bg-background/70 text-foreground",
        system === "ADULT" && "border-0 bg-score-low text-white",
        className,
      )}
    >
      {system !== "ADULT" && <span className="text-[8px] tracking-wide opacity-90">{system}</span>}
      <span className={cn("tabular-nums", text.length > 2 ? "text-[11px]" : "text-sm")}>{text}</span>
    </span>
  );
};

export default AgeRatingMark;
