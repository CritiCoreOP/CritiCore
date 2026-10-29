import { useEffect, useState } from "react";
import { setSeo, cleanupSeo } from "@/lib/seo";
import imdbLogo from "@/assets/imdb-logo.png";
import ApiErrorPage from "@/components/ApiErrorPage";
import Footer from "@/components/Footer";
import SourceLink from "@/components/SourceLink";
import ReviewSection from "@/components/ReviewSection";
import SimilarMedia from "@/components/SimilarMedia";
import MediaImageGallery from "@/components/MediaImageGallery";
import SaveButton from "@/components/SaveButton";
import ReleaseReminderButton from "@/components/ReleaseReminderButton";
import AddToListDialog from "@/components/AddToListDialog";
import CastMemberOverlay from "@/components/CastMemberOverlay";
import StudioOverlay from "@/components/StudioOverlay";
import ReportDialog from "@/components/ReportDialog";
import ShareButton from "@/components/ShareButton";
import MediaStatusButton from "@/components/MediaStatusButton";
import FollowButton from "@/components/FollowButton";
import MediaDetailHero from "@/components/MediaDetailHero";
import TrailerEmbed from "@/components/TrailerEmbed";
import { resolveSeriesCertification } from "@/components/AgeRatingBadge";
import AgeRatingMark from "@/components/detail/AgeRatingMark";
import MediaLabels, { type MediaLabel } from "@/components/detail/MediaLabels";
import { FactGrid, Fact } from "@/components/detail/FactGrid";
import WatchProviders, { useRegionOffers } from "@/components/detail/WatchProviders";
import { formatRelative, formatRuntime } from "@/components/detail/format";
import DetailSection from "@/components/DetailSection";
import DetailSidebarCard from "@/components/DetailSidebarCard";
import { useParams, Link } from "@/lib/locale-router";
import { useTriggerEnrichment } from "@/hooks/useMediaEnrichment";
import { useSeriesDetail, useOmdbData, useSeriesAlternativeTitles, useSimilarSeries } from "@/hooks/useMedia";
import { tmdbImage, tmdbBackdrop, type TmdbSeriesDetail } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useApiTimeout } from "@/hooks/useApiTimeout";
import { useAutoTags } from "@/hooks/useAutoTags";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { useTvdbSeriesEnrichment } from "@/hooks/useTvdbEnrichment";
import { Award, Calendar, CalendarClock, ChevronDown, Clapperboard, Image as ImageIcon, Layers, PlayCircle, Star, Tv, Users } from "lucide-react";

// TMDB sends status and type as English enums; unknown values are shown as they come
const STATUS_KEYS: Record<string, string> = {
  "Returning Series": "details.tvStatus.returning",
  Ended: "details.tvStatus.ended",
  Canceled: "details.tvStatus.canceled",
  "In Production": "details.tvStatus.inProduction",
  Planned: "details.tvStatus.planned",
  Pilot: "details.tvStatus.pilot",
};
const TYPE_KEYS: Record<string, string> = {
  Miniseries: "details.tvType.miniseries",
  Reality: "details.tvType.reality",
  Documentary: "details.tvType.documentary",
  "Talk Show": "details.tvType.talkShow",
  News: "details.tvType.news",
  Video: "details.tvType.video",
};

