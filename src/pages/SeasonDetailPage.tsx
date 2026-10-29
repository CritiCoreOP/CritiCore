import { useEffect, useState } from "react";
import { useParams, Link } from "@/lib/locale-router";
import { useTranslation } from "react-i18next";
import Footer from "@/components/Footer";
import ReviewSection from "@/components/ReviewSection";
import { Skeleton } from "@/components/ui/skeleton";
import { useSeriesDetail, useSeasonDetail } from "@/hooks/useMedia";
import { tmdbImage, tmdbBackdrop } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star } from "lucide-react";
import { ArrowLeft as ArrowBackTwoTone, ChevronDown as KeyboardArrowDownTwoTone, ChevronUp as KeyboardArrowUpTwoTone, Star as StarTwoTone } from "lucide-react";

const SeasonDetailPage = () => {
  const { id, season } = useParams<{ id: string; season: string }>();
  const seasonNum = parseInt(season || "0");
  const { data: show } = useSeriesDetail(id || "");
  const { data: seasonData, isLoading, isError } = useSeasonDetail(id || "", seasonNum);
  const { t } = useTranslation();
  const [expandedEp, setExpandedEp] = useState<number | null>(null);

  useEffect(() => {
    if (show && seasonData) {
      document.title = `${show.name} – ${seasonData.name}`;
    }
  }, [show, seasonData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-14">
          <Skeleton className="h-[35vh] w-full rounded-none" />
          <div className="container mx-auto px-4 -mt-20 relative z-10 space-y-4">
            <Skeleton className="h-48 w-36 rounded-xl" />
            <Skeleton className="h-8 w-64" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isError || !seasonData || !show) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t("errors.notFound", "This season could not be found.")}</p>
        {id && (
          <Link to={`/series/${id}`} className="text-primary underline">
            {t("common.backToSeries", "Back to series")}
          </Link>
        )}
      </div>
    );
  }

  const backdrop = tmdbBackdrop(show.backdrop_path);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-14">
        {/* Backdrop hero */}
        <div className="relative h-[35vh] md:h-[40vh] overflow-hidden">
          {backdrop ? (
            <img
              src={backdrop}
              alt={show.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 bg-hero-gradient" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-28 md:-mt-32 relative z-10 pb-12">
          {/* Back link */}
          <Link
            to={`/serien/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-primary mb-4 transition-colors hover:translate-x-[-2px] duration-200"
            style={{ animation: "card-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <ArrowBackTwoTone className="w-4 h-4" /> {show.name}
          </Link>

          {/* Season header */}
          <div
            className="flex gap-5 md:gap-6 mb-8"
            style={{ animation: "card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both" }}
          >
            {tmdbImage(seasonData.poster_path) && (
              <img
                src={tmdbImage(seasonData.poster_path)!}
                alt={seasonData.name}
                className="w-28 md:w-36 rounded-xl border border-border/40 shadow-lg shrink-0"
              />
            )}
            <div className="flex flex-col justify-end">
              <h1
                className="font-display text-2xl md:text-4xl font-bold text-foreground mb-1.5 opacity-0"
                style={{ animation: "hero-title-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards" }}
              >
                {seasonData.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                {seasonData.air_date && (
                  <span>{seasonData.air_date.slice(0, 4)}</span>
                )}
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span>{seasonData.episodes?.length || seasonData.episode_count} {t("details.episodes", "Episoden")}</span>
              </div>
              {seasonData.overview && (
                <p className="text-foreground/70 text-sm leading-relaxed max-w-2xl line-clamp-3">
                  {seasonData.overview}
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ animation: "card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both" }}>
            <Tabs defaultValue="episodes">
              <TabsList className="mb-6">
                <TabsTrigger value="episodes">{t("details.episodes", "Episoden")}</TabsTrigger>
                <TabsTrigger value="season-review">{t("details.rateSeason", "Staffel bewerten")}</TabsTrigger>
              </TabsList>

              <TabsContent value="episodes">
                <div className="space-y-2">
                  {seasonData.episodes?.map((ep, idx) => (
                    <div
                      key={ep.id}
                      className="rounded-xl border border-border/40 bg-card overflow-hidden transition-colors hover:border-primary/20"
                      style={{ animation: `card-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + idx * 0.04}s both` }}
                    >
                      <button
                        className="w-full flex items-center gap-4 p-3.5 text-left transition-colors"
                        onClick={() => setExpandedEp(expandedEp === ep.episode_number ? null : ep.episode_number)}
                      >
                        {tmdbImage(ep.still_path, "w300") ? (
                          <img
                            src={tmdbImage(ep.still_path, "w300")!}
                            alt={ep.name}
                            className="w-24 md:w-28 h-14 md:h-16 object-cover rounded-lg shrink-0"
                          />
                        ) : (
                          <div className="w-24 md:w-28 h-14 md:h-16 bg-secondary rounded-lg shrink-0 flex items-center justify-center text-muted-foreground text-xs font-medium">
                            E{ep.episode_number}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="text-[10px] shrink-0 border-border/60">
                              E{ep.episode_number}
                            </Badge>
                            <h3 className="font-medium text-sm text-foreground truncate">{ep.name}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {ep.air_date && <span>{ep.air_date}</span>}
                            {ep.runtime && <span>{ep.runtime} Min.</span>}
                            {ep.vote_average > 0 && (
                              <span className="flex items-center gap-0.5 text-primary">
                                <Star className="w-3 h-3 fill-primary" />
                                {ep.vote_average.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-muted-foreground/60">
                          {expandedEp === ep.episode_number
                            ? <KeyboardArrowUpTwoTone className="w-5 h-5" />
                            : <KeyboardArrowDownTwoTone className="w-5 h-5" />
                          }
                        </div>
                      </button>

                      {expandedEp === ep.episode_number && (
                        <div className="px-4 pb-4 border-t border-border/30 pt-4 space-y-4 animate-fade-in">
                          {ep.overview && (
                            <p className="text-sm text-foreground/70 leading-relaxed">{ep.overview}</p>
                          )}
                          <ReviewSection
                            mediaId={String(show.id)}
                            mediaType="series"
                            title={`${show.name} – ${seasonData.name} E${ep.episode_number}`}
                            seasonNumber={seasonNum}
                            episodeNumber={ep.episode_number}
                            releaseDate={ep.air_date}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="season-review">
                <ReviewSection
                  mediaId={String(show.id)}
                  mediaType="series"
                  title={`${show.name} – ${seasonData.name}`}
                  seasonNumber={seasonNum}
                  releaseDate={seasonData.air_date}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SeasonDetailPage;
