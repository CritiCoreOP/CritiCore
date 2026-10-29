import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useDataOptOut } from "@/hooks/useDataOptOut";

interface VoteButtonProps {
  score: number;
  userVote: "up" | "down" | null;
  onVote: (type: "up" | "down") => void;
  vertical?: boolean;
  size?: "sm" | "md";
}

const VoteButton = ({ score, userVote, onVote, vertical = true, size = "md" }: VoteButtonProps) => {
  const { guardOptOut } = useDataOptOut();
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const btnPad = size === "sm" ? "p-0.5" : "p-1";

  return (
    <div className={cn("flex items-center", vertical ? "flex-col gap-0" : "flex-row gap-0")}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!guardOptOut()) onVote("up"); }}
        className={cn(
          btnPad, "rounded transition-colors",
          userVote === "up"
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Upvote"
      >
        <ChevronUp className={iconSize} strokeWidth={2.5} />
      </button>
      <span className={cn(
        "font-semibold tabular-nums text-center",
        size === "sm" ? "text-xs min-w-[2ch]" : "text-sm min-w-[3ch]",
        score > 0 ? "text-foreground" : score < 0 ? "text-muted-foreground" : "text-muted-foreground"
      )}>
        {score}
      </span>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!guardOptOut()) onVote("down"); }}
        className={cn(
          btnPad, "rounded transition-colors",
          userVote === "down"
            ? "text-destructive"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Downvote"
      >
        <ChevronDown className={iconSize} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default VoteButton;
