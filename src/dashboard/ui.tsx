import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLocale } from "@/lib/locale";
import { weekTrend } from "./kpis";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Title row of a dashboard page; the frame itself has no h1, so every page owns exactly one */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** One block of a page: a plain heading over its content, the same frame everywhere */
export function Panel({ title, action, className, children, id }: { title: string; action?: ReactNode; className?: string; children: ReactNode; id?: string }) {
  const auto = useId();
  const headingId = id ?? auto;
  return (
    <section aria-labelledby={headingId} className={cn("rounded-2xl border border-border/50 bg-card/40 p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={headingId} className="font-display text-lg font-bold text-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
      <span className="text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Grey bars in the shape of the rows that are loading */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/50 motion-reduce:animate-none" />
      ))}
    </div>
  );
}

const compact = (n: number) => new Intl.NumberFormat(getLocale(), { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);

/**
 * Stat tile: label, value, change against the week before and a 30-day line. The line is grey;
 * the last seven days, which the change talks about, are in the accent. Hovering a day shows it.
 */
export function StatTile({ label, value, buckets, loading }: { label: string; value: number; buckets?: number[]; loading?: boolean }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);
  const trend = buckets ? weekTrend(buckets) : null;
  const days = buckets?.length ?? 0;
  const dayLabel = (i: number) =>
    new Intl.DateTimeFormat(getLocale(), { weekday: "short", day: "numeric", month: "short" }).format(new Date(Date.now() - (days - 1 - i) * 86_400_000));

  if (loading) return <div className="h-[8.5rem] animate-pulse rounded-2xl border border-border/50 bg-muted/30 motion-reduce:animate-none" aria-hidden="true" />;

  const W = 160;
  const H = 36;
  const max = Math.max(1, ...(buckets ?? [0]));
  const x = (i: number) => (days > 1 ? (i / (days - 1)) * W : 0);
  const y = (v: number) => H - 2 - (v / max) * (H - 4);
  const points = (buckets ?? []).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const split = Math.max(0, days - 7);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card/40 p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-3xl font-semibold tabular-nums text-foreground">{compact(value)}</span>
      {buckets && days > 1 && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-9 w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("dash.kpi.lineLabel", { label, total: value })}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.min(days - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (days - 1)))));
          }}
          onPointerLeave={() => setHover(null)}
        >
          <polyline points={points.slice(0, split + 1).join(" ")} fill="none" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.45} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={points.slice(split).join(" ")} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="hsl(var(--foreground))" strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        </svg>
      )}
      <span className="flex min-h-5 flex-wrap items-center gap-x-1 text-xs text-muted-foreground" aria-live="polite">
        {hover !== null && buckets ? (
          <>
            {dayLabel(hover)}: <span className="font-medium tabular-nums text-foreground">{buckets[hover]}</span>
          </>
        ) : trend === null ? (
          t("dash.kpi.noTrend")
        ) : (
          <>
            {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />}
            <span className="whitespace-nowrap font-medium tabular-nums text-foreground">
              {trend > 0 ? "+" : ""}
              {trend} %
            </span>
            {t("dash.kpi.vsLastWeek")}
          </>
        )}
      </span>
    </div>
  );
}
