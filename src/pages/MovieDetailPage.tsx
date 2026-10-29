import { useEffect, useState } from "react";
import { setSeo, cleanupSeo } from "@/lib/seo";
import imdbLogo from "@/assets/imdb-logo.png";
import ApiErrorPage from "@/components/ApiErrorPage";
import Footer from "@/components/Footer";
import SourceLink from "@/components/SourceLink";
import ReviewSection from "@/components/ReviewSection";
import SimilarMedia from "@/components/SimilarMedia";
import TrailerEmbed from "@/components/TrailerEmbed";
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
import { resolveMovieCertification } from "@/components/AgeRatingBadge";
import DetailSection from "@/components/DetailSection";
import DetailSidebarCard from "@/components/DetailSidebarCard";
import AgeRatingMark from "@/components/detail/AgeRatingMark";
import MediaLabels, { type MediaLabel } from "@/components/detail/MediaLabels";
import { FactGrid, Fact } from "@/components/detail/FactGrid";
import WatchProviders, { useRegionOffers } from "@/components/detail/WatchProviders";
import { formatMoney, formatRuntime, isFuture, isRecent } from "@/components/detail/format";
import { useParams, Link } from "@/lib/locale-router";
import { useTriggerEnrichment } from "@/hooks/useMediaEnrichment";
import { useMovieDetail, useOmdbData, useMovieAlternativeTitles, useSimilarMovies } from "@/hooks/useMedia";
import { tmdbImage, tmdbBackdrop } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useApiTimeout } from "@/hooks/useApiTimeout";
import { useAutoTags } from "@/hooks/useAutoTags";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { formatDate } from "@/lib/locale";
import { Award, Calendar, CalendarClock, Clapperboard, Clock, Layers, Pencil as EditTwoTone, ChevronDown as ExpandMoreTwoTone, Sparkles, Trophy, Tv, Users as GroupsTwoTone, Image as ImageTwoTone, PlayCircle as PlayCircleTwoTone, Star as StarTwoTone, Languages as TranslateTwoTone } from "lucide-react";

/** TMDB movie status values (English) to translation keys */
const MOVIE_STATUS_KEYS: Record<string, string> = {
  Rumored: "details.movieStatus.rumored",
  Planned: "details.movieStatus.planned",
  "In Production": "details.movieStatus.inProduction",
  "Post Production": "details.movieStatus.postProduction",
  Released: "details.movieStatus.released",
  Canceled: "details.movieStatus.canceled",
};

const MovieDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  useTriggerEnrichment("movie", id);
  const { data: movie, isLoading, isError } = useMovieDetail(id || "");
  const { t, i18n } = useTranslation();
  const timedOut = useApiTimeout(isLoading, !!movie);
  const { data: omdb } = useOmdbData(movie?.imdb_id);
  const { data: altTitles } = useMovieAlternativeTitles(id || "");
  const backNav = useBackNavigation("movies");
  const [showAltTitles, setShowAltTitles] = useState(false);
  const { data: similarMovies, isLoading: similarLoading } = useSimilarMovies(id || "");
  const { stream } = useRegionOffers(movie?.["watch/providers"]);

  useAutoTags(id, "movie", movie?.genres);

  useEffect(() => {
    if (movie) {
      const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : undefined;
      const desc = movie.overview
        ? movie.overview.slice(0, 160)
        : t("meta.movieDetail.description", { title: movie.title });
      setSeo({
        title: t("meta.movieDetail.title", { title: movie.title }),
        description: desc,
        url: `/filme/${id}`,
        image: poster,
        type: "video.movie",
        jsonLd: {
          "@type": "Movie",
          name: movie.title,
          description: movie.overview,
          image: poster,
          datePublished: movie.release_date,
          genre: movie.genres?.map((g) => g.name),
          aggregateRating: movie.vote_average ? {
            "@type": "AggregateRating",
            ratingValue: movie.vote_average,
            bestRating: 10,
          } : undefined,
        },
      });
    }
    return () => cleanupSeo();
  }, [movie, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16">
          <Skeleton className="w-full h-[65vh]" />
          <div className="container mx-auto px-4 py-10 max-w-[1440px]">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
              <div className="space-y-6">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  if (!movie || isError || timedOut) return <ApiErrorPage />;

  const backdrop = tmdbBackdrop(movie.backdrop_path);
  const trailer = movie.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
  const score = Math.round(movie.vote_average * 10) / 10;
  const hasOmdb = omdb && omdb.Response !== "False";
  const hasStudios = movie.production_companies?.filter(c => c.logo_path).length > 0;
  const ageRating = resolveMovieCertification(movie.release_dates);
  const rtRating = hasOmdb ? omdb.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value : undefined;
  const oscars = hasOmdb && omdb.Awards ? /Won (\d+) Oscars?/i.exec(omdb.Awards) : null;

  // Key crew (only present once the tmdb function keeps it, see supabase/functions/tmdb)
  const crewNames = (...jobs: string[]) =>
    [...new Set((movie.credits?.crew ?? []).filter((c) => jobs.includes(c.job)).map((c) => c.name))].slice(0, 3).join(", ");
  const directors = crewNames("Director");
  const writers = crewNames("Screenplay", "Writer");
  const novel = crewNames("Novel");
  const composer = crewNames("Original Music Composer");
  const camera = crewNames("Director of Photography");

  const runtime = formatRuntime(movie.runtime, t);
  const upcoming = isFuture(movie.release_date);
  const releaseDate = movie.release_date ? formatDate(movie.release_date, { day: "numeric", month: "long", year: "numeric" }) : null;
  const languageName = movie.original_language ? new Intl.DisplayNames([i18n.language], { type: "language" }).of(movie.original_language) : null;
  const countries = (movie.production_countries ?? [])
    .map((c) => new Intl.DisplayNames([i18n.language], { type: "region" }).of(c.iso_3166_1) ?? c.name)
    .join(", ");
  const statusText = MOVIE_STATUS_KEYS[movie.status] ? t(MOVIE_STATUS_KEYS[movie.status]) : movie.status;

  const candidates: (MediaLabel | null)[] = [
    upcoming && releaseDate
      ? { id: "upcoming", text: t("details.labels.upcoming", { date: releaseDate }), icon: CalendarClock, tone: "accent" }
      : movie.release_date ? { id: "year", text: movie.release_date.slice(0, 4), icon: Calendar } : null,
    runtime ? { id: "runtime", text: runtime, icon: Clock } : null,
    movie.status && movie.status !== "Released" ? { id: "status", text: statusText, icon: Clapperboard } : null,
    isRecent(movie.release_date) ? { id: "new", text: t("details.labels.new"), icon: Sparkles, tone: "accent" } : null,
    stream[0] ? { id: "stream", text: t("details.labels.streaming", { provider: stream[0].provider_name }), icon: Tv, tone: "positive" } : null,
    movie.belongs_to_collection ? { id: "collection", text: movie.belongs_to_collection.name, icon: Layers, title: t("details.labels.collectionHint") } : null,
    oscars ? { id: "oscar", text: t("details.labels.oscar", { count: Number(oscars[1]) }), icon: Trophy, tone: "accent", title: omdb.Awards } : null,
  ];
  const labels = candidates.filter((l): l is MediaLabel => l !== null);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-16">
        <MediaDetailHero
          backdrop={backdrop}
          poster={tmdbImage(movie.poster_path)}
          title={movie.title}
          tagline={movie.tagline}
          score={score}
          genres={movie.genres || []}
          labels={
            <MediaLabels
              labels={labels}
              leading={ageRating ? <AgeRatingMark system="FSK" rating={ageRating.rating} /> : undefined}
            />
          }
          backPath={backNav.path}
          backLabel={backNav.label}
          actions={
            <>
              <FollowButton targetId={String(movie.id)} targetType="movie" targetName={movie.title} targetImage={tmdbImage(movie.poster_path)} showCount />
              <MediaStatusButton mediaId={String(movie.id)} mediaType="movie" mediaTitle={movie.title} mediaPoster={tmdbImage(movie.poster_path)} />
              <SaveButton targetId={String(movie.id)} targetType="movie" />
              <ReleaseReminderButton mediaId={String(movie.id)} mediaType="movie" title={movie.title} image={tmdbImage(movie.poster_path)} releaseDate={movie.release_date} />
              <AddToListDialog mediaId={String(movie.id)} mediaType="movie" mediaTitle={movie.title} mediaPoster={tmdbImage(movie.poster_path)} />
              <ShareButton title={movie.title} mediaId={movie.id} mediaType="m" />
              <ReportDialog targetId={String(movie.id)} targetType="movie" targetTitle={movie.title} />
              <SourceLink href={`https://www.themoviedb.org/movie/${movie.id}`} label="TMDB" className="hidden sm:inline-flex" />
              {movie.imdb_id && (
                <SourceLink href={`https://www.imdb.com/title/${movie.imdb_id}`} label="IMDb" className="hidden sm:inline-flex" />
              )}
            </>
          }
        />

        {/* Content grid */}
        <div className="container mx-auto px-4 md:px-8 py-10 max-w-[1440px]">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
            {/* Main column */}
            <div className="space-y-10 min-w-0">
              {/* Plot */}
              <DetailSection title={t("details.plot")} delay={0.1}>
                {movie.overview && <p className="text-foreground/85 leading-relaxed text-base max-w-[65ch]">{movie.overview}</p>}
                <FactGrid>
                  {directors && <Fact label={t("details.crew.director")}>{directors}</Fact>}
                  {writers && <Fact label={t("details.crew.screenplay")}>{writers}</Fact>}
                  {novel && <Fact label={t("details.crew.novel")}>{novel}</Fact>}
                  {composer && <Fact label={t("details.crew.music")}>{composer}</Fact>}
                  {camera && <Fact label={t("details.crew.camera")}>{camera}</Fact>}
                  {releaseDate && <Fact label={t("details.releaseDate")}>{releaseDate}</Fact>}
                  {runtime && <Fact label={t("details.runtimeLabel")}>{runtime}</Fact>}
                  <Fact label={t("details.statusLabel")}>
                    <span className={movie.status === "Released" ? "text-score-high" : movie.status === "Canceled" ? "text-score-low" : ""}>{statusText}</span>
                  </Fact>
                  {movie.original_title && movie.original_title !== movie.title && (
                    <Fact label={t("details.originalTitle")}>{movie.original_title}</Fact>
                  )}
                  {languageName && <Fact label={t("details.originalLanguage")}>{languageName}</Fact>}
                  {countries && <Fact label={t("details.country")}>{countries}</Fact>}
                  {formatMoney(movie.budget) && <Fact label={t("details.budget")}>{formatMoney(movie.budget)}</Fact>}
                  {formatMoney(movie.revenue) && <Fact label={t("details.revenue")}>{formatMoney(movie.revenue)}</Fact>}
                </FactGrid>
              </DetailSection>

              <WatchProviders providers={movie["watch/providers"]} />

              {/* Trailer */}
              {trailer && (
                <DetailSection
                  title={t("details.trailer")}
                  icon={<PlayCircleTwoTone className="w-5 h-5 text-primary" />}
                  delay={0.15}
                >
                  <TrailerEmbed videoKey={trailer.key} title={trailer.name} thumbnail={backdrop} />

                </DetailSection>
              )}

              {/* Cast */}
              {movie.credits?.cast && movie.credits.cast.length > 0 && (
                <DetailSection
                  title={t("details.cast")}
                  delay={0.2}
                  trailing={
                    <Link to={`/cast/${id}?type=movie`} className="inline-flex items-center gap-1.5 py-2 -my-2 text-xs text-primary hover:underline font-semibold">
                      <GroupsTwoTone className="w-4 h-4" />
                      {t("details.fullCastCrew")}
                    </Link>
                  }
                >
                  <div className="flex gap-3 items-stretch overflow-x-auto pb-3 scrollbar-thin">
                    {movie.credits.cast.slice(0, 12).map(c => (
                      <CastMemberOverlay key={c.id} id={c.id} name={c.name} character={c.character} profilePath={c.profile_path} />
                    ))}
                  </div>
                </DetailSection>
              )}

              {/* Reviews & Images – Tabs */}
              <div id="reviews" className="scroll-mt-24" style={{ animation: "detail-section-in 0.6s var(--mcc-ease-expressive) 0.25s both" }}>
                <Tabs defaultValue="reviews" className="w-full">
                  <TabsList className="bg-card/60 border border-border/25 mb-5 rounded-xl p-1 h-auto">
                    <TabsTrigger value="reviews" className="rounded-lg gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                      <StarTwoTone className="w-4 h-4" aria-hidden="true" />
                      {t("details.reviews", "Reviews")}
                    </TabsTrigger>
                    <TabsTrigger value="images" className="rounded-lg gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                      <ImageTwoTone className="w-4 h-4" aria-hidden="true" />
                      {t("details.images", "Bilder")}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="reviews">
                    <ReviewSection mediaId={String(movie.id)} mediaType="movie" title={movie.title} releaseDate={movie.release_date} />
                  </TabsContent>
                  <TabsContent value="images">
                    <MediaImageGallery mediaId={String(movie.id)} mediaType="movie" mediaTitle={movie.title} />
                  </TabsContent>
                </Tabs>
              </div>

            </div>

            {/* Sidebar */}
            <aside className="space-y-5 min-w-0" aria-label={t("details.facts", "Facts")}>
              {/* Ratings elsewhere (OMDb; empty until OMDB_API_KEY is set) */}
              {hasOmdb && (omdb.imdbRating !== "N/A" || omdb.Metascore !== "N/A" || rtRating) && (
                <DetailSidebarCard title={t("details.externalRatings")} delay={0.15}>
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
                    <p className="mt-3 flex gap-2 border-t border-border/20 pt-3 text-xs text-muted-foreground">
                      <Award className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {omdb.Awards}
                    </p>
                  )}
                </DetailSidebarCard>
              )}

              {/* Keywords */}
              {!!movie.keywords?.keywords?.length && (
                <DetailSidebarCard title={t("details.keywords")} delay={0.2}>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.keywords.keywords.slice(0, 15).map((kw) => (
                      <span key={kw.id} className="rounded-full border border-border/20 bg-secondary/50 px-2.5 py-1 text-xs text-foreground/80">
                        {kw.name}
                      </span>
                    ))}
                  </div>
                </DetailSidebarCard>
              )}

              {/* Studios */}
              {hasStudios && (
                <DetailSidebarCard title={t("details.studios", "Studios")} delay={0.35}>
                  <div className="grid grid-cols-2 gap-2.5">
                    {movie.production_companies!.filter(c => c.logo_path).map(company => (
                      <StudioOverlay key={company.id} id={company.id} name={company.name} logoPath={company.logo_path} />
                    ))}
                  </div>

                </DetailSidebarCard>
              )}

              {/* Alt Titles */}
              {altTitles && altTitles.length > 0 && (
                <div
                  className="rounded-2xl border border-border/20 bg-card/50 backdrop-blur-sm p-5 shadow-[var(--shadow-card)]"
                  style={{ animation: "detail-section-in 0.6s var(--mcc-ease-expressive) 0.4s both" }}
                >
                  <button type="button" onClick={() => setShowAltTitles(!showAltTitles)} aria-expanded={showAltTitles} className="w-full flex items-center justify-between py-2 -my-2 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] hover:text-foreground transition-colors">
                    <span className="flex items-center gap-1.5">
                      <TranslateTwoTone className="w-3.5 h-3.5" />
                      {t("details.alternativeTitles")} ({altTitles.length})
                    </span>
                    <ExpandMoreTwoTone className={`w-4 h-4 transition-transform duration-300 ${showAltTitles ? "rotate-180" : ""}`} />
                  </button>
                  {showAltTitles && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {altTitles.slice(0, 15).map((at, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/40 text-xs">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{at.iso_3166_1}</span>
                          <span className="text-foreground">{at.title}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TMDB Edit Hint */}
              <div
                className="rounded-2xl border border-border/20 bg-card/50 backdrop-blur-sm p-4 flex items-start gap-2.5 text-xs text-muted-foreground"
                style={{ animation: "detail-section-in 0.6s var(--mcc-ease-expressive) 0.45s both" }}
              >
                <EditTwoTone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  {t("details.tmdbEditHint")}{" "}
                  <a href={`https://www.themoviedb.org/movie/${movie.id}/edit`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                    {t("details.tmdbEditLink")}
                  </a>
                </p>
              </div>
            </aside>

            {/* Similar Movies – spans full width on desktop, appears last on mobile */}
            <div className="lg:col-span-2 min-w-0">
              <SimilarMedia items={similarMovies} isLoading={similarLoading} mediaType="movie" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};


export default MovieDetailPage;
