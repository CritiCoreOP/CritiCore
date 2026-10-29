import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowRight, Clapperboard, Flower2, Gamepad2, MoveHorizontal, Tv } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";
import { WORLDS, type PoolItem, type World } from "./useMediaPool";
import Reveal from "./Reveal";

const META: Record<World, { icon: typeof Gamepad2; nav: string; to: string; source: string }> = {
  games: { icon: Gamepad2, nav: "nav.games", to: "/games", source: "IGDB" },
  movies: { icon: Clapperboard, nav: "nav.movies", to: "/filme", source: "TMDB" },
  series: { icon: Tv, nav: "nav.series", to: "/serien", source: "TMDB" },
  anime: { icon: Flower2, nav: "nav.anime", to: "/anime", source: "AniList" },
};

// Resting pose per depth: fanned out to the upper right, so every card behind shows an edge
const POSE = [
  { x: 0, y: 0, scale: 1, rotate: 0 },
  { x: 26, y: -16, scale: 0.97, rotate: 3.5 },
  { x: 48, y: -30, scale: 0.94, rotate: 7 },
  { x: 68, y: -42, scale: 0.91, rotate: 10.5 },
];

interface WorldsDeckProps {
  byWorld: Record<World, PoolItem[]>;
  loading: boolean;
}

/**
 * Games, films, series, anime as a pile of cards. Swipe the top card away (or pick a world in the
 * list) and the next one comes up; each card shows a title that is trending there right now.
 */
export default function WorldsDeck({ byWorld, loading }: WorldsDeckProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [order, setOrder] = useState<World[]>(WORLDS);
  const dragged = useRef(false);

  const bringToFront = (world: World) => setOrder((o) => [world, ...o.filter((w) => w !== world)]);
  const sendBack = () => setOrder((o) => [...o.slice(1), o[0]]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 600) sendBack();
    // The click that ends a drag must not open the link on the card
    window.setTimeout(() => {
      dragged.current = false;
    }, 0);
  };

  return (
    <section aria-labelledby="about-worlds-title" className="container mx-auto max-w-6xl px-4 py-24 md:py-32">
      <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="relative order-2 mx-auto w-full max-w-md lg:order-1 lg:col-span-6 lg:max-w-none">
          <div className="relative mr-[4.5rem] mt-12 aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] xl:aspect-[5/4]" data-testid="worlds-deck">
            {WORLDS.map((world) => {
              const depth = order.indexOf(world);
              const item = byWorld[world].find((i) => i.backdrop) ?? byWorld[world][0];
              const { icon: Icon, nav, to, source } = META[world];
              const isTop = depth === 0;
              return (
                <motion.article
                  key={world}
                  data-world={world}
                  data-depth={depth}
                  aria-hidden={!isTop}
                  className={cn(
                    "absolute inset-0 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_30px_60px_-30px_hsl(var(--background))]",
                    isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
                  )}
                  style={{ zIndex: WORLDS.length - depth, touchAction: isTop ? "pan-y" : undefined }}
                  initial={false}
                  animate={POSE[depth]}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
                  drag={isTop ? "x" : false}
                  dragSnapToOrigin
                  dragElastic={0.6}
                  whileDrag={{ rotate: 0, scale: 1.02 }}
                  onDragStart={() => {
                    dragged.current = true;
                  }}
                  onDragEnd={onDragEnd}
                >
                  {item ? (
                    <img
                      src={item.backdrop ?? item.poster}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className={cn("absolute inset-0 bg-muted", loading && "animate-pulse")} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-media-scrim via-media-scrim/50 to-transparent" />
                  {/* Cards further back sit in shadow */}
                  <div
                    className="absolute inset-0 bg-background transition-opacity duration-500"
                    style={{ opacity: depth === 0 ? 0 : 0.25 + depth * 0.12 }}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 text-media-scrim-foreground md:p-8">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/30 backdrop-blur-sm">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-4xl font-bold leading-none md:text-5xl">{t(nav)}</h3>
                    {item && (
                      <p className="max-w-[40ch] text-sm text-media-scrim-foreground/85">
                        {t("aboutPage.worlds.trending", { title: item.title })}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3">
                      <Link
                        to={to}
                        tabIndex={isTop ? 0 : -1}
                        draggable={false}
                        onClickCapture={(e) => {
                          if (dragged.current) e.preventDefault();
                        }}
                        className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-media-scrim-foreground px-4 text-sm font-semibold text-media-scrim transition-transform active:scale-[0.97]"
                      >
                        {t("aboutPage.worlds.open", { world: t(nav) })}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <span className="text-xs text-media-scrim-foreground/75">{t("aboutPage.worlds.source", { source })}</span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
          <p className="mt-8 flex items-center justify-center gap-1.5 text-sm text-muted-foreground lg:justify-start">
            <MoveHorizontal className="h-4 w-4" aria-hidden="true" />
            {t("aboutPage.worlds.hint")}
          </p>
        </div>

        <Reveal className="order-1 lg:order-2 lg:col-span-6">
          <h2 id="about-worlds-title" className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {t("aboutPage.worlds.title")}
          </h2>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">{t("aboutPage.worlds.text")}</p>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2" role="group" aria-label={t("aboutPage.worlds.pick")}>
            {WORLDS.map((world) => {
              const { icon: Icon, nav } = META[world];
              const active = order[0] === world;
              return (
                <button
                  key={world}
                  type="button"
                  aria-pressed={active}
                  onClick={() => bringToFront(world)}
                  className={cn(
                    "flex h-12 items-center gap-2.5 rounded-full border px-4 text-sm font-semibold transition-colors active:scale-[0.98]",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t(nav)}
                </button>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
