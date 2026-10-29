import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "@/lib/locale-router";
import Footer from "@/components/Footer";
import ApiErrorPage from "@/components/ApiErrorPage";
import { Skeleton } from "@/components/ui/skeleton";
import TrailerEmbed from "@/components/TrailerEmbed";
import MediaDetailHero from "@/components/MediaDetailHero";
import DetailSection from "@/components/DetailSection";
import DetailSidebarCard from "@/components/DetailSidebarCard";
import AgeRatingMark from "@/components/detail/AgeRatingMark";
import MediaLabels, { type MediaLabel } from "@/components/detail/MediaLabels";
import { FactGrid, Fact } from "@/components/detail/FactGrid";
import { formatRelative } from "@/components/detail/format";
import { BookOpen, CalendarClock, Clapperboard, ExternalLink, PlayCircle as PlayCircleTwoTone, Trophy, Tv, Users as GroupsTwoTone } from "lucide-react";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { useAnimeDetail, useAnimeTitleLang, syncAnilistMedia } from "@/hooks/useAnime";
import { pickTitle, type AnilistMediaDetail } from "@/lib/anilist";
import { sanitizeHtml } from "@/lib/sanitize";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import MediaCard from "@/components/MediaCard";
import { getLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import ReleaseReminderButton from "@/components/ReleaseReminderButton";

/** AniList fuzzy date in the reader's locale: "8. April 2026", "April 2026" or "2026" */
/** "2026-04-03" for a date AniList knows to the day, else null */
const anilistDay = (d?: { year: number | null; month: number | null; day: number | null } | null) =>
  d?.year && d.month && d.day ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : null;

const formatDate = (d?: { year: number | null; month: number | null; day: number | null } | null) => {
  if (!d?.year) return null;
  if (!d.month) return String(d.year);
  const date = new Date(Date.UTC(d.year, d.month - 1, d.day ?? 1));
  return date.toLocaleDateString(getLocale(), {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    ...(d.day ? { day: "numeric" } : {}),
  });
};

type AnilistLink = { id: number; url: string; site: string; type: string | null };

/** Streaming services vs. everything else (official site, socials), each site only once */
const splitLinks = (links: AnilistLink[] | null | undefined) => {
  const seen = new Set<string>();
  const unique = (links ?? []).filter((l) => {
    const key = `${l.type}|${l.site.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    streaming: unique.filter((l) => l.type === "STREAMING"),
    other: unique.filter((l) => l.type !== "STREAMING").slice(0, 8),
  };
};

const titleCase = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ") : "";

// AniList formats are acronyms; titleCase would turn "TV" into "Tv" and "OVA" into "Ova"
const FORMAT_LABELS: Record<string, string> = { TV: "TV", TV_SHORT: "TV Short", OVA: "OVA", ONA: "ONA" };
const formatName = (s?: string | null) => (s && FORMAT_LABELS[s]) || titleCase(s);

const STATUS_TONES: Record<string, MediaLabel["tone"]> = {
  RELEASING: "positive",
  NOT_YET_RELEASED: "accent",
  CANCELLED: "negative",
};

// Story order first: what came before, what comes next, then everything else
const RELATION_ORDER = ["PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE", "SUMMARY", "COMPILATION", "OTHER", "CHARACTER"];

/** The one ranking worth a label: top 100 of all time, else top 10 of its year */
function bestRanking(rankings: AnilistMediaDetail["rankings"]) {
  const list = rankings ?? [];
  const allTimeRated = list.find((r) => r.type === "RATED" && r.allTime);
  if (allTimeRated && allTimeRated.rank <= 100) return { key: "anime.ranking.ratedAllTime", rank: allTimeRated.rank, year: null };
  const allTimePopular = list.find((r) => r.type === "POPULAR" && r.allTime);
  if (allTimePopular && allTimePopular.rank <= 100) return { key: "anime.ranking.popularAllTime", rank: allTimePopular.rank, year: null };
  const yearRated = list.find((r) => r.type === "RATED" && !r.allTime && r.year && !r.season);
  if (yearRated && yearRated.rank <= 10) return { key: "anime.ranking.ratedYear", rank: yearRated.rank, year: yearRated.year };
  return null;
}

const AnimeDetailPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const titleLang = useAnimeTitleLang();
  const numericId = id ? parseInt(id, 10) : null;
  const backNav = useBackNavigation("anime");

  const { data, isLoading, isError } = useAnimeDetail(numericId);
  const media = data?.Media;

  useEffect(() => {
    if (!media) return;
    const title = pickTitle(media.title, titleLang);
    setSeo({
      title: `${title} – Anime | CritiCore`,
      description:
        (media.description ?? "").replace(/<[^>]+>/g, "").slice(0, 160) ||
        t("meta.anime.description", "Anime auf CritiCore"),
      url: `/anime/${media.id}`,
      image: media.coverImage.extraLarge || media.coverImage.large || undefined,
    });
    syncAnilistMedia(media);
    return () => cleanupSeo();
  }, [media, titleLang, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16">
          <div className="container mx-auto max-w-[1440px] px-4 pt-6 md:px-8">
            <Skeleton className="h-[420px] w-full rounded-3xl md:h-[55vh]" />
          </div>
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

  if (isError || !media) return <ApiErrorPage />;

  const title = pickTitle(media.title, titleLang);
  const links = splitLinks(media.externalLinks);
  const score = typeof media.averageScore === "number" ? Math.round(media.averageScore) / 10 : 0;
  const trailerVideoKey =
    media.trailer && media.trailer.site === "youtube" ? media.trailer.id : null;

  const genresForHero = (media.genres ?? []).map((g, i) => ({ id: i, name: g }));
  const backdrop = media.bannerImage || media.coverImage.extraLarge || media.coverImage.large || null;
  const poster = media.coverImage.extraLarge || media.coverImage.large || null;

  const statusText = media.status ? t(`anime.status.${media.status}`, { defaultValue: titleCase(media.status) }) : null;
  const sourceText = media.source ? t(`anime.source.${media.source}`, { defaultValue: "" }) : "";
  const next = media.nextAiringEpisode;
  const ranking = bestRanking(media.rankings);
  const started = formatDate(media.startDate);
  const ended = media.status === "FINISHED" ? formatDate(media.endDate) : null;
  const studios = (media.studios?.nodes ?? []).map((s) => s.name).join(", ");
  const country = media.countryOfOrigin ? new Intl.DisplayNames([getLocale()], { type: "region" }).of(media.countryOfOrigin) : null;

  const candidates: (MediaLabel | null)[] = [
    statusText ? { id: "status", text: statusText, icon: Clapperboard, tone: STATUS_TONES[media.status ?? ""] ?? "default" } : null,
    media.format ? { id: "format", text: formatName(media.format), icon: Tv } : null,
    media.episodes
      ? {
          id: "episodes",
          text: media.duration
            ? t("anime.labels.episodesDuration", { count: media.episodes, duration: media.duration })
            : t("details.episodeCount", { count: media.episodes }),
        }
      : null,
    sourceText ? { id: "source", text: sourceText, icon: BookOpen } : null,
    next ? { id: "next", text: t("anime.labels.nextEpisode", { episode: next.episode, when: formatRelative(new Date(next.airingAt * 1000)) }), icon: CalendarClock, tone: "accent" } : null,
    ranking ? { id: "ranking", text: t(ranking.key, { rank: ranking.rank, year: ranking.year }), icon: Trophy, tone: "accent" } : null,
  ];
  const labels = candidates.filter((l): l is MediaLabel => l !== null);

  const relations = (media.relations?.edges ?? [])
    .filter((e) => e.node.type === "ANIME")
    .sort((a, b) => {
      const ia = RELATION_ORDER.indexOf(a.relationType);
      const ib = RELATION_ORDER.indexOf(b.relationType);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .slice(0, 12);

  // Spoiler and adult tags stay hidden; the rank says how strongly a tag applies
  const tags = (media.tags ?? [])
    .filter((tag) => !tag.isAdult && !tag.isGeneralSpoiler && !tag.isMediaSpoiler && (tag.rank ?? 100) >= 60)
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .slice(0, 12);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-16">
        <MediaDetailHero
          backdrop={backdrop}
          poster={poster}
          title={title}
          tagline={media.title.native && media.title.native !== title ? media.title.native : null}
          score={score}
          genres={genresForHero}
          labels={
            <MediaLabels
              labels={labels}
              leading={media.isAdult ? <AgeRatingMark system="ADULT" rating="18" /> : undefined}
            />
          }
          backPath={backNav.path}
          backLabel={backNav.label}
          reviewHref="#synopsis"
          reviewLabel={t("anime.sections.synopsis", "Handlung")}
          actions={
            <>
              {media.status === "NOT_YET_RELEASED" && (
                <ReleaseReminderButton mediaId={String(media.id)} mediaType="anime" title={title} image={poster} releaseDate={anilistDay(media.startDate)} />
              )}
              <a
                href={`https://anilist.co/anime/${media.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors"
                title="AniList"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                AniList
              </a>
            </>
          }
        />

        <div className="container mx-auto px-4 md:px-8 py-10 max-w-[1440px]">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
            {/* Main column */}
            <div className="space-y-10 min-w-0">
              <DetailSection title={t("anime.sections.synopsis", "Handlung")} delay={0.1} id="synopsis">
                {media.description && (
                  <div
                    className="prose prose-invert max-w-[65ch] text-foreground/85 leading-relaxed text-base"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(media.description) }}
                  />
                )}
                <FactGrid>
                  {media.format && <Fact label={t("anime.facts.format")}>{formatName(media.format)}</Fact>}
                  {statusText && (
                    <Fact label={t("details.statusLabel")}>
                      <span className={cn(media.status === "RELEASING" && "text-score-high", media.status === "CANCELLED" && "text-score-low")}>{statusText}</span>
                    </Fact>
                  )}
                  {media.episodes != null && <Fact label={t("anime.facts.episodes")}>{media.episodes}</Fact>}
                  {media.duration != null && <Fact label={t("anime.facts.duration")}>{t("details.minutes", { count: media.duration })}</Fact>}
                  {media.season && media.seasonYear && (
                    <Fact label={t("anime.facts.season")}>
                      {`${t(`anime.season.${media.season}`, { defaultValue: titleCase(media.season) })} ${media.seasonYear}`}
                    </Fact>
                  )}
                  {started && (
                    <Fact label={t("anime.facts.aired")}>
                      {ended && ended !== started ? t("details.airedRange", { from: started, to: ended }) : started}
                    </Fact>
                  )}
                  {studios && <Fact label={t("anime.facts.studio")}>{studios}</Fact>}
                  {media.source && <Fact label={t("anime.facts.source")}>{t(`anime.sourceName.${media.source}`, { defaultValue: titleCase(media.source) })}</Fact>}
                  {country && <Fact label={t("details.country")}>{country}</Fact>}
                </FactGrid>
              </DetailSection>

              {trailerVideoKey && (
                <DetailSection
                  title={t("details.trailer", "Trailer")}
                  icon={<PlayCircleTwoTone className="w-5 h-5 text-primary" />}
                  delay={0.15}
                >
                  <TrailerEmbed
                    videoKey={trailerVideoKey}
                    title={title}
                    thumbnail={media.trailer?.thumbnail ?? media.bannerImage ?? undefined}
                  />
                </DetailSection>
              )}

              {relations.length > 0 && (
                <DetailSection title={t("anime.sections.relations")} delay={0.18}>
                  <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 scrollbar-none md:mx-0 md:scroll-px-0 md:px-0">
                    {relations.map(({ relationType, node }) => (
                      <li key={node.id} className="w-[132px] shrink-0 snap-start sm:w-[150px]">
                        <Link
                          to={`/anime/${node.id}`}
                          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border/30 bg-muted">
                            {node.coverImage.medium && (
                              <img
                                src={node.coverImage.medium}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none"
                              />
                            )}
                          </div>
                          <p className="mt-2 text-xs font-semibold text-accent-light">
                            {t(`anime.relation.${relationType}`, { defaultValue: titleCase(relationType) })}
                          </p>
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                            {pickTitle(node.title, titleLang)}
                          </p>
                          {node.format && <p className="text-xs text-muted-foreground">{formatName(node.format)}</p>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}

              {media.characters?.edges && media.characters.edges.length > 0 && (
                <DetailSection
                  title={t("anime.sections.characters", "Charaktere")}
                  icon={<GroupsTwoTone className="w-5 h-5 text-primary" />}
                  delay={0.2}
                >
                  <div className="flex gap-3 items-stretch overflow-x-auto pb-3 scrollbar-thin">
                    {media.characters.edges.slice(0, 16).map((c) => {
                      const voice = c.voiceActors?.[0]?.name.full;
                      return (
                        <div
                          key={c.node.id}
                          className="shrink-0 w-[140px] rounded-2xl border border-border/20 bg-card/60 overflow-hidden shadow-[var(--shadow-card)]"
                        >
                          {c.node.image.medium && (
                            <img
                              src={c.node.image.medium}
                              alt={c.node.name.userPreferred ?? ""}
                              className="w-full aspect-[2/3] object-cover"
                              loading="lazy"
                            />
                          )}
                          <div className="p-2.5 min-h-[4.5rem]">
                            <p className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug">
                              {c.node.name.userPreferred ?? c.node.name.full}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t(`anime.role.${c.role}`, { defaultValue: titleCase(c.role) })}
                            </p>
                            {voice && (
                              <p className="mt-1 text-xs text-foreground/70 line-clamp-2" title={t("anime.voiceActor", { name: voice })}>
                                {t("anime.voiceActor", { name: voice })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </DetailSection>
              )}

              {media.recommendations?.nodes && media.recommendations.nodes.some((n) => n.mediaRecommendation) && (
                <DetailSection
                  title={t("anime.sections.recommended", "Ähnliche Anime")}
                  delay={0.25}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {media.recommendations.nodes
                      .map((n) => n.mediaRecommendation)
                      .filter((m): m is NonNullable<typeof m> => !!m)
                      .slice(0, 10)
                      .map((rec) => (
                        <MediaCard
                          key={rec.id}
                          to={`/anime/${rec.id}`}
                          type="anime"
                          showType={false}
                          title={pickTitle(rec.title, titleLang)}
                          poster={rec.coverImage.large}
                          score={typeof rec.averageScore === "number" ? Math.round(rec.averageScore) / 10 : null}
                        />
                      ))}
                  </div>
                </DetailSection>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5 min-w-0" aria-label={t("details.facts", "Facts")}>
              {links.streaming.length > 0 && (
                <DetailSidebarCard title={t("anime.sections.links", "Wo streamen")} delay={0.15}>
                  <ul className="flex flex-wrap gap-2">
                    {links.streaming.map((l) => (
                      <li key={l.id}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-card/50 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-card"
                        >
                          {l.site}
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </DetailSidebarCard>
              )}

              {((media.genres?.length ?? 0) > 0 || tags.length > 0) && (
                <DetailSidebarCard title={t("anime.sections.tags")} delay={0.2}>
                  <div className="flex flex-wrap gap-1.5">
                    {(media.genres ?? []).map((g) => (
                      <span key={g} className="rounded-full border border-accent-light/40 px-2.5 py-1 text-xs font-semibold text-accent-light">
                        {g}
                      </span>
                    ))}
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        title={tag.rank != null ? t("anime.tagRank", { rank: tag.rank }) : undefined}
                        className="rounded-full border border-border/20 bg-secondary/50 px-2.5 py-1 text-xs text-foreground/80"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </DetailSidebarCard>
              )}

              {links.other.length > 0 && (
                <DetailSidebarCard title={t("anime.sections.otherLinks", "Links")} delay={0.25}>
                  <ul className="space-y-0.5">
                    {links.other.map((l) => (
                      <li key={l.id}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 py-1 text-sm text-accent-light hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          {l.site}
                        </a>
                      </li>
                    ))}
                  </ul>
                </DetailSidebarCard>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AnimeDetailPage;
