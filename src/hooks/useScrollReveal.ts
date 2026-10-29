import { useEffect, useRef, useState, useCallback } from "react";

type ScrollDirection = "up" | "left" | "right" | "scale" | "zoom";

interface UseScrollRevealOptions {
  direction?: ScrollDirection;
  threshold?: number;
  delay?: number;
  once?: boolean;
}

/**
 * Material CC scroll reveal hook.
 * Adds IntersectionObserver-based reveal animation.
 * Returns a ref to attach and whether the element is revealed.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  direction = "up",
  threshold = 0.15,
  delay = 0,
  once = true,
}: UseScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setRevealed(true), delay);
          } else {
            setRevealed(true);
          }
          if (once) io.disconnect();
        } else if (!once) {
          setRevealed(false);
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, delay, once]);

  const className = revealed ? `mcc-scroll-revealed mcc-scroll-${direction}` : `mcc-scroll-hidden mcc-scroll-${direction}`;

  return { ref, revealed, className };
}

/**
 * Staggered scroll reveal for a list of items.
 * Returns containerRef and a function to get className per index.
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>({
  staggerDelay = 80,
  threshold = 0.15,
  once = true,
}: { staggerDelay?: number; threshold?: number; once?: boolean } = {}) {
  const containerRef = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          if (once) io.disconnect();
        } else if (!once) {
          setRevealed(false);
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);

  const getItemStyle = useCallback(
    (index: number) => ({
      transitionDelay: revealed ? `${index * staggerDelay}ms` : "0ms",
    }),
    [revealed, staggerDelay]
  );

  const getItemClassName = useCallback(
    () => (revealed ? "mcc-stagger-item mcc-stagger-in" : "mcc-stagger-item"),
    [revealed]
  );

  return { containerRef, revealed, getItemStyle, getItemClassName };
}
