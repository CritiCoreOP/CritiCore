import { useEffect, useState, useMemo } from "react";
import { useAutoTags } from "@/hooks/useAutoTags";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { rawgImageResize } from "@/lib/api";
import ApiErrorPage from "@/components/ApiErrorPage";
import Footer from "@/components/Footer";
import SourceLink from "@/components/SourceLink";
import ReviewSection from "@/components/ReviewSection";
import SimilarMedia from "@/components/SimilarMedia";
import TrailerEmbed from "@/components/TrailerEmbed";
import SaveButton from "@/components/SaveButton";
import ReleaseReminderButton from "@/components/ReleaseReminderButton";
import AddToListDialog from "@/components/AddToListDialog";
import ReportDialog from "@/components/ReportDialog";
import ShareButton from "@/components/ShareButton";
import MediaStatusButton from "@/components/MediaStatusButton";
import FollowButton from "@/components/FollowButton";
import MediaDetailHero from "@/components/MediaDetailHero";
import DetailSection from "@/components/DetailSection";
import DetailSidebarCard from "@/components/DetailSidebarCard";
import GameCompanyTile from "@/components/GameCompanyTile";
import AgeRatingMark from "@/components/detail/AgeRatingMark";
import MediaLabels, { type MediaLabel } from "@/components/detail/MediaLabels";
import { FactGrid, Fact } from "@/components/detail/FactGrid";
import { formatHours, isFuture, pickGameRating } from "@/components/detail/format";
import { useParams, useNavigate } from "@/lib/locale-router";
import { useTriggerEnrichment } from "@/hooks/useMediaEnrichment";
import { useGameDetail, useGameTimeToBeat, useSimilarGames } from "@/hooks/useMedia";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, CalendarDays, CalendarIcon, AlertTriangle as WarningAmberTwoTone, Clock, FlaskConical, Languages, Layers, PlayCircle, Star, ExternalLink, Gamepad2, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NSFW_SLUGS = ["adults-only"];
const NSFW_TAG_SLUGS = ["nudity", "sexual-content", "nsfw"];
const WARNING_SLUGS = ["mature", "adults-only"];

const TRIGGER_WARNINGS: Record<string, string[]> = {
  "46956": ["triggerWarning.suicide", "triggerWarning.selfHarm", "triggerWarning.blood", "triggerWarning.vomit"],
};

const ESRB_INFO: Record<string, { color: string; minAge: string; requiredAge: number }> = {
  "everyone": { color: "bg-green-600", minAge: "E", requiredAge: 0 },
  "everyone-10-plus": { color: "bg-green-500", minAge: "E10+", requiredAge: 10 },
  "teen": { color: "bg-yellow-500", minAge: "T", requiredAge: 13 },
  "mature": { color: "bg-orange-600", minAge: "M (17+)", requiredAge: 17 },
  "adults-only": { color: "bg-red-600", minAge: "AO (18+)", requiredAge: 18 },
  "rating-pending": { color: "bg-muted", minAge: "RP", requiredAge: 0 },
};

const AGE_COOKIE_KEY = "criticore_dob_verified";

// IGDB sends English names; unknown values are shown as they come
const MODE_KEYS: Record<string, string> = {
  "Single player": "single",
  Multiplayer: "multi",
  "Co-operative": "coop",
  "Split screen": "split",
  "Massively Multiplayer Online (MMO)": "mmo",
  "Battle Royale": "battleRoyale",
};
const PERSPECTIVE_KEYS: Record<string, string> = {
  "First person": "first",
  "Third person": "third",
  "Bird view / Isometric": "isometric",
  "Side view": "side",
  Text: "text",
  Auditory: "audio",
  "Virtual Reality": "vr",
};
const RELEASE_STATUS_KEYS: Record<string, string> = {
  Alpha: "alpha",
  Beta: "beta",
  "Early access": "earlyAccess",
  Offline: "offline",
  Cancelled: "cancelled",
  Rumored: "rumored",
  Delisted: "delisted",
};
const LANGUAGE_TYPE_KEYS: Record<string, string> = { Audio: "audio", Subtitles: "subtitles", Interface: "interface" };

