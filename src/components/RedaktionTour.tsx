import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "redaktion.tour.v1";

type Step = {
  selector: string;
  title: string;
  body: string;
  placement?: "top" | "bottom";
};

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const readRect = (sel: string): Rect | null => {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

export default function RedaktionTour({ ready }: { ready: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const steps: Step[] = [
    {
      selector: '[data-tour="quick"]',
      title: t("redaktion.tour.quick.title", "Schnellzugriff"),
      body: t(
        "redaktion.tour.quick.body",
        "Schreiben, einreichen, Board und Entwürfe — deine wichtigsten Aktionen mit einem Tap.",
      ),
      placement: "bottom",
    },
    {
      selector: '[data-tour="pipeline"]',
      title: t("redaktion.tour.pipeline.title", "Pipeline verschieben"),
      body: t(
        "redaktion.tour.pipeline.body",
        "Nutze die Pfeile unter jedem Artikel, um ihn im Workflow vor- oder zurückzuschieben.",
      ),
      placement: "top",
    },
    {
      selector: '[data-tour="briefings"]',
      title: t("redaktion.tour.briefings.title", "Briefings"),
      body: t(
        "redaktion.tour.briefings.body",
        "Redaktions-Briefings öffnen den Artikel direkt im Editor.",
      ),
      placement: "top",
    },
    {
      selector: '[data-tour="fab"]',
      title: t("redaktion.tour.fab.title", "Neu erstellen"),
      body: t(
        "redaktion.tour.fab.body",
        "Über den violetten Button startest du jederzeit einen neuen Artikel.",
      ),
      placement: "top",
    },
  ];

  // Only auto-launch on mobile viewports
  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (window.innerWidth >= 1024) return;
    const id = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(id);
  }, [ready]);

  // Lock body scroll while tour is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const step = steps[i];
    if (!step) return;

    let raf = 0;
    const update = () => {
      const el = document.querySelector<HTMLElement>(step.selector);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const scrollIntoView = () => {
      const el = document.querySelector<HTMLElement>(step.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top < 100 || r.bottom > vh - 220) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    scrollIntoView();
    update();
    // update again after scroll settles
    const t1 = window.setTimeout(update, 200);
    const t2 = window.setTimeout(update, 500);
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const step = steps[i];
  const pad = 8;
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Decide tooltip placement: top or bottom of spotlight, clamped in viewport
  const TOOLTIP_ESTIMATED_H = 180;
  const MARGIN = 16;
  let tooltipTop = vh - TOOLTIP_ESTIMATED_H - MARGIN;
  let tooltipBottom: number | undefined;

  if (spotlight) {
    const spaceBelow = vh - (spotlight.top + spotlight.height);
    const spaceAbove = spotlight.top;
    const preferBottom = step.placement === "bottom";

    if (preferBottom && spaceBelow > TOOLTIP_ESTIMATED_H + MARGIN + 12) {
      tooltipTop = spotlight.top + spotlight.height + 12;
    } else if (spaceAbove > TOOLTIP_ESTIMATED_H + MARGIN + 12) {
      tooltipBottom = vh - spotlight.top + 12;
      tooltipTop = Math.max(
        MARGIN,
        vh - tooltipBottom - TOOLTIP_ESTIMATED_H,
      );
    } else if (spaceBelow > TOOLTIP_ESTIMATED_H + MARGIN + 12) {
      tooltipTop = spotlight.top + spotlight.height + 12;
    } else {
      // fallback: anchor to bottom of screen
      tooltipTop = vh - TOOLTIP_ESTIMATED_H - MARGIN;
    }
    // clamp
    tooltipTop = Math.max(
      MARGIN,
      Math.min(tooltipTop, vh - TOOLTIP_ESTIMATED_H - MARGIN),
    );
  }

  return createPortal(
    <div
      data-tour-dialog="redaktion"
      className="fixed inset-x-0 inset-y-0 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-label={t("redaktion.tour.aria", "Einführungstour")}
      onClick={(e) => {
        // Prevent clicks bleeding through
        e.stopPropagation();
      }}
    >
      {/* Dimmer with spotlight cutout */}
      <AnimatePresence>
        <motion.svg
          key="mask"
          className="pointer-events-none absolute inset-0 h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden="true"
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {spotlight && (
                <motion.rect
                  initial={false}
                  animate={{
                    x: spotlight.left,
                    y: spotlight.top,
                    width: spotlight.width,
                    height: spotlight.height,
                  }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  rx={20}
                  ry={20}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#tour-mask)"
          />
        </motion.svg>
      </AnimatePresence>

      {/* Highlight ring */}
      {spotlight && (
        <motion.div
          initial={false}
          animate={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute rounded-[20px] ring-2 ring-primary/80 shadow-[0_0_0_4px_hsl(var(--primary)/0.2)]"
        />
      )}

      {/* Tooltip card — full-width mobile, centered */}
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ top: tooltipTop }}
        className="absolute inset-x-4 mx-auto max-w-md rounded-3xl border border-border/50 bg-card/95 p-4 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("redaktion.tour.step", "Schritt {{n}} von {{total}}", {
                  n: i + 1,
                  total: steps.length,
                })}
              </p>
              <button
                onClick={finish}
                aria-label={t("common.close", "Schließen")}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-1 font-display text-lg font-bold leading-tight text-foreground">
              {step.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-5 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={finish}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {t("redaktion.tour.skip", "Überspringen")}
            </button>
            <button
              onClick={() => {
                if (i < steps.length - 1) setI(i + 1);
                else finish();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {i < steps.length - 1
                ? t("redaktion.tour.next", "Weiter")
                : t("redaktion.tour.done", "Los geht's")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
