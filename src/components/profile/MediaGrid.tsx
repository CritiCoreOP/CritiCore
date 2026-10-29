import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mediaPath, mediaTypeLabel, useMediaInfo } from "./media";
import { Poster } from "./ProfileParts";

const PAGE = 30;

export const MEDIA_GRID = "grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6";

interface TileProps {
  type: string;
  id: string;
  title: string;
  poster: string | null | undefined;
  meta: ReactNode;
  loading?: boolean;
  removeLabel?: string;
  onRemove?: () => void;
}

/** Poster with title and one line of facts; the remove button sits on the poster's corner */
export function MediaTile({ type, id, title, poster, meta, loading, removeLabel, onRemove }: TileProps) {
  return (
    <li className="group relative min-w-0">
      <Link to={mediaPath(type, id)} className="block rounded-[8px]">
        <Poster src={poster} alt="" type={type} className="ring-primary/70 transition-shadow group-hover:ring-2" />
        {loading ? (
          <span className="mt-2 block h-4 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">{title}</p>
        )}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
      </Link>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${removeLabel}: ${title}`}
          title={removeLabel}
          className={cn(
            "absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm transition-opacity hover:text-destructive active:scale-95",
            "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100",
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

/** A saved title only knows type and id; title and poster come from the shared media cache */
export function SavedTile({ type, id, onRemove }: { type: string; id: string; onRemove: () => void }) {
  const { t } = useTranslation();
  const { data: info, isLoading } = useMediaInfo(type, id);
  return (
    <MediaTile
      type={type}
      id={id}
      title={info?.title ?? `#${id}`}
      poster={info?.poster}
      loading={isLoading}
      meta={[mediaTypeLabel(t, type), info?.year].filter(Boolean).join(", ")}
      removeLabel={t("profile.unsave")}
      onRemove={onRemove}
    />
  );
}

/** Shows `PAGE` tiles at a time; `render` draws one */
export function PagedGrid<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(PAGE);
  return (
    <div className="flex flex-col gap-6">
      <ul className={MEDIA_GRID}>{items.slice(0, shown).map(render)}</ul>
      {items.length > shown && (
        <Button variant="outline" className="self-center rounded-full" onClick={() => setShown((n) => n + PAGE)}>
          {t("common.loadMore")}
        </Button>
      )}
    </div>
  );
}
