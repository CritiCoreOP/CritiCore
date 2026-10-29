import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";

/**
 * LiquidGLProvider – loads and initializes the liquidGL library
 * for real WebGL glassmorphism when the "glass" theme is active.
 *
 * Uses a pre-flight html2canvas test on the actual page body to check
 * compatibility. If the test fails (e.g. unsupported CSS color functions),
 * liquidGL is skipped entirely — the glass theme falls back to CSS-only effects.
 */

const HTML2CANVAS_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
const LIQUIDGL_SRC =
  "https://cdn.jsdelivr.net/gh/naughtyduk/liquidGL@main/scripts/liquidGL.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

const GLASS_TARGETS = [
  "nav.fixed:not(.nav-dock-only)",      // Desktop navbar only
  "[data-liquidgl]",                    // Explicit opt-in elements
].join(", ");

/**
 * Test html2canvas on the real document body (small capture area).
 * Returns true only if html2canvas can successfully render the page.
 */
async function testHtml2CanvasOnBody(): Promise<boolean> {
  try {
    const h2c = (window as any).html2canvas;
    if (!h2c) return false;
    // Attempt a tiny 1x1 capture of the actual body to trigger CSS parsing
    await h2c(document.body, {
      width: 1,
      height: 1,
      x: 0,
      y: 0,
      windowWidth: 1,
      windowHeight: 1,
      logging: false,
    });
    return true;
  } catch (err) {
    console.warn("[LiquidGLProvider] html2canvas body test failed, CSS-only glass fallback:", (err as Error)?.message);
    return false;
  }
}

const LiquidGLProvider = () => {
  const { theme } = useTheme();
  const instanceRef = useRef<any>(null);
  const isGlass = theme === "glass";

  useEffect(() => {
    if (!isGlass) {
      if (instanceRef.current) {
        try { instanceRef.current.destroy?.(); } catch {}
        instanceRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        await loadScript(HTML2CANVAS_SRC);
        await loadScript(LIQUIDGL_SRC);
        if (cancelled) return;

        // Wait for DOM to stabilize
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;

        // Pre-flight: test html2canvas on the actual body
        const canSnapshot = await testHtml2CanvasOnBody();
        if (!canSnapshot || cancelled) {
          console.info("[LiquidGLProvider] Using CSS-only glass (html2canvas incompatible)");
          return;
        }

        const lgl = (window as any).liquidGL;
        if (!lgl) {
          console.warn("[LiquidGLProvider] liquidGL not found on window");
          return;
        }

        const targets = document.querySelectorAll(GLASS_TARGETS);
        if (targets.length === 0) {
          console.warn("[LiquidGLProvider] No fixed elements found for glassmorphism");
          return;
        }

        instanceRef.current = lgl({
          snapshot: "body",
          target: GLASS_TARGETS,
          resolution: 1.5,
          refraction: 0.012,
          bevelDepth: 0.06,
          bevelWidth: 0.12,
          frost: 8,
          shadow: true,
          specular: true,
          reveal: "fade",
          tilt: false,
          magnify: 1,
          on: {
            init() {
              console.log("[LiquidGLProvider] liquidGL initialized ✨");
            },
          },
        });
      } catch (err) {
        console.warn("[LiquidGLProvider] Could not initialize liquidGL:", err);
        if (instanceRef.current) {
          try { instanceRef.current.destroy?.(); } catch {}
          instanceRef.current = null;
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        try { instanceRef.current.destroy?.(); } catch {}
        instanceRef.current = null;
      }
    };
  }, [isGlass]);

  return null;
};

export default LiquidGLProvider;
