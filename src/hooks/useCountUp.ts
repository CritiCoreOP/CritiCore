import { useRef, useState, useEffect, useCallback } from "react";

interface UseCountUpOptions {
  target: number;
  duration?: number;
  suffix?: string;
  threshold?: number;
  formatK?: boolean;
}

/**
 * Material CC count-up animation hook.
 * Animates a number from 0 to target when element enters viewport.
 */
export function useCountUp<T extends HTMLElement = HTMLDivElement>({
  target,
  duration = 1400,
  suffix = "",
  threshold = 0.2,
  formatK = true,
}: UseCountUpOptions) {
  const ref = useRef<T>(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, started]);

  useEffect(() => {
    if (!started) return;

    const start = performance.now();
    let raf: number;

    const frame = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.floor(ease * target));
      if (t < 1) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration]);

  const displayValue = formatK && value >= 1000
    ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    : String(value);

  return { ref, value, displayValue: displayValue + suffix, started };
}
