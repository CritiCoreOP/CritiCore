import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Film, Gamepad2, Tv } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatNumber, formatScore } from "./shared";

const TYPE_ICON = { movie: Film, series: Tv, game: Gamepad2 } as const;

/** 2:3 poster; without an image the type icon stands in, so the grid keeps its rhythm */
export function Poster({ src, alt, type, className }: { src: string | null | undefined; alt: string; type: string; className?: string }) {
  const Icon = TYPE_ICON[type as keyof typeof TYPE_ICON] ?? Film;
  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-[8px] bg-muted", className)}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/60" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}

export interface Stat {
  label: string;
  value: string;
}

/** Key figures in a hairline grid: two columns on phones, `columns` from sm up */
export function StatGrid({ stats, columns = 4 }: { stats: Stat[]; columns?: 2 | 4 }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-border/60 bg-border/60", columns === 4 && "sm:grid-cols-4")}>
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1 bg-background p-4">
          <dt className="text-sm text-muted-foreground">{s.label}</dt>
          <dd className="font-display text-3xl font-bold tabular-nums leading-none text-foreground">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * How someone scores: one bar per point from 1 to 10, the most frequent one in the accent.
 * No track behind the bars; the counts are in each bar's label and in the hover title.
 */
export function ScoreDistribution({ buckets, average, total }: { buckets: number[]; average: number; total: number }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...buckets);
  const peak = buckets.indexOf(max);
  return (
    <figure className="flex flex-col rounded-[16px] border border-border/60 p-4">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t("profile.distribution.title")}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{t("profile.distribution.summary", { count: total, avg: formatScore(average) })}</span>
      </figcaption>
      <ol className="mt-3 grid flex-1 grid-cols-10 items-end gap-1.5" aria-label={t("profile.distribution.title")}>
        {buckets.map((count, i) => (
          <li key={i} className="flex h-full min-h-[5.5rem] flex-col items-center justify-end gap-1.5" title={t("profile.distribution.bar", { point: i + 1, count })}>
            <span className="sr-only">{t("profile.distribution.bar", { point: i + 1, count })}</span>
            <span
              aria-hidden="true"
              className={cn("w-full origin-bottom rounded-t-[3px] transition-transform duration-500 ease-out motion-reduce:transition-none", i === peak && count > 0 ? "bg-primary" : "bg-muted-foreground/35")}
              style={{ height: `${count === 0 ? 2 : Math.max(8, (count / max) * 100)}%` }}
            />
            <span aria-hidden="true" className="text-[11px] tabular-nums text-muted-foreground">
              {i + 1}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/** Underline tabs: the active one carries the accent line, counts sit quietly behind the label */
export function ProfileTabList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <TabsList
      aria-label={label}
      className="flex h-auto w-full justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-none border-b border-border/60 bg-transparent p-0 scrollbar-none"
    >
      {children}
    </TabsList>
  );
}

export function ProfileTab({ value, label, count, highlight }: { value: string; label: string; count?: number; highlight?: number }) {
  return (
    <TabsTrigger
      value={value}
      className="relative shrink-0 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
    >
      {label}
      {count !== undefined && <span className="tabular-nums text-muted-foreground">{formatNumber(count)}</span>}
      {!!highlight && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">{highlight}</span>
      )}
    </TabsTrigger>
  );
}

/** Empty tab: says what is missing and, where it helps, how to fill it */
export function EmptyBlock({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border/70 px-6 py-12 text-center">
      <span className="text-muted-foreground/70" aria-hidden="true">
        {icon}
      </span>
      <p className="max-w-[46ch] text-sm text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

/** Filter chips above a tab: toggle buttons in a group, the pressed one is the active filter */
export function FilterChips<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors active:scale-[0.98]",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn("tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
