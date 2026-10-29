import { useRef, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { motion, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import { ArrowRight, Clapperboard, Flower2, Gamepad2, Heart, Tv } from "lucide-react";
import PressLogoBadge from "@/components/PressLogoBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";
import MagneticLink from "./MagneticLink";
import Reveal from "./Reveal";

// Shared across stickers: the one picked up last lies on top
let topLayer = 10;

interface StickerProps {
  bounds: RefObject<HTMLDivElement>;
  /** The panel is on screen; the sticker itself can start outside it, clipped by the panel */
  shown: boolean;
  left: string;
  top: string;
  rotate: number;
  delay: number;
  className?: string;
  children: ReactNode;
}

/** A piece of the site's UI that can be picked up and thrown around inside the panel */
function Sticker({ bounds, shown, left, top, rotate, delay, className, children }: StickerProps) {
  const reduce = useReducedMotion();
  const zIndex = useMotionValue(1);
  return (
    <motion.div
      data-testid="about-sticker"
      className={cn("absolute cursor-grab touch-none select-none active:cursor-grabbing", className)}
      style={{ left, top, zIndex }}
      drag
      dragConstraints={bounds}
      dragElastic={0.18}
      dragTransition={{ power: 0.35, timeConstant: 220, bounceStiffness: 300, bounceDamping: 18 }}
      onDragStart={() => zIndex.set(++topLayer)}
      initial={reduce ? { rotate } : { opacity: 0, y: -70, rotate: rotate - 25 }}
      animate={shown || reduce ? { opacity: 1, y: 0, rotate } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 15, delay: reduce ? 0 : delay }}
      whileHover={reduce ? undefined : { scale: 1.06 }}
      whileDrag={{ scale: 1.12, rotate: 0 }}
    >
      {children}
    </motion.div>
  );
}

const pill = "flex items-center gap-2 whitespace-nowrap rounded-full border border-border/70 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-[0_14px_30px_-14px_hsl(var(--background))]";
const round = "flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-[0_14px_30px_-14px_hsl(var(--background))]";

export default function JoinSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const panel = useRef<HTMLDivElement>(null);
  const shown = useInView(panel, { once: true, amount: 0.35 });

  return (
    <section aria-labelledby="about-join-title" className="container mx-auto max-w-6xl px-4 pb-24 pt-8 md:pb-32">
      <div
        ref={panel}
        data-testid="about-join"
        className="relative isolate overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/30"
      >
        {/* Desk with the stickers; decoration only, the same facts are in the text on this page */}
        <div aria-hidden="true" className="relative h-52 md:h-60">
          <Sticker bounds={panel} shown={shown} left="6%" top="22%" rotate={-8} delay={0}>
            <ScoreBadge score={9} size="lg" />
          </Sticker>
          <Sticker bounds={panel} shown={shown} left="30%" top="58%" rotate={7} delay={0.08} className="hidden sm:block">
            <PressLogoBadge logoKey="tgn" className="scale-125" />
          </Sticker>
          <Sticker bounds={panel} shown={shown} left="38%" top="10%" rotate={-5} delay={0.16}>
            <span className={round}>
              <Gamepad2 className="h-6 w-6" />
            </span>
          </Sticker>
          <Sticker bounds={panel} shown={shown} left="44%" top="52%" rotate={4} delay={0.24}>
            <span className={cn(pill, "whitespace-nowrap font-mono text-xs tracking-wide")}>DE / EN / FR / ES / TH</span>
          </Sticker>
          <Sticker bounds={panel} shown={shown} left="70%" top="14%" rotate={-7} delay={0.32} className="hidden sm:block">
            <span className={pill}>
              <Heart className="h-4 w-4 fill-current text-primary" />
              {t("aboutPage.values.adFree.title")}
            </span>
          </Sticker>
          <Sticker bounds={panel} shown={shown} left="86%" top="56%" rotate={11} delay={0.4} className="hidden md:block">
            <span className={round}>
              <Clapperboard className="h-6 w-6" />
            </span>
          </Sticker>
          <Sticker bounds={panel} shown={shown} left="80%" top="12%" rotate={9} delay={0.44} className="sm:hidden">
            <span className={round}>
              <Tv className="h-6 w-6" />
            </span>
          </Sticker>
          <Sticker bounds={panel} shown={shown} left="18%" top="62%" rotate={-12} delay={0.48} className="sm:hidden md:block">
            <span className={round}>
              <Flower2 className="h-6 w-6" />
            </span>
          </Sticker>
        </div>

        <Reveal className="relative px-6 pb-12 text-center md:px-12 md:pb-16">
          <h2 id="about-join-title" className="font-display text-5xl font-bold tracking-tight text-foreground md:text-7xl">
            {t("aboutPage.join.title")}
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">{t("aboutPage.join.text")}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? (
              <MagneticLink to="/profil">
                {t("aboutPage.join.profile")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </MagneticLink>
            ) : (
              <MagneticLink to="/auth">
                {t("aboutPage.join.signup")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </MagneticLink>
            )}
            <Link
              to="/spenden"
              className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-border/70 px-6 text-base font-semibold text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              {t("transparencyPage.links.donate")}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
