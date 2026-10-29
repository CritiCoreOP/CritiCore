import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScoreBadge from "@/components/ScoreBadge";
import { formatDate } from "@/lib/locale";
import { sortReviews, type ReviewSort } from "@/lib/profileStats";
import { isMediaKind, mediaPath, mediaTypeLabel, mediaTypePlural, useMediaInfo, type MediaKind } from "./media";
import { EmptyBlock, FilterChips, Poster } from "./ProfileParts";

export interface ProfileReview {
  id: string;
  media_id: string;
  media_type: string;
  score: number;
  title: string | null;
  content: string | null;
  created_at: string;
  is_critic_review: boolean;
  season_number?: number | null;
  episode_number?: number | null;
}

const PAGE = 20;

/** One review: the title it is about first (resolved from TMDB/IGDB), then the review's own headline and text */
function ReviewRow({ review }: { review: ProfileReview }) {
  const { t } = useTranslation();
  const { data: info, isLoading } = useMediaInfo(review.media_type, review.media_id);
  // Without a resolvable title (unknown type, provider error) the id stands in instead of an endless skeleton
  const name = info?.title ?? (isLoading ? "" : `#${review.media_id}`);
  const part =
    review.season_number && review.episode_number
      ? t("profile.episode", { season: review.season_number, episode: review.episode_number })
      : review.season_number
        ? t("profile.season", { season: review.season_number })
        : null;

  return (
    <li>
      <Link
        to={mediaPath(review.media_type, review.media_id, review.season_number)}
        className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-4 rounded-[12px] p-3 transition-colors hover:bg-muted/40 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
      >
        <Poster src={info?.poster} alt="" type={review.media_type} />
        <div className="min-w-0">
          {name ? (
            <p className="line-clamp-2 font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {name}
              {info?.year && <span className="ml-1.5 font-normal text-muted-foreground">{info.year}</span>}
            </p>
          ) : (
            <span className="block h-5 w-40 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" aria-hidden="true" />
          )}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{part ? `${mediaTypeLabel(t, review.media_type)} · ${part}` : mediaTypeLabel(t, review.media_type)}</span>
            {review.is_critic_review && <span className="rounded-full border border-primary/40 px-1.5 py-px font-medium text-primary">{t("profile.criticBadge")}</span>}
          </p>
          {review.title && <p className="mt-2 text-sm font-medium text-foreground">{review.title}</p>}
          {review.content && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{review.content}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ScoreBadge score={review.score} size="sm" />
          <time dateTime={review.created_at} className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
            {formatDate(review.created_at)}
          </time>
        </div>
      </Link>
    </li>
  );
}

/** Reviews with a type filter (only for types that occur), sorting and paging */
const ReviewList = ({ reviews, emptyText }: { reviews: ProfileReview[]; emptyText: string }) => {
  const { t } = useTranslation();
  const [type, setType] = useState<"all" | MediaKind>("all");
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [shown, setShown] = useState(PAGE);

  const counts = useMemo(() => {
    const c: Partial<Record<MediaKind, number>> = {};
    for (const r of reviews) if (isMediaKind(r.media_type)) c[r.media_type] = (c[r.media_type] ?? 0) + 1;
    return c;
  }, [reviews]);
  const types = (["movie", "series", "game"] as const).filter((k) => counts[k]);

  const visible = useMemo(() => sortReviews(type === "all" ? reviews : reviews.filter((r) => r.media_type === type), sort), [reviews, type, sort]);

  if (reviews.length === 0) return <EmptyBlock icon={<Star className="h-8 w-8" />} title={emptyText} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {types.length > 1 ? (
          <FilterChips
            label={t("profile.filterType")}
            value={type}
            onChange={(v) => { setType(v); setShown(PAGE); }}
            options={[{ value: "all", label: t("explore.filters.allTypes"), count: reviews.length }, ...types.map((k) => ({ value: k, label: mediaTypePlural(t, k), count: counts[k] }))]}
          />
        ) : (
          <span />
        )}
        <Select value={sort} onValueChange={(v) => setSort(v as ReviewSort)}>
          <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/70 px-3 text-sm" aria-label={t("profile.sort.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="newest">{t("profile.sort.newest")}</SelectItem>
            <SelectItem value="best">{t("profile.sort.best")}</SelectItem>
            <SelectItem value="worst">{t("profile.sort.worst")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ul className="-mx-3 flex flex-col">
        {visible.slice(0, shown).map((r) => (
          <ReviewRow key={r.id} review={r} />
        ))}
      </ul>

      {visible.length > shown && (
        <Button variant="outline" className="self-center rounded-full" onClick={() => setShown((n) => n + PAGE)}>
          {t("common.loadMore")}
        </Button>
      )}
    </div>
  );
};

export default ReviewList;
