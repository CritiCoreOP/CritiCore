import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchTmdb, getSimilarGames, getSimilarSeries, rawgImageResize, tmdbImage, type RawgGame, type TmdbMovie } from "@/lib/api";
import { tmdbGenreNames } from "@/lib/tmdbGenres";
import { mergeRecommendations, pickSeeds, signalKey, TYPES, type ForYouCard, type ForYouType, type Signal } from "@/lib/forYou";
import MediaCard from "@/components/MediaCard";
import { Skeleton } from "@/components/ui/skeleton";

const PATH: Record<ForYouType, string> = { movie: "filme", series: "serien", game: "games" };
const isType = (t: string): t is ForYouType => (TYPES as string[]).includes(t);

/** Everything the person did with titles, as weighted signals, plus titles they did not like */
async function loadSignals(userId: string): Promise<{ signals: Signal[]; disliked: Set<string> }> {
  const [reviews, follows, saves, watched, watchlist] = await Promise.all([
    supabase.from("reviews").select("media_id, media_type, score, created_at").eq("user_id", userId).is("season_number", null).order("created_at", { ascending: false }).limit(30),
    supabase.from("follows").select("target_id, target_type, created_at").eq("user_id", userId).in("target_type", TYPES).order("created_at", { ascending: false }).limit(20),
    supabase.from("user_saves").select("target_id, target_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("media_status").select("media_id, media_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("user_watchlist").select("media_id, media_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  const signals: Signal[] = [];
  const disliked = new Set<string>();
  const add = (id: string, type: string, weight: number, at: string) => { if (isType(type)) signals.push({ id, type, weight, at }); };
  for (const r of reviews.data ?? []) {
    // Scores go up to 10; a poor review is a reason to suggest nothing like it
    if (r.score < 5 && isType(r.media_type)) disliked.add(signalKey({ type: r.media_type, id: r.media_id }));
    add(r.media_id, r.media_type, r.score >= 8 ? 4 : r.score >= 7 ? 3 : 0, r.created_at);
  }
  for (const f of follows.data ?? []) add(f.target_id, f.target_type, 3, f.created_at);
  for (const s of saves.data ?? []) add(s.target_id, s.target_type, 2, s.created_at);
  for (const w of watched.data ?? []) add(w.media_id, w.media_type, 2, w.created_at);
  for (const w of watchlist.data ?? []) add(w.media_id, w.media_type, 1, w.created_at);
  return { signals: signals.filter((s) => !disliked.has(signalKey(s))), disliked };
}

const fromTmdb = (type: "movie" | "series") => (m: TmdbMovie): ForYouCard => ({
  id: String(m.id),
  type,
  title: m.title || m.name || "",
  poster: tmdbImage(m.poster_path),
  year: (m.release_date || m.first_air_date)?.slice(0, 4),
  primaryGenre: tmdbGenreNames(m.genre_ids, type)[0],
  genres: tmdbGenreNames(m.genre_ids, type),
  score: Math.round(m.vote_average * 10) / 10,
});

const adultGame = (g: RawgGame) => g.esrb_rating?.slug === "adults-only" || !!g.tags?.some((tag) => ["nudity", "sexual-content", "nsfw"].includes(tag.slug));
const fromIgdb = (g: RawgGame): ForYouCard => ({
  id: String(g.id),
  type: "game",
  title: g.name,
  poster: rawgImageResize(g.background_image ?? null, 420),
  year: g.released?.slice(0, 4),
  primaryGenre: g.genres?.[0]?.name,
  genres: g.genres?.map((x) => x.name),
  score: Math.round(g.rating * 2 * 10) / 10,
});

async function recommendationsFor(seed: Signal): Promise<ForYouCard[]> {
  if (seed.type === "movie") {
    const recs = await fetchTmdb<{ results: TmdbMovie[] }>(`/movie/${seed.id}/recommendations`);
    return recs.results.filter((m) => m.poster_path).slice(0, 12).map(fromTmdb("movie"));
  }
  if (seed.type === "series") return (await getSimilarSeries(seed.id)).filter((m) => m.poster_path).map(fromTmdb("series"));
  return (await getSimilarGames(seed.id)).filter((g) => g.background_image && !adultGame(g)).map(fromIgdb);
}

/** "Für dich" row on the home page; shows nothing for people without ratings, follows or saves */
export default function ForYouRow() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const signals = useQuery({
    queryKey: ["for-you-signals", user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: () => loadSignals(user!.id),
  });
  const seeds = signals.data ? pickSeeds(signals.data.signals) : [];

  const cards = useQuery({
    queryKey: ["for-you", user?.id, seeds.map(signalKey).join(",")],
    enabled: seeds.length > 0,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const lists = await Promise.all(seeds.map((s) => recommendationsFor(s).catch(() => [] as ForYouCard[])));
      const known = new Set([...signals.data!.signals.map(signalKey), ...signals.data!.disliked]);
      return mergeRecommendations(lists, known);
    },
  });

  if (!user || !seeds.length || (cards.data && cards.data.length < 4) || cards.isError) return null;

  return (
    <section aria-labelledby="for-you-title">
      <div className="mb-5">
        <h2 id="for-you-title" className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5" aria-hidden="true" /> {t("home.forYou")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.forYouHint")}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-2 scrollbar-none sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-6">
        {!cards.data
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[42%] shrink-0 snap-start sm:w-auto space-y-2">
                <Skeleton className="aspect-[2/3] rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            ))
          : cards.data.slice(0, 6).map((c) => (
              <div key={signalKey(c)} className="w-[42%] shrink-0 snap-start sm:w-auto">
                <MediaCard to={`/${PATH[c.type]}/${c.id}`} type={c.type} title={c.title} poster={c.poster} year={c.year} primaryGenre={c.primaryGenre} genres={c.genres} score={c.score} />
              </div>
            ))}
      </div>
    </section>
  );
}
