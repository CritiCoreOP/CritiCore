import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { canonicalizePath, getLangFromLocale, getLocaleFromPath, stripLocalePrefix } from "@/lib/localeRouting";
import { setPageLinks } from "@/lib/seo";

/** Scroll position per history entry, so "back" returns to the same spot in a list */
const positions = new Map<string, number>();

/** Same page in another language counts as the same page (/de-DE/filme vs /en-US/movies) */
function pageOf(pathname: string) {
  const lang = getLangFromLocale(getLocaleFromPath(pathname) ?? "") ?? "de";
  return canonicalizePath(stripLocalePrefix(pathname), lang);
}

function jumpTo(top: number) {
  // "instant": html has scroll-behavior: smooth, which would animate every page change
  window.scrollTo({ top, left: 0, behavior: "instant" as ScrollBehavior });
}

/**
 * Retries `step` every frame until it succeeds, `ms` passes or the visitor scrolls themselves.
 * Pages render their content after data arrives, so the target (height, #anchor) is not there yet.
 */
function untilDone(step: () => boolean, ms: number) {
  const end = performance.now() + ms;
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) window.removeEventListener(type, stop);
  };
  for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(type, stop, { passive: true });
  const tick = () => {
    if (step() || performance.now() > end) stop();
    else frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return stop;
}

/**
 * Scroll and focus on page changes. BrowserRouter does none of this, so a detail page opened from a
 * scrolled list started halfway down, and "back" lost the place in the list.
 * - new page: top (or the #anchor once it has rendered)
 * - back/forward: the position that page had
 * - only the query changed (filters, tabs): stay where you are
 */
const RouteEffects = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const lastY = useRef(0);
  const previous = useRef<{ entry: string; page: string } | null>(null);
  // The key alone is not unique: the first page and every plain <a href="#…"> jump get "default"
  // (no history state), so the URL is part of it
  const entry = `${location.key}|${location.pathname}${location.search}${location.hash}`;

  // Canonical and hreflang from the route; a layout effect, so the pages' own setSeo (a normal
  // effect, often after their data loaded) always comes after it and wins
  useLayoutEffect(() => {
    const locale = getLocaleFromPath(location.pathname);
    if (!locale) return;
    setPageLinks(pageOf(location.pathname), getLangFromLocale(locale) ?? "de");
  }, [location.pathname]);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    // Only remembers a number; the position is read when the next page is already in the DOM
    const onScroll = () => { lastY.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const page = pageOf(location.pathname);
    const before = previous.current;
    previous.current = { entry, page };
    const scrollToHash = (smooth: boolean) => {
      const id = decodeURIComponent(location.hash.slice(1));
      const reduce =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.classList.contains("reduce-motion");
      return untilDone(() => {
        const el = document.getElementById(id);
        if (!el) return false;
        el.scrollIntoView({ behavior: smooth && !reduce ? "smooth" : "auto", block: "start" });
        return true;
      }, 4000);
    };
    if (!before || before.entry === entry) {
      // First load (StrictMode runs this twice): the browser looked for a shared link's #anchor
      // before the data had rendered it
      return location.hash ? scrollToHash(false) : undefined;
    }
    positions.set(before.entry, lastY.current);
    const samePage = before.page === page;

    if (navigationType === "POP") {
      const y = positions.get(entry);
      if (y == null) {
        // A plain in-page anchor also arrives as POP; the browser has already scrolled to it
        if (!samePage) jumpTo(0);
        return;
      }
      jumpTo(y);
      // The list may still be loading and too short to reach y
      return untilDone(() => {
        jumpTo(y);
        return Math.abs(window.scrollY - y) < 2;
      }, 2500);
    }

    if (location.hash) {
      if (!samePage) jumpTo(0);
      return scrollToHash(samePage);
    }

    if (!samePage) jumpTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per history entry
  }, [entry]);

  // Keyboard and screen-reader users: the clicked link is gone with the old page, so focus fell back
  // to <body> and the next Tab started at the very top. Continue in the new page's content instead.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = window.setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  return null;
};

export default RouteEffects;