/* ── Seasons: poster, name, year and episode count instead of bare "S1" tiles ── */
function SeasonRail({ show, id }: { show: TmdbSeriesDetail; id: string }) {
  const { t, i18n } = useTranslation();
  const seasons = [...(show.seasons ?? [])]
    // Specials/extras at the end: people come for the main seasons
    .sort((a, b) => (a.season_number === 0 ? 1 : b.season_number === 0 ? -1 : a.season_number - b.season_number));
  if (!seasons.length) return null;
  const next = show.next_episode_to_air;
  const fmt = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "long", year: "numeric" });

  return (
    <DetailSection title={`${t("details.seasons")} (${show.number_of_seasons})`} delay={0.16}>
      {next?.air_date && (
        <p className="mb-4 flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground">
          <CalendarClock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          {t("details.nextEpisode", { season: next.season_number, episode: next.episode_number, date: fmt.format(new Date(next.air_date)) })}
        </p>
      )}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 scrollbar-none md:mx-0 md:scroll-px-0 md:px-0">
        {seasons.map((s) => (
          <li key={s.id} className="w-[132px] shrink-0 snap-start sm:w-[150px]">
            <Link to={`/serien/${id}/staffel/${s.season_number}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border/30 bg-muted">
                {s.poster_path ? (
                  <img
                    src={tmdbImage(s.poster_path, "w185")!}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-3xl font-bold text-muted-foreground/60">
                    {s.season_number === 0 ? "SP" : `S${s.season_number}`}
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{s.name}</p>
                {!!s.vote_average && s.vote_average > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums text-foreground/80">
                    <Star className="h-3 w-3 fill-current text-score-high" aria-hidden />
                    {s.vote_average.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {[s.air_date?.slice(0, 4), t("details.episodeCount", { count: s.episode_count })].filter(Boolean).join(" · ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}

const SeriesDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  useTriggerEnrichment("tv", id);
  const { data: show, isLoading, isError } = useSeriesDetail(id || "");
  const { t, i18n } = useTranslation();
  const timedOut = useApiTimeout(isLoading, !!show);
  const { data: omdb } = useOmdbData(show?.external_ids?.imdb_id);
  const { data: altTitles } = useSeriesAlternativeTitles(id || "");
  const backNav = useBackNavigation("series");
  const [showAltTitles, setShowAltTitles] = useState(false);
  const { data: similarSeries, isLoading: similarLoading } = useSimilarSeries(id || "");
  const { stream } = useRegionOffers(show?.["watch/providers"]);

  const { data: tvdbData } = useTvdbSeriesEnrichment({
    tmdbId: show?.id,
    name: show?.name,
    year: show?.first_air_date?.slice(0, 4),
    enabled: !!show,
  });

  // Genres only, no tags. TMDB + TVDB genres merged case-insensitively.
  const mergedGenres = (() => {
    if (!show?.genres) return [] as Array<{ id: string | number; name: string }>;
    const seen = new Map<string, { id: string | number; name: string }>();
    for (const g of show.genres) seen.set(g.name.toLowerCase(), { id: g.id, name: g.name });
    for (const g of tvdbData?.genres ?? []) {
      const key = g.name.toLowerCase();
      if (!seen.has(key)) seen.set(key, { id: `tvdb-${g.id}`, name: g.name });
    }
    return Array.from(seen.values());
  })();

  useAutoTags(id, "series", show?.genres);

  useEffect(() => {
    if (show) {
      const poster = show.poster_path ? `https://image.tmdb.org/t/p/w780${show.poster_path}` : undefined;
      const desc = show.overview ? show.overview.slice(0, 160) : t("meta.seriesDetail.description", { title: show.name });
      setSeo({
        title: t("meta.seriesDetail.title", { title: show.name }),
        description: desc,
        url: `/serien/${id}`,
        image: poster,
        type: "video.tv_show",
        jsonLd: {
          "@type": "TVSeries",
          name: show.name,
          description: show.overview,
          image: poster,
          datePublished: show.first_air_date,
          numberOfSeasons: show.number_of_seasons,
          numberOfEpisodes: show.number_of_episodes,
          genre: show.genres?.map((g) => g.name),
          aggregateRating: show.vote_average ? { "@type": "AggregateRating", ratingValue: show.vote_average, bestRating: 10 } : undefined,
        },
      });
    }
    return () => cleanupSeo();
  }, [show, t, id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16">
          <div className="container mx-auto max-w-[1440px] px-4 pt-6 md:px-8">
            <Skeleton className="h-[420px] w-full rounded-3xl md:h-[55vh]" />
          </div>
          <div className="container mx-auto max-w-[1440px] px-4 py-10 md:px-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-20 w-full max-w-[65ch]" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-4">
                  {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[2/3] w-[150px] rounded-xl" />)}
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!show || isError || timedOut) return <ApiErrorPage />;

  const backdrop = tmdbBackdrop(show.backdrop_path);
  const trailer = show.videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube");
  const score = Math.round(show.vote_average * 10) / 10;
  const hasOmdb = omdb && omdb.Response !== "False";
  const rtRating = hasOmdb ? omdb.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value : undefined;
  const studios = show.production_companies?.filter((c) => c.logo_path) ?? [];
  const ageRating = resolveSeriesCertification(show.content_ratings);
  const network = show.networks?.[0];
  const keywords = show.keywords?.results ?? [];

  // Facts in plain language: localized status/type, years instead of ISO dates
  const firstYear = show.first_air_date?.slice(0, 4);
  const lastYear = show.last_episode_to_air?.air_date?.slice(0, 4);
  const running = show.status === "Returning Series" || show.status === "In Production";
  const aired = !firstYear
    ? null
    : running
      ? t("details.airedSince", { from: firstYear })
      : lastYear && lastYear !== firstYear
        ? t("details.airedRange", { from: firstYear, to: lastYear })
        : firstYear;
  const runtime = show.episode_run_time?.[0] || show.last_episode_to_air?.runtime;
  const statusText = STATUS_KEYS[show.status] ? t(STATUS_KEYS[show.status]) : show.status;
  const statusTone = show.status === "Returning Series" ? "text-score-high" : show.status === "Canceled" ? "text-score-low" : "";
  const typeText = show.type && TYPE_KEYS[show.type] ? t(TYPE_KEYS[show.type]) : null;
  const language = show.original_language ? new Intl.DisplayNames([i18n.language], { type: "language" }).of(show.original_language) : null;
  const countries = (show.origin_country ?? []).map((c) => new Intl.DisplayNames([i18n.language], { type: "region" }).of(c) ?? c).join(", ");
  const episodeLength = formatRuntime(runtime, t);
  const nextAir = show.next_episode_to_air?.air_date ? new Date(`${show.next_episode_to_air.air_date}T12:00:00`) : null;

  const candidates: (MediaLabel | null)[] = [
    show.status
      ? { id: "status", text: statusText, icon: Clapperboard, tone: show.status === "Returning Series" ? "positive" : show.status === "Canceled" ? "negative" : "default" }
      : null,
    aired ? { id: "aired", text: aired, icon: Calendar } : null,
    show.number_of_seasons ? { id: "seasons", text: t("details.labels.seasons", { count: show.number_of_seasons }), icon: Layers } : null,
    show.number_of_episodes ? { id: "episodes", text: t("details.episodeCount", { count: show.number_of_episodes }) } : null,
    show.type === "Miniseries" && typeText ? { id: "type", text: typeText } : null,
    nextAir && nextAir.getTime() > Date.now()
      ? { id: "next", text: t("details.labels.nextEpisode", { when: formatRelative(nextAir) }), icon: CalendarClock, tone: "accent" }
      : null,
    stream[0] ? { id: "stream", text: t("details.labels.streaming", { provider: stream[0].provider_name }), icon: Tv, tone: "positive" } : null,
  ];
  const labels = candidates.filter((l): l is MediaLabel => l !== null);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-16">
        <MediaDetailHero
          backdrop={backdrop}
          poster={tmdbImage(show.poster_path)}
          title={show.name}
          tagline={show.tagline}
          score={score}
          genres={(mergedGenres.length ? mergedGenres : show.genres || []) as { id: number; name: string }[]}
          labels={
            <MediaLabels
              labels={labels}
              leading={ageRating ? <AgeRatingMark system="FSK" rating={ageRating.rating} /> : undefined}
            />
          }
          backPath={backNav.path}
          backLabel={backNav.label}
          reviewLabel={t("reviews.writeReview")}
          actions={
            <>
              <FollowButton targetId={String(show.id)} targetType="series" targetName={show.name} targetImage={tmdbImage(show.poster_path)} showCount />
              <MediaStatusButton mediaId={String(show.id)} mediaType="series" mediaTitle={show.name} mediaPoster={tmdbImage(show.poster_path)} />
              <SaveButton targetId={String(show.id)} targetType="series" />
              <ReleaseReminderButton mediaId={String(show.id)} mediaType="series" title={show.name} image={tmdbImage(show.poster_path)} releaseDate={show.first_air_date} />
              <AddToListDialog mediaId={String(show.id)} mediaType="series" mediaTitle={show.name} mediaPoster={tmdbImage(show.poster_path)} />
              <ShareButton title={show.name} mediaId={show.id} mediaType="s" />
              <ReportDialog targetId={String(show.id)} targetType="series" targetTitle={show.name} />
            </>
          }
        />

        <div className="container mx-auto max-w-[1440px] px-4 py-10 md:px-8 md:py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
            <div className="min-w-0 space-y-12">
              {/* Plot + the facts that matter, right where people read about the show */}
              <DetailSection title={t("details.plot")} delay={0.08}>
                {show.overview && <p className="max-w-[65ch] text-base leading-relaxed text-foreground/85">{show.overview}</p>}
                <FactGrid>
                  {!!show.created_by?.length && (
                    <Fact label={t("details.createdBy")}>{show.created_by.map((c) => c.name).join(", ")}</Fact>
                  )}
                  <Fact label={t("details.statusLabel")}><span className={statusTone}>{statusText}</span></Fact>
                  {network && (
                    <Fact label={t("details.network")}>
                      {network.logo_path ? (
                        <img src={`https://image.tmdb.org/t/p/h30${network.logo_path}`} alt={network.name} title={network.name} className="h-5 max-w-[120px] object-contain object-left brightness-0 invert opacity-85" />
                      ) : network.name}
                    </Fact>
                  )}
                  {aired && <Fact label={t("details.aired")}>{aired}</Fact>}
                  {episodeLength && <Fact label={t("details.episodeLength")}>{episodeLength}</Fact>}
                  {!!show.number_of_episodes && (
                    <Fact label={t("details.scope")}>
                      {t("details.labels.seasonsAndEpisodes", { seasons: t("details.labels.seasons", { count: show.number_of_seasons }), episodes: t("details.episodeCount", { count: show.number_of_episodes }) })}
                    </Fact>
                  )}
                  {language && <Fact label={t("details.originalLanguage")}>{language}</Fact>}
                  {countries && <Fact label={t("details.country")}>{countries}</Fact>}
                  {typeText && <Fact label={t("details.type")}>{typeText}</Fact>}
                </FactGrid>
              </DetailSection>

              <WatchProviders providers={show["watch/providers"]} />

              {show.number_of_seasons > 0 && <SeasonRail show={show} id={id!} />}

              {trailer && (
                <DetailSection title={t("details.trailer")} icon={<PlayCircle className="h-5 w-5 text-primary" />} delay={0.18}>
                  <TrailerEmbed videoKey={trailer.key} title={trailer.name} thumbnail={backdrop} />
                </DetailSection>
              )}

              {!!show.credits?.cast?.length && (
                <DetailSection
                  title={t("details.cast")}
                  delay={0.2}
                  trailing={
                    <Link to={`/cast/${id}?type=series`} className="inline-flex items-center gap-1.5 py-2 -my-2 text-xs font-semibold text-primary hover:underline">
                      <Users className="h-4 w-4" />
                      {t("details.fullCastCrew")}
                    </Link>
                  }
                >
                  <div className="flex items-stretch gap-3 overflow-x-auto pb-3 scrollbar-none">
                    {show.credits.cast.slice(0, 12).map((c) => (
                      <CastMemberOverlay key={c.id} id={c.id} name={c.name} character={c.character} profilePath={c.profile_path} />
                    ))}
                  </div>
                </DetailSection>
              )}

              <div id="reviews" className="scroll-mt-24" style={{ animation: "detail-section-in 0.6s var(--mcc-ease-expressive) 0.25s both" }}>
                <Tabs defaultValue="reviews" className="w-full">
                  <TabsList className="mb-5 h-auto rounded-xl border border-border/20 bg-card/60 p-1">
                    <TabsTrigger value="reviews" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                      <Star className="h-4 w-4" />
                      {t("details.reviews")}
                    </TabsTrigger>
                    <TabsTrigger value="images" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                      <ImageIcon className="h-4 w-4" />
                      {t("details.images")}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="reviews">
                    <ReviewSection mediaId={String(show.id)} mediaType="series" title={show.name} releaseDate={show.first_air_date} />
                  </TabsContent>
                  <TabsContent value="images">
                    <MediaImageGallery mediaId={String(show.id)} mediaType="series" mediaTitle={show.name} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Sidebar: other ratings and background information */}
            <aside className="min-w-0 space-y-5" aria-label={t("details.facts")}>
              {hasOmdb && (omdb.imdbRating !== "N/A" || omdb.Metascore !== "N/A" || rtRating) && (
                <DetailSidebarCard title={t("details.externalRatings")} delay={0.12}>
                  <dl className="space-y-3">
                    {omdb.imdbRating && omdb.imdbRating !== "N/A" && (
                      <div className="flex items-center justify-between">
                        <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                          <img src={imdbLogo} alt="" className="h-4 rounded" />IMDb
                        </dt>
                        <dd className="font-bold tabular-nums text-foreground">{omdb.imdbRating}<span className="text-xs font-normal text-muted-foreground">/10</span></dd>
                      </div>
                    )}
                    {omdb.Metascore && omdb.Metascore !== "N/A" && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-muted-foreground">Metascore</dt>
                        <dd className="font-bold tabular-nums text-foreground">{omdb.Metascore}<span className="text-xs font-normal text-muted-foreground">/100</span></dd>
                      </div>
                    )}
                    {rtRating && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-muted-foreground">Rotten Tomatoes</dt>
                        <dd className="font-bold tabular-nums text-foreground">{rtRating}</dd>
                      </div>
                    )}
                  </dl>
                  {omdb.Awards && omdb.Awards !== "N/A" && (
                    <p className="flex gap-2 border-t border-border/20 pt-3 text-xs text-muted-foreground">
                      <Award className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {omdb.Awards}
                    </p>
                  )}
                </DetailSidebarCard>
              )}

              {studios.length > 0 && (
                <DetailSidebarCard title={t("details.studios")} delay={0.16}>
                  <div className="flex flex-wrap items-center gap-4">
                    {studios.map((company) => (
                      <StudioOverlay key={company.id} id={company.id} name={company.name} logoPath={company.logo_path} />
                    ))}
                  </div>
                </DetailSidebarCard>
              )}

              {keywords.length > 0 && (
                <DetailSidebarCard title={t("details.keywords")} delay={0.2}>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.slice(0, 12).map((kw) => (
                      <span key={kw.id} className="rounded-full border border-border/20 bg-secondary/50 px-2.5 py-1 text-xs text-foreground/80">{kw.name}</span>
                    ))}
                  </div>
                </DetailSidebarCard>
              )}

              {altTitles && altTitles.length > 0 && (
                <div className="rounded-2xl border border-border/25 bg-card/60 p-5">
                  <button
                    type="button"
                    onClick={() => setShowAltTitles(!showAltTitles)}
                    aria-expanded={showAltTitles}
                    className="flex w-full items-center justify-between py-2 -my-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {t("details.alternativeTitles")} ({altTitles.length})
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", showAltTitles && "rotate-180")} />
                  </button>
                  {showAltTitles && (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {altTitles.slice(0, 15).map((at, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground">{at.iso_3166_1}</span>
                          <span className="text-foreground">{at.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                {t("details.tmdbEditHint")}{" "}
                <a href={`https://www.themoviedb.org/tv/${show.id}/edit`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                  {t("details.tmdbEditLink")}
                </a>
              </p>
              <div className="flex flex-wrap items-center gap-2 px-1">
                <SourceLink href={`https://www.themoviedb.org/tv/${show.id}`} label="TMDB" />
                {show.external_ids?.imdb_id && (
                  <SourceLink href={`https://www.imdb.com/title/${show.external_ids.imdb_id}`} label="IMDb" />
                )}
              </div>
            </aside>

            <div className="min-w-0 lg:col-span-2">
              <SimilarMedia items={similarSeries} isLoading={similarLoading} mediaType="series" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SeriesDetailPage;
