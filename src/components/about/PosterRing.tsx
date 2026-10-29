import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { animate, motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { Link } from "@/lib/locale-router";
import type { PoolItem } from "./useMediaPool";

/** Turn speed when nobody touches the ring, degrees per millisecond: one turn in about 70 s */
const AUTO_SPEED = 0.005;
/** Degrees of rotation per dragged pixel */
const DRAG_FACTOR = 0.28;
const SLOTS = 14;

interface PosterRingProps {
  items: PoolItem[];
  loading: boolean;
}

/**
 * The hero object: what is trending right now in all four worlds, on a ring in CSS 3D. It turns by
 * itself, can be spun by dragging (with momentum) or with the arrow buttons, and a focused poster
 * turns to the front. Plain DOM and CSS transforms, so the covers need no CORS and no WebGL.
 */
export default function PosterRing({ items, loading }: PosterRingProps) {
  const { t } = useTranslation();
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage);
  const reduce = useReducedMotion();
  const rotation = useMotionValue(0);
  // Degrees per ms, positive = the front moves left
  const velocity = useRef(0);
  const drag = useRef<{ x: number; t: number; captured: boolean } | null>(null);
  const dragDistance = useRef(0);
  const hovering = useRef(false);
  const settling = useRef(false);

  const slots: (PoolItem | null)[] = loading || items.length === 0
    ? Array.from({ length: SLOTS }, () => null)
    : Array.from({ length: Math.max(10, Math.min(SLOTS, items.length)) }, (_, i) => items[i % items.length]);
  const count = slots.length;
  const step = 360 / count;
  // Distance from the centre in poster widths, with a small gap between neighbours
  const radius = (0.5 / Math.tan(Math.PI / count)) * 1.1;

  useAnimationFrame((_, delta) => {
    if (drag.current || settling.current) return;
    const target = reduce || !inView || hovering.current ? 0 : AUTO_SPEED;
    // Momentum from a flick fades into the idle speed instead of stopping dead
    velocity.current += (target - velocity.current) * Math.min(1, delta / 900);
    if (Math.abs(velocity.current) < 0.00001) return;
    rotation.set(rotation.get() - velocity.current * Math.min(delta, 64));
  });

  const settle = (target: number) => {
    settling.current = true;
    velocity.current = 0;
    animate(rotation, target, {
      ...(reduce ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 20 }),
      onComplete: () => {
        settling.current = false;
      },
    });
  };

  /** Turns poster i to the front by the shorter way round */
  const bringToFront = (i: number) => {
    const current = rotation.get();
    let target = -i * step;
    target += Math.round((current - target) / 360) * 360;
    settle(target);
  };

  const turn = (direction: 1 | -1) => {
    const current = rotation.get();
    settle(Math.round(current / step) * step + direction * step);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, t: e.timeStamp, captured: false };
    dragDistance.current = 0;
    velocity.current = 0;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dt = Math.max(1, e.timeStamp - d.t);
    dragDistance.current += Math.abs(dx);
    // Capture only once it is a real drag; capturing on press would swallow the click on a poster
    if (!d.captured && dragDistance.current > 4) {
      stage.current?.setPointerCapture(e.pointerId);
      d.captured = true;
    }
    rotation.set(rotation.get() + dx * DRAG_FACTOR);
    velocity.current = -(dx * DRAG_FACTOR) / dt;
    d.x = e.clientX;
    d.t = e.timeStamp;
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    // Held still before letting go: no throw
    if (reduce || e.timeStamp - d.t > 90) velocity.current = 0;
  };

  return (
    <div className="relative">
      <div
        ref={stage}
        data-testid="poster-ring"
        className="relative h-[18rem] cursor-grab select-none overflow-hidden [--pw:6.5rem] [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] [perspective:900px] [touch-action:pan-y] active:cursor-grabbing sm:h-[26rem] sm:[--pw:8rem] lg:h-[30rem] lg:[--pw:9rem] lg:[perspective:1100px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") hovering.current = true;
        }}
        onPointerLeave={() => {
          hovering.current = false;
        }}
        onClickCapture={(e) => {
          // A drag that ends on a poster is not a click on it
          if (dragDistance.current > 6) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {/* Light on the floor under the ring */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[15%] bottom-4 h-20 rounded-[50%] bg-[radial-gradient(closest-side,hsl(var(--primary)/0.35),transparent)] blur-2xl"
        />
        <motion.ul
          aria-label={t("aboutPage.ring.label")}
          className="absolute left-1/2 top-[46%] h-0 w-0 [transform-style:preserve-3d]"
          style={{ rotateX: -9, rotateY: rotation, z: "calc(var(--pw) * -1.1)" }}
        >
          {slots.map((item, i) => (
            <li
              key={item ? `${item.key}-${i}` : i}
              className="absolute [backface-visibility:hidden]"
              style={{
                width: "var(--pw)",
                height: "calc(var(--pw) * 1.5)",
                marginLeft: "calc(var(--pw) / -2)",
                marginTop: "calc(var(--pw) * -0.75)",
                transform: `rotateY(${i * step}deg) translateZ(calc(var(--pw) * ${radius.toFixed(4)}))`,
              }}
            >
              {item ? (
                <Link
                  to={item.to}
                  draggable={false}
                  onFocus={() => bringToFront(i)}
                  className="group block h-full w-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="block h-full w-full overflow-hidden rounded-2xl border border-border/40 bg-muted shadow-[0_24px_48px_-20px_hsl(var(--background))] transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.04]">
                    <img
                      src={item.poster}
                      alt={item.title}
                      draggable={false}
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </span>
                </Link>
              ) : (
                <span className="block h-full w-full animate-pulse rounded-2xl bg-muted/70" />
              )}
            </li>
          ))}
        </motion.ul>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => turn(1)}
          aria-label={t("aboutPage.ring.previous")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-secondary active:scale-[0.96]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="inline-flex items-center gap-1.5">
          <Hand className="h-4 w-4" aria-hidden="true" />
          {t("aboutPage.ring.hint")}
        </span>
        <button
          type="button"
          onClick={() => turn(-1)}
          aria-label={t("aboutPage.ring.next")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-secondary active:scale-[0.96]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
