import { cn } from "@/lib/utils";

const STATUS_HIGH = new Set(["released", "returning series", "ongoing"]);
const STATUS_LOW = new Set(["canceled", "cancelled", "ended"]);
const STATUS_NEUTRAL = new Set(["in production", "planned", "announced"]);

const getStatusClass = (value: string): string | null => {
  const key = value.trim().toLowerCase();
  if (STATUS_HIGH.has(key)) return "text-score-high";
  if (STATUS_LOW.has(key)) return "text-score-low";
  if (STATUS_NEUTRAL.has(key)) return "text-muted-foreground";
  return null;
};

const SidebarFact = ({ label, value }: { label: string; value: string }) => {
  const isStatus = label.trim().toLowerCase() === "status";
  const statusClass = isStatus ? getStatusClass(value) : null;
  return (
    <div>
      <dt className="text-foreground/70 text-[11px] uppercase tracking-wider font-semibold">{label}</dt>
      <dd className={cn("font-medium mt-0.5 text-sm", statusClass ?? "text-foreground")}>{value}</dd>
    </div>
  );
};

export default SidebarFact;
