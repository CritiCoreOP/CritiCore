import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { Film, Gamepad2, Tv, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ScoreBadge from "@/components/ScoreBadge";
import { useTheme } from "@/hooks/useTheme";

export type MediaCardType = "movie" | "series" | "game" | "anime";

interface MediaCardProps {
  to: string;
  type: MediaCardType;
  title: string;
  poster: string | null;
  year?: string | null;
  primaryGenre?: string | null;
  /** Full genre labels for hover reveal chips (max 3). */
  genres?: string[];
  score: number | null;
  /** Optional NSFW / explicit content — dims/blurs the poster like the existing games card. */
  explicit?: boolean;
  explicitLabel?: string;
  className?: string;
  /** Passed through to <Link state> for contextual back navigation. */
  state?: unknown;
  /** h2 where the cards sit directly under the page's h1 (list pages), h3 inside a titled section */
  headingLevel?: 2 | 3;
  /** Hide the type pill where the whole list has one type (the section title already says it) */
  showType?: boolean;
}

const TYPE_ICON: Record<MediaCardType, typeof Film> = {
  movie: Film,
  series: Tv,
  game: Gamepad2,
  anime: Sparkles,
};

const TYPE_LABEL_KEY: Record<MediaCardType, string> = {
  movie: "explore.typeMovie",
  series: "explore.typeSeries",
  game: "explore.typeGame",
  anime: "explore.typeAnime",
};

const TYPE_LABEL_FALLBACK: Record<MediaCardType, string> = {
  movie: "Movie",
  series: "Series",
  game: "Game",
  anime: "Anime",
};

const MediaCard = ({
  to,
  type,
  title,
  poster,
  year,
  primaryGenre,
  genres,
  score,
  explicit,
  explicitLabel,
  className,
  state,
  headingLevel = 3,
  showType = true,
}: MediaCardProps) => {
  const { t } = useTranslation();
  // Some CDN posters 404 (mostly AniList); without this the card stayed an empty dark tile
  const [imageFailed, setImageFailed] = useState(false);
  const { badgeStyle } = useTheme();
  const isOldBadge = badgeStyle === "old";
  const TypeIcon = TYPE_ICON[type];
  const cta = t("common.details", "Details");
  const chipGenres = (genres ?? []).filter(Boolean).slice(0, 3);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const typeLabel = t(TYPE_LABEL_KEY[type], TYPE_LABEL_FALLBACK[type]);
  // The aria-label replaces the card's content for screen readers, so it carries what the badges show
  const accessibleName = [
    title,
    typeLabel,
    year,
    score ? t("reviews.scoreLabel", { score: score.toFixed(1) }) : t("reviews.scoreNone"),
  ].filter(Boolean).join(", ");

  const metaParts: string[] = [];
  if (year) metaParts.push(year);
  if (primaryGenre) metaParts.push(primaryGenre);

  return (
    <Link
      to={to}
      state={state as never}
      aria-label={accessibleName}
      className={cn(
        "media-card group relative isolate block overflow-hidden rounded-lg bg-card",
        "border border-border/60 shadow-[var(--shadow-card)]",
        "transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-[var(--shadow-card-hover),var(--shadow-glow)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "focus-visible:-translate-y-0.5 focus-visible:border-border focus-visible:shadow-[var(--shadow-card-hover),var(--shadow-glow)]",
        "motion-reduce:transform-none motion-reduce:hover:transform-none motion-reduce:focus-visible:transform-none",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {poster && !imageFailed ? (
          <img
            width={300}
            height={450}
            src={poster}
            alt={title}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className={cn(
              "absolute inset-0 block h-full w-full object-cover object-center",
              "transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
              "sm:group-hover:scale-[1.03] sm:group-focus-visible:scale-[1.03]",
              "motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100",
              explicit && "scale-110 blur-xl",
            )}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-secondary to-card text-muted-foreground">
            <TypeIcon className="h-8 w-8 opacity-40" aria-hidden="true" />
            <span className="text-xs">{t("home.noImage")}</span>
          </div>
        )}

        {/* Scrim: bottom heavy for title legibility — grows on hover/focus to cover the reveal */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 top-[45%]",
            "transition-[top] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "group-hover:top-[15%] group-focus-visible:top-[15%]",
            "motion-reduce:transition-none",
          )}
          style={{
            background:
              "linear-gradient(to top, hsl(var(--media-scrim) / 0.95) 0%, hsl(var(--media-scrim) / 0.85) 45%, hsl(var(--media-scrim) / 0) 100%)",
          }}
        />
        {/* Scrim: subtle top band for badge legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--media-scrim) / 0.25) 0%, hsl(var(--media-scrim) / 0) 100%)",
          }}
        />

        {/* Top row — type pill (left) + rating badge (right) */}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1.5 sm:inset-x-2.5 sm:top-2.5 sm:gap-2">
          {showType ? (
            <span
              className={cn(
                "inline-flex h-6 min-w-0 max-w-[calc(100%-4.5rem)] items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold sm:h-7 sm:max-w-none sm:px-3 sm:py-1 sm:text-[11px]",
                isOldBadge
                  ? "rounded-md bg-black/75 border border-white/20 text-white"
                  : "rounded-full bg-media-scrim/85 border border-border/70 text-media-scrim-foreground",
              )}
            >
              <TypeIcon size={12} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{typeLabel}</span>
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          <ScoreBadge score={score} size="sm" className="shrink-0" />
        </div>

        {/* NSFW badge (games) — sits below the type pill */}
        {explicit && (
          <div className="absolute left-2.5 top-11 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-sm">
            {explicitLabel ?? "18+"}
          </div>
        )}

        {/* Bottom info + hover reveal — anchored to bottom; grows upward on hover so title/meta shift up smoothly */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <Heading
            className="font-display text-sm font-bold text-white line-clamp-2"
            style={{ textShadow: "0 1px 3px hsl(var(--media-scrim) / 0.85)" }}
          >
            {title}
          </Heading>
          {metaParts.length > 0 && (
            <p className="mt-0.5 flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden text-xs text-muted-foreground">
              {metaParts.map((part, idx) => (
                // The year never shrinks; only the genre after it truncates ("2025 • Role-playing (R…" instead of "20… • …")
                <span key={idx} className={`inline-flex items-center gap-1.5 ${idx === 0 && year ? "shrink-0" : "min-w-0"}`}>
                  {idx > 0 && (
                    <span
                      aria-hidden="true"
                      className="inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-accent-light"
                    />
                  )}
                  <span className="min-w-0 truncate">{part}</span>
                </span>
              ))}
            </p>
          )}

          {/* Reveal — expands BELOW the meta row; the block grows upward because it's anchored at bottom */}
          <div
            className={cn(
              "grid grid-rows-[0fr] overflow-hidden",
              "transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "opacity-0",
              "group-hover:grid-rows-[1fr] group-hover:opacity-100 group-hover:mt-2",
              "group-focus-visible:grid-rows-[1fr] group-focus-visible:opacity-100 group-focus-visible:mt-2",
              "motion-reduce:transition-none",
              "motion-reduce:group-focus-visible:grid-rows-[1fr] motion-reduce:group-focus-visible:opacity-100 motion-reduce:group-focus-visible:mt-2",
            )}
          >
            <div className="min-h-0 space-y-2">

              {/* Visual button only, the whole card is the link. It used to reload the entire app via
                  window.location and land on the reviews instead of the details its label promises */}
              <div
                aria-hidden="true"
                className={cn(
                  "block w-full rounded-sm bg-primary px-2 py-1.5 text-center text-xs font-semibold text-primary-foreground",
                  "shadow-[var(--shadow-glow)] transition-colors duration-200 hover:bg-primary/90",
                )}
              >
                {cta}
              </div>
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
};

export default MediaCard;
