import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Link2, Pencil, Pin, PinOff, Radio, RotateCw, Siren, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadAuthors, type AuthorProfile } from "@/lib/articleAuthor";
import { getLocale } from "@/lib/locale";
import { applyChange, linkify, sortUpdates, updateStamp, type LiveStatus, type LiveUpdate } from "@/lib/liveBlog";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import LiveLabel from "./LiveLabel";
import LiveUpdateComposer from "./LiveUpdateComposer";

const COLUMNS = "id, article_id, author_id, title, body, image_url, is_key, is_pinned, created_at, updated_at";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface Props {
  articleId: string;
  status: LiveStatus;
  updates: LiveUpdate[] | undefined;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  /** Ids that arrived through Realtime since the page opened */
  fresh: Set<string>;
  clearFresh: () => void;
  canManage: boolean;
  onStatusChange: (next: LiveStatus) => Promise<void>;
}

/** Time only for today, with the day for older updates */
const lastStamp = (iso: string) => {
  const s = updateStamp(iso, getLocale());
  return s.day ? `${s.day}, ${s.time}` : s.time;
};

function UpdateText({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-medium text-primary underline-offset-2 [overflow-wrap:anywhere] hover:underline">
            {p.value}
          </a>
        ),
      )}
    </>
  );
}

function UpdateItem({
  update,
  author,
  isFresh,
  canManage,
  onEdit,
}: {
  update: LiveUpdate;
  author: AuthorProfile | undefined;
  isFresh: boolean;
  canManage: boolean;
  onEdit: (u: LiveUpdate) => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const reduce = useReducedMotion();
  const stamp = updateStamp(update.created_at, getLocale());
  const edited = new Date(update.updated_at).getTime() - new Date(update.created_at).getTime() > 60_000;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#update-${update.id}`);
      toast.success(t("live.linkCopied"));
    } catch {
      // Clipboard blocked; nothing to do
    }
  };

  // Applied here right away; the Realtime event that follows changes nothing more
  const key = ["live-updates", update.article_id];
  const togglePin = async () => {
    const { data, error } = await supabase.from("article_live_updates").update({ is_pinned: !update.is_pinned }).eq("id", update.id).select(COLUMNS).single();
    if (error || !data) return void toast.error(t("live.error"));
    client.setQueryData<LiveUpdate[]>(key, (prev) => applyChange(prev ?? [], "UPDATE", data as LiveUpdate));
  };

  const remove = async () => {
    if (!window.confirm(t("live.confirmDelete"))) return;
    const { error } = await supabase.from("article_live_updates").delete().eq("id", update.id);
    if (error) return void toast.error(t("live.error"));
    client.setQueryData<LiveUpdate[]>(key, (prev) => applyChange(prev ?? [], "DELETE", { id: update.id }));
  };

  return (
    <motion.article
      id={`update-${update.id}`}
      layout={reduce ? false : "position"}
      initial={isFresh && !reduce ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="grid scroll-mt-24 gap-x-6 gap-y-2 py-6 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
    >
      <a href={`#update-${update.id}`} className={cn("flex items-baseline gap-2 self-start rounded-sm sm:flex-col sm:gap-0.5", focusRing)}>
        <time dateTime={update.created_at} className="font-display text-base font-bold tabular-nums text-foreground">
          {stamp.time}
        </time>
        {stamp.day && <span className="text-xs text-muted-foreground">{stamp.day}</span>}
        {isFresh && <span className="text-[11px] font-semibold text-red-500">{t("live.new")}</span>}
      </a>

      <div className="min-w-0">
        {(update.is_pinned || update.is_key) && (
          <p className="mb-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.08em]">
            {update.is_pinned && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Pin className="h-3 w-3" aria-hidden="true" /> {t("live.pinned")}
              </span>
            )}
            {update.is_key && (
              <span className="inline-flex items-center gap-1 text-red-500">
                <Siren className="h-3 w-3" aria-hidden="true" /> {t("live.key")}
              </span>
            )}
          </p>
        )}
        {update.title && <h3 className={cn("font-display font-bold leading-snug text-foreground", update.is_key ? "text-xl" : "text-lg")}>{update.title}</h3>}
        <p className={cn("whitespace-pre-line break-words text-[1.0625rem] leading-relaxed text-foreground/90", update.title && "mt-1.5")}>
          <UpdateText text={update.body} />
        </p>
        {update.image_url && (
          <img src={update.image_url} alt="" loading="lazy" decoding="async" className="mt-4 max-h-[28rem] w-full rounded-xl bg-secondary/40 object-cover" />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {author && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={author.avatar_url || ""} alt="" />
                <AvatarFallback className="text-[9px]">{author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {author.name}
            </span>
          )}
          {edited && <span>{t("live.edited")}</span>}
          <button type="button" onClick={copyLink} className={cn("inline-flex items-center gap-1 rounded-sm hover:text-foreground", focusRing)} title={t("live.copyLink")}>
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t("live.copyLinkShort")}</span>
          </button>
          {canManage && (
            <span className="ml-auto inline-flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(update)} title={t("live.edit")}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{t("live.edit")}</span>
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={togglePin} title={update.is_pinned ? t("live.unpin") : t("live.pin")}>
                {update.is_pinned ? <PinOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Pin className="h-3.5 w-3.5" aria-hidden="true" />}
                <span className="sr-only">{update.is_pinned ? t("live.unpin") : t("live.pin")}</span>
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={remove} title={t("live.delete")}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{t("live.delete")}</span>
              </Button>
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

/** The live updates under the article: newest first, pinned ones on top, new ones arriving live */
export default function LiveBlogFeed({ articleId, status, updates, loading, failed, onRetry, fresh, clearFresh, canManage, onStatusChange }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<LiveUpdate | null>(null);
  const [headVisible, setHeadVisible] = useState(true);
  const headRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => sortUpdates(updates ?? []), [updates]);
  const pinned = sorted.filter((u) => u.is_pinned);
  const rest = sorted.filter((u) => !u.is_pinned);

  const authorIds = useMemo(() => [...new Set(sorted.map((u) => u.author_id).filter((id): id is string => !!id))].sort(), [sorted]);
  const { data: authors } = useQuery({
    queryKey: ["live-authors", authorIds.join(",")],
    enabled: authorIds.length > 0,
    staleTime: 10 * 60_000,
    queryFn: () => loadAuthors(authorIds),
  });

  // "N new updates" only matters while the top of the feed is out of sight
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setHeadVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!headVisible || !fresh.size) return;
    const id = window.setTimeout(clearFresh, 8000);
    return () => window.clearTimeout(id);
  }, [headVisible, fresh, clearFresh]);

  // Links to one update (#update-…) land on it once the list is there
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !updates?.length || !window.location.hash.startsWith("#update-")) return;
    jumped.current = true;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [updates]);

  const latest = sorted.reduce<string | null>((max, u) => (!max || u.created_at > max ? u.created_at : max), null);
  const showPill = !headVisible && fresh.size > 0;

  return (
    <section id="live" aria-labelledby="live-title" className="mt-12 max-w-[40rem] scroll-mt-24">
      <div ref={headRef} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <h2 id="live-title" className="font-display text-2xl font-bold text-foreground">
            {t("live.updatesTitle")}
          </h2>
          <LiveLabel ended={status === "ended"} size="md" />
        </div>
        {latest && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("live.lastUpdate", { time: lastStamp(latest) })}
          </p>
        )}
      </div>

      {canManage && (
        <div className="mt-6">
          <LiveUpdateComposer articleId={articleId} status={status} onStatusChange={onStatusChange} editing={editing} onDoneEditing={() => setEditing(null)} />
        </div>
      )}

      {loading ? (
        <div className="divide-y divide-border/60" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-x-6 gap-y-2 py-6 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
              <Skeleton className="h-5 w-12" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : failed ? (
        <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          {t("live.loadError")}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> {t("live.retry")}
          </Button>
        </div>
      ) : !sorted.length ? (
        <div className="flex items-start gap-3 py-10 text-muted-foreground">
          <Radio className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-relaxed">{status === "live" ? t("live.empty") : t("live.emptyEnded")}</p>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="-mx-4 mt-6 divide-y divide-border/60 bg-card/40 px-4 sm:-mx-5 sm:rounded-2xl sm:px-5">
              <AnimatePresence initial={false}>
                {pinned.map((u) => (
                  <UpdateItem key={u.id} update={u} author={u.author_id ? authors?.[u.author_id] : undefined} isFresh={fresh.has(u.id)} canManage={canManage} onEdit={setEditing} />
                ))}
              </AnimatePresence>
            </div>
          )}
          <div className="divide-y divide-border/60">
            <AnimatePresence initial={false}>
              {rest.map((u) => (
                <UpdateItem key={u.id} update={u} author={u.author_id ? authors?.[u.author_id] : undefined} isFresh={fresh.has(u.id)} canManage={canManage} onEdit={setEditing} />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <AnimatePresence>
        {showPill && (
          <motion.button
            type="button"
            // x in motion, not a translate class: motion writes the whole transform
            initial={{ opacity: 0, y: 12, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 12, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={() => {
              document.getElementById("live")?.scrollIntoView({ behavior: "smooth", block: "start" });
              window.setTimeout(clearFresh, 1500);
            }}
            className={cn("fixed bottom-24 left-1/2 z-40 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-950/30 active:scale-[0.98] md:bottom-8", focusRing)}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            {t("live.newUpdates", { count: fresh.size })}
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
