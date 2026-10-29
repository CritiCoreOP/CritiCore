import { useEffect } from "react";

const GLOW_SELECTOR = [
  ".glass-glow",
  "[class*='bg-card'][class*='rounded']",
  "[class*='bg-card-gradient']",
  "section[class*='border-border'][class*='rounded-2xl']",
  "[class*='bg-secondary'][class*='rounded-lg']",
  "[class*='bg-secondary'][class*='rounded-xl']",
  "a[class*='rounded-lg'][class*='bg-primary']",
  "a[class*='rounded-lg'][class*='border']",
  "button[class*='rounded-lg']",
  "button[class*='rounded-md']",
  "input",
  "textarea",
  "select",
  "[role='combobox']",
  "[role='listbox']",
  "[data-radix-select-trigger]",
].join(",");

const SLIDER_SELECTOR = "[role='slider'], [data-radix-slider-thumb]";

const isLiquidGlass = () => {
  return document.documentElement.classList.contains("theme-glass");
};

const shouldDisableGlow = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 4) return true;
  return false;
};

const GlassGlowProvider = () => {
  useEffect(() => {
    if (shouldDisableGlow()) return;

    let current: HTMLElement | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isLiquidGlass()) {
        if (current) { current.style.setProperty("--glow-opacity", "0"); current = null; }
        return;
      }
      const el = e.target as HTMLElement;
      // Skip glow inside no-glow zones (e.g. review form)
      if (el.closest("[data-no-glow]")) {
        if (current) { current.style.setProperty("--glow-opacity", "0"); current = null; }
        return;
      }
      // Skip glow while interacting with sliders
      if (el.closest(SLIDER_SELECTOR)) {
        if (current) { current.style.setProperty("--glow-opacity", "0"); current = null; }
        return;
      }
      const target = el.closest(GLOW_SELECTOR) as HTMLElement | null;
      if (target && target !== current) {
        if (current) current.style.setProperty("--glow-opacity", "0");
        current = target;
        target.classList.add("glass-glow-auto");
      }
      if (target) {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
        target.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
        target.style.setProperty("--glow-opacity", "1");
      } else if (current) {
        current.style.setProperty("--glow-opacity", "0");
        current = null;
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (current && (!related || !current.contains(related))) {
        current.style.setProperty("--glow-opacity", "0");
        current = null;
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-state") {
          const el = m.target as HTMLElement;
          const state = el.getAttribute("data-state");
          if (state === "closed" || state === undefined) {
            el.blur();
            el.style.removeProperty("--glow-opacity");
          }
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    });

    const handleFocusOut = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.matches?.("input, textarea, select, [role='combobox'], [data-radix-select-trigger]")) {
        el.style.removeProperty("--glow-opacity");
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseout", handleMouseOut, { passive: true });
    document.addEventListener("focusout", handleFocusOut, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("focusout", handleFocusOut);
      observer.disconnect();
    };
  }, []);

  return null;
};

export default GlassGlowProvider;
