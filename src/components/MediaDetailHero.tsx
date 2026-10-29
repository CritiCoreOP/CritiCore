import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { ArrowLeft as ArrowBackTwoTone, PenSquare as RateReviewTwoTone } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
interface MediaDetailHeroProps {
  backdrop: string | null | undefined;
  poster?: string | null;
  title: string;
  tagline?: string | null;
  score: number;
  genres: { id: number; name: string }[];
  /** Plain text line under the title; replaced by `labels` when given */
  meta?: string;
  /** Age rating and short labels (status, format, features) under the title */
  labels?: ReactNode;
  backPath: string;
  backLabel: string;
  actions: ReactNode;
  badges?: ReactNode;
  /** Optional href/anchor for the primary "Review lesen" CTA. Defaults to #reviews. */
  reviewHref?: string;
  reviewLabel?: string;
}

const MediaDetailHero = ({
  backdrop,
  poster,
  title,
  tagline,
  score,
  genres,
  meta,
  labels,
  backPath,
  backLabel,
  actions,
  badges,
  reviewHref = "#reviews",
  reviewLabel,
}: MediaDetailHeroProps) => {
  const { t } = useTranslation();
  const hasScore = score != null && score > 0;
  const resolvedReviewLabel = reviewLabel ?? t("reviews.readReview", "Read review");

  return (
    <div className="container mx-auto px-4 md:px-8 max-w-[1440px] pt-4 md:pt-6">
      {/* Back nav – outside the card, always readable */}
      <Link
        to={backPath}
        className="inline-flex items-center gap-2 py-2 -mt-2 mb-2 text-sm text-foreground/70 hover:text-accent-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <ArrowBackTwoTone className="w-4 h-4" aria-hidden="true" />
        <span>{backLabel}</span>
      </Link>

      {/* Hero card */}
      <section
        aria-labelledby="detail-hero-title"
        className="relative min-h-[420px] overflow-hidden rounded-2xl border border-border/20 shadow-[var(--shadow-card-hover)] isolate sm:rounded-3xl md:min-h-[50vh]"
      >
        {/* Backdrop */}
        {backdrop ? (
          <img
            src={backdrop}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[ken-burns-hero_25s_ease-in-out_infinite_alternate]"
            loading="eager"
            // React 18 only passes the lowercase attribute through; camelCase fetchPriority logs a warning
            {...{ fetchpriority: "high" }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/40 to-background" aria-hidden="true" />
        )}

        {/* Contrast overlay – 4.5:1 on foreground text */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/70 to-background/25" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/10 to-transparent" aria-hidden="true" />

        {/* Content */}
        <div className="relative flex min-h-[420px] flex-col justify-end p-4 sm:p-8 md:min-h-[55vh] md:p-10">
          <div className="flex items-end gap-5 md:gap-7">
            {/* Poster – hidden on mobile */}
            {poster && (
              <div className="hidden md:block flex-shrink-0 motion-safe:animate-[detail-poster-in_0.8s_var(--mcc-ease-expressive)_0.15s_both]">
                <div className="w-32 lg:w-40 rounded-2xl overflow-hidden border border-border/20 shadow-[var(--shadow-card)]">
                  <img
                    src={poster}
                    alt={`Poster von ${title}`}
                    className="w-full h-auto object-cover"
                    loading="eager"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0 motion-safe:animate-[detail-info-in_0.7s_var(--mcc-ease-expressive)_0.2s_both]">
              {/* Meta badges row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {hasScore && <ScoreBadge score={score} size="md" />}

                {badges && (
                  <span className="inline-flex h-7 items-center rounded-full bg-background/70 backdrop-blur-md border border-border/30 px-3 py-1">
                    {badges}
                  </span>
                )}

                {genres.slice(0, 4).map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex h-7 items-center rounded-full border border-accent-light/50 px-3 py-1 text-xs font-semibold text-accent-light bg-background/40 backdrop-blur-sm"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h1
                id="detail-hero-title"
                className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-[3.25rem] font-bold text-foreground leading-[1.1] tracking-tight break-words hyphens-auto"
              >
                {title}
              </h1>

              {tagline && (
                <p className="text-foreground/75 mt-2 italic text-base md:text-lg">
                  „{tagline}"
                </p>
              )}

              {labels ? (
                <div className="mt-4">{labels}</div>
              ) : (
                meta && <p className="text-sm text-foreground/70 mt-2 tracking-wide">{meta}</p>
              )}
            </div>
          </div>

          {/* Actions row */}
          <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={reviewHref}
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-card)] transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/90 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <RateReviewTwoTone className="w-5 h-5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-6 group-hover:scale-110" aria-hidden="true" />
              {resolvedReviewLabel}
            </a>
            {/* flex-auto, not flex-1: equal widths cut "Speichern" to "Speiche"; natural widths wrap to a second row instead */}
            <div className="flex flex-wrap items-center gap-1.5 [&>*]:max-sm:flex-auto [&>*]:max-sm:justify-center">{actions}</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MediaDetailHero;
