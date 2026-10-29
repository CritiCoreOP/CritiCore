import { useRef, useCallback } from "react";

/**
 * Material CC 3D tilt card hook.
 * Attaches mousemove/mouseleave handlers for perspective tilt + shine.
 */
export function useTiltCard<T extends HTMLElement = HTMLDivElement>(intensity = 18) {
  const ref = useRef<T>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale(1.03)`;
      // Update shine position via CSS var
      el.style.setProperty("--tilt-x", `${(x + 0.5) * 100}%`);
      el.style.setProperty("--tilt-y", `${(y + 0.5) * 100}%`);
    },
    [intensity]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.transition = "transform 400ms var(--mcc-ease-spring, cubic-bezier(0.34,1.56,0.64,1)), box-shadow 300ms";
    setTimeout(() => {
      if (el) el.style.transition = "";
    }, 400);
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
