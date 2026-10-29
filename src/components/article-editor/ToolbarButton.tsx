import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Icon button of the editor toolbar with a tooltip that names it and its shortcut */
const ToolbarButton = ({
  icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
  loading,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  loading?: boolean;
  /** Small count in the corner, e.g. open spelling errors */
  badge?: number;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        disabled={loading || disabled}
        aria-label={label}
        aria-pressed={active}
        // mousedown keeps the editor selection; the action runs on click so Enter/Space work too
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={`relative p-2 md:p-1.5 rounded-md transition-colors duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed ${
          loading
            ? "animate-pulse text-primary"
            : active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        {icon}
        {!!badge && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-destructive-foreground tabular-nums" aria-hidden="true">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="flex items-center gap-2">
      <span>{label}</span>
      {shortcut && (
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border" aria-hidden="true">
          {shortcut}
        </kbd>
      )}
    </TooltipContent>
  </Tooltip>
);

export default ToolbarButton;
