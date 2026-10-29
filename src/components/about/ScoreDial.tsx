import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import ScoreBadge from "@/components/ScoreBadge";
import { cn } from "@/lib/utils";
import { getScoreTier, scoreTierTextClass, type ScoreTier } from "@/lib/scoreTier";

// The real scale of a CritiCore rating
const MIN = 0.5;
const MAX = 10;
const STEP = 0.5;
// Gauge: 270° clockwise from bottom left (135°) to bottom right (45°); SVG angles run clockwise
const START = 135;
const SWEEP = 270;
const R = 84;
const CIRC = 2 * Math.PI * R;
const ARC = (CIRC * SWEEP) / 360;

const TIER_COLOR: Record<ScoreTier, string> = {
  low: "hsl(var(--score-low))",
  mid: "hsl(var(--score-mid))",
  high: "hsl(var(--score-high))",
};

const fraction = (v: number) => (v - MIN) / (MAX - MIN);
const snap = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v / STEP) * STEP));

function valueFromPointer(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const box = svg.getBoundingClientRect();
  const dx = clientX - (box.left + box.width / 2);
  const dy = clientY - (box.top + box.height / 2);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let rel = (angle - START + 720) % 360;
  // In the gap at the bottom: snap to the nearer end
  if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
  return snap(MIN + (rel / SWEEP) * (MAX - MIN));
}

/**
 * A rating gauge on CritiCore's real scale (0.5 to 10 in half steps) with the real colour tiers.
 * Drag the knob, tap the ring or use the arrow keys (a native range input underneath). The badge
 * below is the same component the site shows on every poster.
 */
export default function ScoreDial() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const inView = useInView(wrap, { once: true, amount: 0.5 });
  const [value, setValue] = useState(MIN);
  const touched = useRef(false);

  const raw = useMotionValue(fraction(MIN));
  const f = useSpring(raw, { stiffness: 180, damping: 24 });
  const dash = useTransform(f, (v) => `${Math.max(0.001, v) * ARC} ${CIRC}`);
  const knobX = useTransform(f, (v) => 100 + R * Math.cos(((START + SWEEP * v) * Math.PI) / 180));
  const knobY = useTransform(f, (v) => 100 + R * Math.sin(((START + SWEEP * v) * Math.PI) / 180));

  useEffect(() => {
    raw.set(fraction(value));
  }, [value, raw]);

  // First sight: the needle runs up to a typical rating, so the colours show once
  useEffect(() => {
    if (!inView || touched.current) return;
    if (reduce) {
      setValue(7.5);
      return;
    }
    const controls = animate(MIN, 7.5, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (!touched.current) setValue(snap(v));
      },
    });
    return () => controls.stop();
  }, [inView, reduce]);

  const tier = getScoreTier(value);
  // Same notation as ScoreBadge right below, so the two never disagree
  const formatted = value.toFixed(1);

  const take = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!svg.current) return;
    touched.current = true;
    setValue(valueFromPointer(svg.current, e.clientX, e.clientY));
  };

  const ticks = Array.from({ length: (MAX - MIN) / STEP + 1 }, (_, i) => {
    const v = MIN + i * STEP;
    const a = ((START + SWEEP * fraction(v)) * Math.PI) / 180;
    const whole = Number.isInteger(v);
    const inner = R - (whole ? 15 : 11);
    const outer = R - 7;
    return (
      <line
        key={v}
        x1={100 + inner * Math.cos(a)}
        y1={100 + inner * Math.sin(a)}
        x2={100 + outer * Math.cos(a)}
        y2={100 + outer * Math.sin(a)}
        stroke="currentColor"
        strokeWidth={whole ? 1.6 : 1}
        strokeLinecap="round"
        className={v <= value ? "text-foreground/60" : "text-foreground/20"}
      />
    );
  });

  const tiers: { id: ScoreTier; label: string }[] = [
    { id: "low", label: t("aboutPage.ratings.tierLow") },
    { id: "mid", label: t("aboutPage.ratings.tierMid") },
    { id: "high", label: t("aboutPage.ratings.tierHigh") },
  ];

  return (
    <div ref={wrap} className="flex flex-col items-center">
      <div className="relative w-full max-w-[22rem] rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-4 has-[:focus-visible]:ring-offset-background">
        <svg
          ref={svg}
          viewBox="0 0 200 200"
          data-testid="score-dial"
          className="block w-full cursor-pointer select-none [touch-action:none]"
          aria-hidden="true"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            take(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) take(e);
          }}
        >
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${ARC} ${CIRC}`}
            transform={`rotate(${START} 100 100)`}
          />
          {/* Colour through currentColor and a class: React updates a class reliably on every value */}
          <motion.circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            transform={`rotate(${START} 100 100)`}
            style={{ strokeDasharray: dash }}
            className={cn("transition-colors duration-300", scoreTierTextClass(tier))}
          />
          {ticks}
          <motion.circle
            r="11"
            cx={knobX}
            cy={knobY}
            fill="hsl(var(--background))"
            stroke="currentColor"
            strokeWidth="4"
            className={cn("drop-shadow-[0_4px_10px_hsl(var(--background)/0.6)] transition-colors duration-300", scoreTierTextClass(tier))}
          />
        </svg>

        {/* Native range input: keyboard, screen readers, and the source of truth for both */}
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={value}
          aria-label={t("aboutPage.ratings.dialLabel")}
          aria-valuetext={formatted}
          onChange={(e) => {
            touched.current = true;
            setValue(Number(e.target.value));
          }}
          className="sr-only"
        />

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={tier}
            initial={reduce ? false : { scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={cn("font-display text-6xl font-bold tabular-nums leading-none sm:text-7xl", scoreTierTextClass(tier))}
            data-testid="score-dial-value"
          >
            {formatted}
          </motion.span>
          <span className="mt-2 text-sm text-muted-foreground">{t("aboutPage.ratings.outOf")}</span>
        </div>
      </div>

      <div className="-mt-6 flex flex-col items-center gap-4">
        <ScoreBadge score={value} size="lg" />
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label={t("aboutPage.ratings.tiersLabel")}>
          {tiers.map(({ id, label }) => (
            <li
              key={id}
              className={cn("flex items-center gap-2 transition-colors", id === tier && "text-foreground")}
            >
              <span aria-hidden="true" className="h-1.5 w-5 rounded-full" style={{ background: TIER_COLOR[id] }} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
