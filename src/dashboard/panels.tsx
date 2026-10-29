import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText, ListOrdered, Palette, Pin, Settings2, Share2, ShieldCheck, UserPlus, type LucideIcon } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { timeAgo } from "@/lib/press";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProxiedImg from "@/components/ProxiedImg";
import { useActivity, usePublishedArticles, useShares, type ActivityItem } from "./data";
import { buildInbox, type QueueResult } from "./inbox";
import { useDrafts, usePins } from "./local";
import { QUEUE_ICON, visibleItems } from "./nav";
import { PLATFORM_SPECS, PLATFORMS } from "./social/postTemplates";
import { EmptyState, Panel, RowsSkeleton, focusRing } from "./ui";

/* ── To do today ──────────────────────────────────────────────────────────── */

export function InboxPanel({ results, loading, error, limit = 10 }: { results: QueueResult[] | undefined; loading: boolean; error: boolean; limit?: number }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const entries = useMemo(() => buildInbox(results ?? [], Date.now(), limit), [results, limit]);
  const total = (results ?? []).reduce((sum, r) => sum + r.count, 0);

  return (
    <Panel title={t("dash.inbox.title")} action={total > 0 ? <span className="text-sm tabular-nums text-muted-foreground">{t("dash.inbox.total", { count: total })}</span> : undefined}>
      {loading ? (
        <RowsSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{t("dash.loadError")}</p>
      ) : entries.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-7 w-7" />} title={t("dash.inbox.emptyTitle")}>
          {t("dash.inbox.emptyBody")}
        </EmptyState>
      ) : (
        <ul className="grid gap-1.5">
          {entries.map((e, i) => {
            const Icon = QUEUE_ICON[e.kind];
            return (
              <motion.li key={`${e.kind}-${e.id}`} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}>
                <Link
                  to={e.href}
                  className={cn("group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-muted/50", focusRing)}
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", e.overdue ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground")}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{e.title || t(`dash.queues.${e.kind}`)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`dash.queues.${e.kind}`)}</span>
                  </span>
                  <span className={cn("flex items-center gap-1 whitespace-nowrap text-xs tabular-nums", e.overdue ? "font-medium text-amber-500" : "text-muted-foreground")}>
                    {e.overdue && <AlertTriangle className="h-3.5 w-3.5" aria-label={t("dash.inbox.overdue")} />}
                    {timeAgo(e.at)}
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ── Published lately, not shared yet ────────────────────────────────────── */

export function UnsharedPanel({ days = 7 }: { days?: number }) {
  const { t } = useTranslation();
  const articles = usePublishedArticles("", 20);
  const recent = useMemo(() => (articles.data ?? []).filter((a) => Date.now() - new Date(a.publishedAt).getTime() < days * 86_400_000), [articles.data, days]);
  const shares = useShares(recent.map((a) => a.id));
  const sharedOn = (id: string) => new Set((shares.data ?? []).filter((s) => s.articleId === id).map((s) => s.platform));
  const open = recent.filter((a) => sharedOn(a.id).size < PLATFORMS.length).slice(0, 6);

  return (
    <Panel
      title={t("dash.unshared.title")}
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          <Link to="/dashboard/social/posts">
            {t("dash.nav.posts")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      {articles.isLoading || shares.isLoading ? (
        <RowsSkeleton rows={3} />
      ) : articles.isError ? (
        <p className="text-sm text-destructive">{t("dash.loadError")}</p>
      ) : open.length === 0 ? (
        <EmptyState icon={<Share2 className="h-7 w-7" />} title={t("dash.unshared.emptyTitle")}>
          {t("dash.unshared.emptyBody", { count: days })}
        </EmptyState>
      ) : (
        <ul className="grid gap-1.5">
          {open.map((a) => {
            const done = sharedOn(a.id);
            return (
              <li key={a.id}>
                <Link to={`/dashboard/social/posts?article=${a.id}`} className={cn("grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-muted/50", focusRing)}>
                  <span className="aspect-video overflow-hidden rounded-md bg-muted">{a.cover && <img src={a.cover} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{a.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {timeAgo(a.publishedAt)}
                      <span>
                        {t("dash.unshared.progress", { done: done.size, total: PLATFORMS.length })}
                        {done.size > 0 && `: ${[...done].map((p) => PLATFORM_SPECS[p].name).join(", ")}`}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ── Work left open in this browser ───────────────────────────────────────── */

export function DraftsPanel() {
  const { t } = useTranslation();
  const drafts = useDrafts();
  return (
    <Panel title={t("dash.drafts.title")}>
      {drafts.length === 0 ? (
        <EmptyState icon={<Palette className="h-7 w-7" />} title={t("dash.drafts.emptyTitle")}>
          <span className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild size="sm" variant="secondary">
              <Link to="/social-creator">{t("socialCreator.title", "Social Pack Creator")}</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/dashboard/social/top10">{t("admin.sidebar.topten", "Top 10")}</Link>
            </Button>
          </span>
        </EmptyState>
      ) : (
        <ul className="grid gap-2">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link to={d.href} className={cn("grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/50 p-2 transition-colors hover:bg-muted/50", focusRing)}>
                <span className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                  {d.picture ? <ProxiedImg src={d.picture} alt="" className="h-full w-full object-cover" /> : d.id === "topTen" ? <ListOrdered className="h-4 w-4" aria-hidden="true" /> : <Palette className="h-4 w-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{d.title || t(`dash.drafts.${d.id}`)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`dash.drafts.${d.id}`)}: {t(d.id === "topTen" ? "dash.drafts.places" : "dash.drafts.slides", { count: d.count })}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── What happened lately ─────────────────────────────────────────────────── */

const ACTIVITY_ICON: Record<ActivityItem["kind"], LucideIcon> = { moderation: ShieldCheck, signup: UserPlus, published: FileText };

export function ActivityPanel({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const activity = useActivity(isAdmin, true);
  return (
    <Panel title={t("dash.activity.title")}>
      {activity.isLoading ? (
        <RowsSkeleton rows={5} />
      ) : !activity.data?.length ? (
        <EmptyState icon={<Clock className="h-7 w-7" />} title={t("dash.activity.empty")} />
      ) : (
        <ol className="relative grid gap-3 before:absolute before:bottom-2 before:left-[0.95rem] before:top-2 before:w-px before:bg-border/60">
          {activity.data.map((item) => {
            const Icon = ACTIVITY_ICON[item.kind];
            const body = (
              <>
                <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-xs text-muted-foreground">
                    {t(`dash.activity.${item.kind}`)}, {timeAgo(item.at)}
                  </span>
                  <span className="block truncate text-sm text-foreground">
                    {item.text}
                    {item.detail && <span className="text-muted-foreground"> ({item.detail})</span>}
                  </span>
                </span>
              </>
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link to={item.href} className={cn("flex gap-3 rounded-[10px] hover:underline", focusRing)}>
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-3">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/* ── Pinned tools ─────────────────────────────────────────────────────────── */

export function PinsPanel({ isAdmin, defaults }: { isAdmin: boolean; defaults: string[] }) {
  const { t } = useTranslation();
  const items = visibleItems(isAdmin).filter((i) => i.id !== "overview");
  const { pins, toggle } = usePins(defaults);
  const pinned = items.filter((i) => pins.includes(i.id));

  return (
    <Panel
      title={t("dash.pins.title")}
      action={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={t("dash.pins.edit")} title={t("dash.pins.edit")}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="max-h-80 w-64 overflow-y-auto p-2">
            <p className="px-2 pb-2 text-xs text-muted-foreground">{t("dash.pins.hint")}</p>
            <ul className="grid">
              {items.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                    <Checkbox checked={pins.includes(item.id)} onCheckedChange={() => toggle(item.id)} />
                    <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {t(...item.label)}
                  </label>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      }
    >
      {pinned.length === 0 ? (
        <EmptyState icon={<Pin className="h-7 w-7" />} title={t("dash.pins.empty")} />
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {pinned.map((item) => (
            <li key={item.id}>
              <Link to={item.path} className={cn("flex h-full items-center gap-2 rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:scale-[0.98]", focusRing)}>
                <item.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 truncate">{t(...item.label)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