function getAgeFromDob(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, hours: number) {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

const GameDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  useTriggerEnrichment("game", id);
  const { data: game, isLoading, isError } = useGameDetail(id || "");
  const { data: timeToBeat } = useGameTimeToBeat(id || "");
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const backNav = useBackNavigation("games");
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [selectedDob, setSelectedDob] = useState<Date | undefined>(undefined);
  const [dobError, setDobError] = useState(false);
  const { data: similarGames, isLoading: similarLoading } = useSimilarGames(id || "");

  const gameGenreTags = useMemo(() => {
    if (!game) return undefined;
    const items: { name: string; slug: string }[] = [];
    game.genres?.forEach((g: any) => items.push({ name: g.name, slug: g.slug }));
    game.tags?.forEach((t: any) => items.push({ name: t.name, slug: t.slug }));
    return items.length > 0 ? items : undefined;
  }, [game]);
  useAutoTags(id, "game", gameGenreTags);

  const esrbSlug = game?.esrb_rating?.slug || "";
  const hasNsfwTags = game?.tags?.some(tag => NSFW_TAG_SLUGS.includes(tag.slug)) || false;
  const isNsfw = NSFW_SLUGS.includes(esrbSlug) || hasNsfwTags;
  const triggerWarnings = id ? TRIGGER_WARNINGS[id] || [] : [];
  const needsWarning = WARNING_SLUGS.includes(esrbSlug) || hasNsfwTags || triggerWarnings.length > 0;
  const esrbInfo = ESRB_INFO[esrbSlug];
  const requiredAge = hasNsfwTags ? 18 : (esrbInfo?.requiredAge || 18);

  const cookieVerified = useMemo(() => {
    const saved = getCookie(AGE_COOKIE_KEY);
    if (!saved) return false;
    const dob = new Date(saved);
    if (isNaN(dob.getTime())) return false;
    return getAgeFromDob(dob) >= requiredAge;
  }, [requiredAge]);

  const showWarning = needsWarning && !warningDismissed && !cookieVerified;

  const handleConfirm = () => {
    if (!selectedDob) { setDobError(true); return; }
    const age = getAgeFromDob(selectedDob);
    if (age < requiredAge) { setDobError(true); return; }
    setCookie(AGE_COOKIE_KEY, selectedDob.toISOString(), 24);
    setDobError(false);
    setWarningDismissed(true);
  };

  useEffect(() => {
    if (game) {
      const image = game.background_image || undefined;
      const desc = game.description_raw
        ? game.description_raw.slice(0, 160)
        : t("meta.gameDetail.description", { title: game.name });
      setSeo({
        title: t("meta.gameDetail.title", { title: game.name }),
        description: desc,
        url: `/games/${id}`,
        image,
        type: "website",
        jsonLd: {
          "@type": "VideoGame",
          name: game.name,
          description: game.description_raw?.slice(0, 300),
          image,
          datePublished: game.released,
          genre: game.genres?.map((g: any) => g.name),
          gamePlatform: game.platforms?.map((p: any) => p.platform?.name),
          aggregateRating: game.rating ? {
            "@type": "AggregateRating",
            ratingValue: game.rating,
            bestRating: 5,
          } : undefined,
        },
      });
    }
    return () => cleanupSeo();
  }, [game, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16">
          <Skeleton className="w-full h-[65vh]" />
          <div className="container mx-auto px-4 py-10 max-w-[1440px]">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
              <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!game || isError) return <ApiErrorPage />;

  const score = Math.round(game.rating * 2 * 10) / 10;
  const bgImage = game.background_image ? rawgImageResize(game.background_image, 1280) : undefined;
  // Hero backdrop prefers a wide screenshot; the cover stays the poster.
  const backdropImage = game.short_screenshots?.[0]?.image || bgImage;
  const trailerKey = game.clip?.clip?.match(/[?&]v=([\w-]{6,})/)?.[1];
  const website = game.website || undefined;

  const rating = pickGameRating(game.age_ratings, i18n.language.split("-")[0]);
  const upcoming = isFuture(game.released);
  const releaseDate = game.released ? formatDate(game.released, { day: "numeric", month: "long", year: "numeric" }) : null;
  const modes = (game.game_modes ?? []).map((m) => (MODE_KEYS[m] ? t(`details.gameMode.${MODE_KEYS[m]}`) : m));
  const perspectives = (game.perspectives ?? []).map((p) => (PERSPECTIVE_KEYS[p] ? t(`details.perspective.${PERSPECTIVE_KEYS[p]}`) : p));
  const releaseStatus = game.release_status && RELEASE_STATUS_KEYS[game.release_status] ? t(`details.releaseStatus.${RELEASE_STATUS_KEYS[game.release_status]}`) : game.release_status;
  // Support for the reader's own language ("de" page → German audio, subtitles, texts)
  const readerLang = i18n.language.split("-")[0];
  const langTypes = [...new Set((game.languages ?? []).filter((l) => l.locale.split("-")[0] === readerLang).map((l) => l.type))];
  const langSupport = langTypes.map((type) => (LANGUAGE_TYPE_KEYS[type] ? t(`details.languageSupport.${LANGUAGE_TYPE_KEYS[type]}`) : type)).join(", ");
  const languageName = new Intl.DisplayNames([i18n.language], { type: "language" }).of(readerLang);
  const storyTime = formatHours(timeToBeat?.normally ?? timeToBeat?.hastily, t);
  const completeTime = formatHours(timeToBeat?.completely, t);

  // Platforms that came out on the same day share one line: "PC, PS4, XONE: 19. Mai 2015"
  const releaseGroups = (game.platform_releases ?? []).reduce<{ date: string; platforms: string[] }[]>((groups, r) => {
    const last = groups[groups.length - 1];
    if (last && last.date === r.date) last.platforms.push(r.platform);
    else groups.push({ date: r.date, platforms: [r.platform] });
    return groups;
  }, []);

  const hasCoop = (game.game_modes ?? []).some((m) => m === "Co-operative" || m === "Split screen");
  const hasMulti = (game.game_modes ?? []).some((m) => m === "Multiplayer" || m === "Massively Multiplayer Online (MMO)" || m === "Battle Royale");
  const candidates: (MediaLabel | null)[] = [
    upcoming && releaseDate
      ? { id: "upcoming", text: t("details.labels.upcoming", { date: releaseDate }), icon: CalendarClock, tone: "accent" }
      : game.released ? { id: "year", text: game.released.slice(0, 4), icon: CalendarDays } : null,
    releaseStatus ? { id: "release-status", text: releaseStatus, icon: FlaskConical, tone: game.release_status === "Cancelled" ? "negative" : "accent" } : null,
    (game.game_modes ?? []).includes("Single player") ? { id: "single", text: t("details.gameMode.single"), icon: User } : null,
    hasMulti ? { id: "multi", text: t("details.gameMode.multi"), icon: Users } : null,
    hasCoop ? { id: "coop", text: t("details.gameMode.coop"), icon: Users, tone: "positive" } : null,
    // Almost every game has English; the label only helps readers of other languages
    readerLang === "en" ? null : langTypes.includes("Audio")
      ? { id: "lang", text: t("details.labels.langAudio", { language: languageName }), icon: Languages, tone: "positive" }
      : langTypes.length ? { id: "lang", text: t("details.labels.langText", { language: languageName }), icon: Languages } : null,
    storyTime ? { id: "time", text: t("details.labels.playTime", { time: storyTime }), icon: Clock } : null,
    game.series ? { id: "series", text: game.series, icon: Layers, title: t("details.labels.collectionHint") } : null,
  ];
  const labels = candidates.filter((l): l is MediaLabel => l !== null);
  const ageMark = rating
    ? <AgeRatingMark system={rating.system} rating={rating.rating} />
    : isNsfw ? <AgeRatingMark system="ADULT" rating="18" /> : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* ESRB Warning Dialog */}
      <AlertDialog open={showWarning}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WarningAmberTwoTone className="w-5 h-5 text-orange-500" />
              {t("esrb.warningTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {esrbInfo && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className={`${esrbInfo.color} text-white font-bold text-lg px-3 py-2 rounded-lg min-w-[56px] text-center`}>
                      {esrbInfo.minAge}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{game.esrb_rating?.name}</p>
                      <p className="text-sm text-muted-foreground">ESRB Rating</p>
                    </div>
                  </div>
                )}
                {esrbSlug && (
                  <p className="text-sm text-muted-foreground">
                    {t(`esrb.desc_${esrbSlug.replace("-", "_")}`, { title: game.name })}
                  </p>
                )}
                {isNsfw && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <Badge variant="destructive" className="text-xs font-bold">{t("nsfw.badge")}</Badge>
                    <span className="text-xs text-destructive">{t("esrb.nsfwNote")}</span>
                  </div>
                )}
                {triggerWarnings.length > 0 && (
                  <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2 space-y-1.5">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <WarningAmberTwoTone className="w-4 h-4 text-orange-500" />
                      {t("triggerWarning.title")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {triggerWarnings.map((key) => (
                        <Badge key={key} variant="outline" className="text-xs border-orange-500/40 text-orange-600 dark:text-orange-400">
                          {t(key)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium text-foreground">{t("esrb.dobLabel")}</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDob && "text-muted-foreground",
                          dobError && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDob ? format(selectedDob, "dd.MM.yyyy") : t("esrb.dobPlaceholder")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDob}
                        onSelect={(date) => { setSelectedDob(date); setDobError(false); }}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        defaultMonth={new Date(2000, 0)}
                        captionLayout="dropdown-buttons"
                        fromYear={1920}
                        toYear={new Date().getFullYear()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {dobError && (
                    <p className="text-xs text-destructive">
                      {selectedDob ? t("esrb.dobTooYoung", { age: requiredAge }) : t("esrb.dobRequired")}
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate("/games")}>
              {t("esrb.cancel")}
            </AlertDialogCancel>
            <Button onClick={handleConfirm}>
              {t("esrb.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="pt-16">
        <MediaDetailHero
          backdrop={backdropImage}
          poster={bgImage}
          title={game.name}
          score={score}
          genres={game.genres || []}
          labels={<MediaLabels labels={labels} leading={ageMark} />}
          backPath={backNav.path}
          backLabel={backNav.label}
          // Only pass badges when there are some; an empty fragment rendered an empty pill next to the score
          badges={
            isNsfw || game.metacritic ? (
              <>
                {isNsfw && (
                  <Badge variant="destructive" className="text-xs font-bold rounded-full">
                    {t("nsfw.badge")}
                  </Badge>
                )}
                {game.metacritic && (
                  <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-primary/15 text-primary border border-primary/15 backdrop-blur-sm">
                    Metacritic: {game.metacritic}
                  </span>
                )}
              </>
            ) : undefined
          }
          actions={
            <>
              <FollowButton targetId={String(game.id)} targetType="game" targetName={game.name} targetImage={bgImage} showCount />
              <MediaStatusButton mediaId={String(game.id)} mediaType="game" mediaTitle={game.name} mediaPoster={bgImage} />
              <SaveButton targetId={String(game.id)} targetType="game" />
              <ReleaseReminderButton mediaId={String(game.id)} mediaType="game" title={game.name} image={bgImage} releaseDate={game.released} />
              <AddToListDialog mediaId={String(game.id)} mediaType="game" mediaTitle={game.name} mediaPoster={bgImage} />
              <ShareButton title={game.name} mediaId={game.id} mediaType="g" />
              <ReportDialog targetId={String(game.id)} targetType="game" targetTitle={game.name} />
              <SourceLink href={`https://www.igdb.com/games/${game.slug || game.id}`} label="IGDB" className="hidden sm:inline-flex" />
            </>
          }
        />

        {/* Content grid */}
        <div className="container mx-auto px-4 md:px-8 py-10 max-w-[1440px]">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
            {/* Main column */}
            <div className="space-y-10 min-w-0">
              {/* Description and the facts that decide whether it is for you */}
              <DetailSection title={t("details.description")} delay={0.1}>
                {game.description_raw && (
                  <p className="text-foreground/85 leading-relaxed text-base max-w-[65ch] whitespace-pre-line">
                    {game.description_raw}
                  </p>
                )}
                <FactGrid>
                  {game.developers?.length > 0 && <Fact label={t("details.developer")}>{game.developers.map((d) => d.name).join(", ")}</Fact>}
                  {game.publishers?.length > 0 && <Fact label={t("details.publisher")}>{game.publishers.map((p) => p.name).join(", ")}</Fact>}
                  {releaseDate && <Fact label={t("details.releaseDate")}>{releaseDate}</Fact>}
                  {game.platforms && game.platforms.length > 0 && (
                    <Fact label={t("details.platforms")}>{game.platforms.map((p) => p.platform.name).join(", ")}</Fact>
                  )}
                  {modes.length > 0 && <Fact label={t("details.gameModes")}>{modes.join(", ")}</Fact>}
                  {perspectives.length > 0 && <Fact label={t("details.perspectiveLabel")}>{perspectives.join(", ")}</Fact>}
                  {langSupport && <Fact label={languageName ?? readerLang}>{langSupport}</Fact>}
                  {(storyTime || completeTime) && (
                    <Fact label={t("details.playtime")}>
                      {[storyTime && t("details.playTimeStory", { time: storyTime }), completeTime && t("details.playTimeComplete", { time: completeTime })].filter(Boolean).join(", ")}
                    </Fact>
                  )}
                  {game.series && <Fact label={t("details.series")}>{game.series}</Fact>}
                  {game.engines && game.engines.length > 0 && <Fact label={t("details.engine")}>{game.engines.join(", ")}</Fact>}
                </FactGrid>
              </DetailSection>

              {/* Trailer */}
              {trailerKey && (
                <DetailSection
                  title={t("details.trailer")}
                  icon={<PlayCircle className="w-5 h-5 text-primary" />}
                  delay={0.15}
                >
                  <TrailerEmbed videoKey={trailerKey} title={game.name} thumbnail={backdropImage} />
                </DetailSection>
              )}

              {/* Reviews / Screenshots / Images – Tabs */}
              <div id="reviews" className="scroll-mt-24" style={{ animation: "detail-section-in 0.6s var(--mcc-ease-expressive) 0.2s both" }}>
                <Tabs defaultValue="reviews" className="w-full">
                  <TabsList className="bg-card/60 border border-border/25 mb-5 rounded-xl p-1 h-auto flex-wrap">
                    <TabsTrigger value="reviews" className="rounded-lg gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                      <Star className="w-4 h-4" aria-hidden="true" />
                      {t("details.reviews", "Reviews")}
                    </TabsTrigger>
                    {game.short_screenshots && game.short_screenshots.length > 0 && (
                      <TabsTrigger value="screenshots" className="rounded-lg gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                        <Gamepad2 className="w-4 h-4" aria-hidden="true" />
                        {t("details.screenshots")}
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="reviews">
                    <ReviewSection mediaId={String(game.id)} mediaType="game" title={game.name} releaseDate={game.released} />
                  </TabsContent>
                  {game.short_screenshots && game.short_screenshots.length > 0 && (
                    <TabsContent value="screenshots">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {game.short_screenshots.slice(0, 9).map(sc => (
                          <a
                            key={sc.id}
                            href={sc.image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-2xl overflow-hidden border border-border/20 transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)] group"
                          >
                            <img
                              src={sc.image}
                              alt={`${game.name} Screenshot`}
                              loading="lazy"
                              className="w-full h-full object-cover aspect-video transition-transform duration-500 group-hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>

            </div>

            {/* Sidebar */}
            <aside className="space-y-5 min-w-0" aria-label={t("details.facts", "Facts")}>
              {/* Developer / Publisher logos */}
              {(game.developers?.length > 0 || game.publishers?.length > 0) && (
                <DetailSidebarCard title={t("details.studios", "Studios")} delay={0.15}>
                  <div className="space-y-4">
                    {game.developers?.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">{t("details.developer", "Entwickler")}</span>
                        <div className="grid grid-cols-2 gap-2.5 mt-2">
                          {game.developers.map(d => (
                            <GameCompanyTile key={`dev-${d.id}`} name={d.name} logo={d.logo} />
                          ))}
                        </div>
                      </div>
                    )}
                    {game.publishers?.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">{t("details.publisher", "Publisher")}</span>
                        <div className="grid grid-cols-2 gap-2.5 mt-2">
                          {game.publishers.map(p => (
                            <GameCompanyTile key={`pub-${p.id}`} name={p.name} logo={p.logo} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DetailSidebarCard>
              )}

              {/* External ratings */}
              {(game.metacritic || game.rating > 0) && (
                <DetailSidebarCard title={t("details.externalRatings", "Externe Bewertungen")} delay={0.18}>
                  <dl className="space-y-3">
                    {game.rating > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-sm text-muted-foreground">
                          IGDB
                          {!!game.rating_count && (
                            <span className="block text-xs">{t("details.ratingCount", { count: game.rating_count, formatted: game.rating_count.toLocaleString(i18n.language) })}</span>
                          )}
                        </dt>
                        <dd className="font-bold text-foreground tabular-nums">
                          {score}<span className="text-xs text-muted-foreground font-normal">/10</span>
                        </dd>
                      </div>
                    )}
                    {game.metacritic && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-muted-foreground">{t("details.criticScore")}</dt>
                        <dd className="font-bold text-foreground tabular-nums">
                          {game.metacritic}<span className="text-xs text-muted-foreground font-normal">/100</span>
                        </dd>
                      </div>
                    )}
                  </dl>
                </DetailSidebarCard>
              )}

              {/* Release dates per platform */}
              {releaseGroups.length > 0 && (
                <DetailSidebarCard title={t("details.releaseDates")} delay={0.2}>
                  <dl className="space-y-3">
                    {releaseGroups.slice(0, 6).map((g) => (
                      <div key={g.date}>
                        <dt className="text-sm font-medium text-foreground">{g.platforms.join(", ")}</dt>
                        <dd className="text-xs text-muted-foreground">{formatDate(g.date, { day: "numeric", month: "long", year: "numeric" })}</dd>
                      </div>
                    ))}
                  </dl>
                </DetailSidebarCard>
              )}

              {/* Links */}
              {(website || game.slug) && (
                <DetailSidebarCard title={t("details.links", "Links")} delay={0.35}>
                  <div className="flex flex-col gap-2">
                    {website && (
                      <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-semibold">
                        <ExternalLink className="w-4 h-4" />
                        {t("details.officialSite", "Offizielle Website")}
                      </a>
                    )}
                    <a href={`https://www.igdb.com/games/${game.slug || game.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="w-4 h-4" />
                      IGDB
                    </a>
                  </div>
                </DetailSidebarCard>
              )}
            </aside>

            {/* Similar Games – spans full width on desktop, last on mobile */}
            <div className="lg:col-span-2 min-w-0">
              <SimilarMedia items={similarGames} isLoading={similarLoading} mediaType="game" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};


export default GameDetailPage;
