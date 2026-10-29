import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { motion, useAnimationControls, useInView, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Ban, Check, EyeOff, Languages, Sparkles, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";
import Reveal from "./Reveal";

/** Cell with a light that follows the pointer; position goes into CSS variables, not React state */
function Cell({ className, children, testId }: { className?: string; children: ReactNode; testId?: string }) {
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - box.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - box.top}px`);
  };
  return (
    <div
      data-testid={testId}
      onPointerMove={onMove}
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 md:p-8",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 [background:radial-gradient(28rem_circle_at_var(--x,50%)_var(--y,50%),hsl(var(--primary)/0.13),transparent_45%)] group-hover:opacity-100"
      />
      {children}
    </div>
  );
}

function CellTitle({ icon: Icon, children }: { icon: typeof Ban; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 font-display text-xl font-bold text-foreground md:text-2xl">
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      {children}
    </h3>
  );
}

/** A switch for ads that turns itself off again: there are none to show */
function AdFreeCell() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  const [tried, setTried] = useState(false);
  const shake = useAnimationControls();
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flip = (next: boolean) => {
    if (!next) return;
    setOn(true);
    setTried(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOn(false);
      if (!reduce) void shake.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } });
    }, 650);
  };

  return (
    <Cell className="md:col-span-4" testId="about-adfree">
      <div className="flex h-full flex-col gap-6">
        <div className="max-w-[46ch]">
          <CellTitle icon={Ban}>{t("aboutPage.values.adFree.title")}</CellTitle>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t("transparencyPage.money.noAds")}</p>
        </div>
        {/* Standard leaderboard size; it stays empty */}
        <motion.div
          animate={shake}
          className="mt-auto flex flex-col gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/35 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5"
        >
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">728 × 90</p>
            <p className="mt-1 text-sm text-foreground" aria-live="polite">
              {tried ? t("aboutPage.values.adFree.stays") : t("aboutPage.values.adFree.slot")}
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
            {t("aboutPage.values.adFree.toggle")}
            <Switch checked={on} onCheckedChange={flip} data-testid="about-ad-switch" />
          </label>
        </motion.div>
      </div>
    </Cell>
  );
}

const WORDS = [
  { lang: "de", code: "DE", word: "Kritik" },
  { lang: "en", code: "EN", word: "Review" },
  { lang: "fr", code: "FR", word: "Critique" },
  { lang: "es", code: "ES", word: "Reseña" },
  { lang: "th", code: "TH", word: "รีวิว" },
];
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** "Review" in the five site languages; the word decodes letter by letter when it changes */
function LanguagesCell() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Text changes go straight into the DOM inside one rAF loop, React renders once per word
  useEffect(() => {
    const el = word.current;
    if (!el) return;
    const target = WORDS[index].word;
    // Random Latin letters only make sense for a Latin word; Thai just swaps
    if (reduce || !/^\p{Script=Latin}+$/u.test(target)) {
      el.textContent = target;
      return;
    }
    let frame = 0;
    let raf = 0;
    const total = 16;
    const tick = () => {
      frame++;
      const done = Math.floor((frame / total) * target.length);
      el.textContent = target
        .split("")
        .map((ch, i) => (i < done ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join("");
      if (frame < total) raf = requestAnimationFrame(tick);
      else el.textContent = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, reduce]);

  useEffect(() => {
    if (!inView || paused || reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2600);
    return () => window.clearInterval(id);
  }, [inView, paused, reduce]);

  return (
    <Cell className="bg-gradient-to-br from-primary/15 via-card/60 to-card/60 md:col-span-2 md:row-span-2" testId="about-languages">
      <div
        ref={ref}
        className="flex h-full flex-col"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <CellTitle icon={Languages}>{t("aboutPage.values.languages.title")}</CellTitle>
        <div className="my-10 flex min-h-[5rem] items-center md:my-auto md:py-10">
          <span
            ref={word}
            lang={WORDS[index].lang}
            className="font-display text-5xl font-bold leading-[1.15] text-foreground lg:text-6xl"
            data-testid="about-language-word"
          >
            {WORDS[0].word}
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("aboutPage.values.languages.pick")}>
          {WORDS.map((w, i) => (
            <button
              key={w.code}
              type="button"
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-9 rounded-full border px-3.5 font-mono text-xs font-semibold transition-colors active:scale-[0.96]",
                i === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {w.code}
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{t("aboutPage.values.languages.text")}</p>
      </div>
    </Cell>
  );
}

function AiCell() {
  const { t } = useTranslation();
  const yes = ["translation", "tags", "tools"] as const;
  const no = ["reviews", "ratings"] as const;
  return (
    <Cell className="md:col-span-2" testId="about-ai">
      <CellTitle icon={Sparkles}>{t("aboutPage.values.ai.title")}</CellTitle>
      <p className="mt-3 leading-relaxed text-muted-foreground">{t("transparencyPage.ai.intro")}</p>
      <ul className="mt-5 flex flex-wrap gap-2 text-sm">
        {yes.map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-foreground">
            <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t(`aboutPage.values.ai.${k}`)}
          </li>
        ))}
        {no.map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/60 px-3 py-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="line-through decoration-muted-foreground/60">{t(`aboutPage.values.ai.${k}`)}</span>
          </li>
        ))}
      </ul>
    </Cell>
  );
}

function TrackingCell() {
  const { t } = useTranslation();
  return (
    <Cell className="md:col-span-2" testId="about-tracking">
      <CellTitle icon={EyeOff}>{t("aboutPage.values.tracking.title")}</CellTitle>
      <p className="mt-3 leading-relaxed text-muted-foreground">{t("transparency.noTrackingDesc")}</p>
      <Link to="/datenschutz" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
        {t("aboutPage.values.tracking.link")}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Cell>
  );
}

function OpenCell() {
  const { t } = useTranslation();
  return (
    <Cell className="md:col-span-6" testId="about-open">
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground md:text-2xl">{t("aboutPage.values.open.title")}</h3>
          <p className="mt-3 max-w-[52ch] leading-relaxed text-muted-foreground">{t("aboutPage.values.open.text")}</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <Link to="/developers" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
              {t("aboutPage.values.open.api")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/status" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
              {t("aboutPage.values.open.status")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        {/* The request from the API docs, shortened to the path */}
        <pre className="overflow-x-auto rounded-2xl border border-border/50 bg-background/70 p-5 font-mono text-[13px] leading-relaxed text-foreground">
          <code>
            <span className="text-primary">GET</span> /v3/media/movie/550{"\n"}
            <span className="text-muted-foreground">x-api-key: </span>YOUR_API_KEY
          </code>
        </pre>
      </div>
    </Cell>
  );
}

/** What CritiCore stands for, as five cells of different weight */
export default function ValuesBento() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="about-values-title" className="container mx-auto max-w-6xl px-4 py-24 md:py-32">
      <Reveal>
        <h2 id="about-values-title" className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {t("aboutPage.values.title")}
        </h2>
      </Reveal>
      <Reveal delay={0.08} className="mt-10 grid grid-cols-1 gap-4 md:mt-14 md:grid-cols-6">
        <AdFreeCell />
        <LanguagesCell />
        <TrackingCell />
        <AiCell />
        <OpenCell />
      </Reveal>
    </section>
  );
}
