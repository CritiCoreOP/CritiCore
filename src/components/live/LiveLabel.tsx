import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * "LIVE" for a running live blog, in the same shape as the opinion label. The dot pulses because
 * it reports a real state (updates are coming in); an ended live blog gets a quiet grey label.
 */
export default function LiveLabel({ ended = false, size = "sm", className }: { ended?: boolean; size?: "sm" | "md"; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[4px] font-extrabold uppercase leading-none tracking-[0.08em]",
        ended ? "bg-muted text-muted-foreground" : "bg-red-600 text-white",
        size === "md" ? "px-2 py-1 text-xs" : "px-1.5 py-[3px] text-[10px]",
        className,
      )}
    >
      {!ended && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      )}
      {ended ? t("live.endedLabel") : t("live.label")}
    </span>
  );
}
