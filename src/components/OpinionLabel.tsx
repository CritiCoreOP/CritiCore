import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * "MEINUNG" (for reviews "REVIEW · MEINUNG") in capitals on a signal colour, the same on every surface (lists, teasers, the article
 * itself). Dark text on amber reads in every theme and stands apart from category and type words.
 */
export default function OpinionLabel({ type, size = "sm", className }: { type?: string | null; size?: "sm" | "md"; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[4px] bg-amber-400 font-extrabold uppercase leading-none tracking-[0.08em] text-zinc-950",
        size === "md" ? "px-2 py-1 text-xs" : "px-1.5 py-[3px] text-[10px]",
        className,
      )}
    >
      {type === "review" ? t("news.reviewOpinionLabel") : t("news.opinionLabel")}
    </span>
  );
}
