import { useEffect, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared by the social editor and the top-10 graphics: pictures through the site's image proxy,
 * and PNG rendering of a DOM node with only the fonts it uses.
 */

const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news-image`;

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/** Original address behind a proxy URL, or the URL itself */
export function unproxied(url: string): string {
  if (!url.startsWith(PROXY)) return url;
  try {
    return new URL(url).searchParams.get("src") || url;
  } catch {
    return url;
  }
}

/** True for pictures that have to come through the proxy: other hosts, not data or same-site files */
const needsProxy = (url: string) => /^https?:\/\//i.test(url) && !url.startsWith(location.origin);

const pictures = new Map<string, Promise<string | null>>();

/**
 * A picture as data URL, fetched through the image proxy with the user's token. The proxy checks
 * the JWT, so a plain <img src> pointing at it got a 401; a data URL also needs no CORS when the
 * graphic is exported.
 */
export function pictureDataUrl(url: string): Promise<string | null> {
  const original = unproxied(url);
  if (!needsProxy(original)) return Promise.resolve(original);
  let pending = pictures.get(original);
  if (!pending) {
    pending = (async () => {
      const { data } = await supabase.auth.getSession();
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${PROXY}?src=${encodeURIComponent(original)}`, {
        headers: { Authorization: `Bearer ${data.session?.access_token ?? key}`, apikey: key },
      });
      if (!res.ok) return null;
      return blobToDataUrl(await res.blob());
    })().catch(() => null);
    pictures.set(original, pending);
    // A failed load may work later (token refreshed, network back)
    void pending.then((v) => v === null && pictures.delete(original));
  }
  return pending;
}

/** `src` ready to show and export: proxied pictures resolve to a data URL, the rest stays as it is */
export function useProxiedSrc(src: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<{ from: string; to: string | null } | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    void pictureDataUrl(src).then((to) => !cancelled && setResolved({ from: src, to }));
    return () => {
      cancelled = true;
    };
  }, [src]);
  if (!src) return null;
  if (!needsProxy(unproxied(src))) return unproxied(src);
  return resolved?.from === src ? resolved.to : null;
}

/* ── Fonts ─────────────────────────────────────────────────────────────────── */

const fontCss = new Map<string, Promise<string>>();

/** First family of every element in the node */
function familiesIn(node: HTMLElement): string[] {
  const set = new Set<string>();
  for (const el of [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))]) {
    for (const f of getComputedStyle(el).fontFamily.split(",")) set.add(f.replace(/["']/g, "").trim());
  }
  return [...set].sort();
}

/**
 * @font-face rules for the families the node uses, Latin subsets only, with the files inlined.
 * html-to-image would otherwise inline every web font of the site, which took half a minute.
 */
export function fontEmbedCss(node: HTMLElement): Promise<string> {
  const families = familiesIn(node);
  const key = families.join("|");
  let pending = fontCss.get(key);
  if (!pending) {
    pending = (async () => {
      const rules: CSSFontFaceRule[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        let list: CSSRuleList;
        try {
          list = sheet.cssRules;
        } catch {
          continue; // cross-origin sheet
        }
        for (const rule of Array.from(list)) {
          if (!(rule instanceof CSSFontFaceRule)) continue;
          const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
          const range = rule.style.getPropertyValue("unicode-range");
          if (families.includes(family) && (!range || /U\+0+-0*FF\b/i.test(range))) rules.push(rule);
        }
      }
      const parts = await Promise.all(
        rules.map(async (rule) => {
          const url = rule.style.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/)?.[1];
          if (!url) return "";
          try {
            const abs = new URL(url, rule.parentStyleSheet?.href ?? location.href).href;
            const data = await blobToDataUrl(await (await fetch(abs)).blob());
            return rule.cssText.replace(/src:[^;]+;/, `src: url("${data}");`);
          } catch {
            return "";
          }
        }),
      );
      return parts.filter(Boolean).join("\n");
    })();
    fontCss.set(key, pending);
  }
  return pending;
}

/* ── Rendering ─────────────────────────────────────────────────────────────── */

const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const skipMarked = (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset?.exportIgnore === "true");

export interface RenderOptions {
  /** Transparent background (video with alpha) */
  backgroundColor?: string;
  /** Set by loops that render many frames: warm up Safari only once */
  warm?: boolean;
}

async function options(node: HTMLElement) {
  return { pixelRatio: 1, cacheBust: false, fontEmbedCSS: await fontEmbedCss(node), filter: skipMarked };
}

/**
 * Safari decodes the pictures inside the SVG html-to-image builds only on a second pass; the
 * first one warms it up.
 */
async function warmUp(node: HTMLElement, opts: object) {
  if (isSafari()) await toPng(node, opts).catch(() => null);
}

export async function renderPngDataUrl(node: HTMLElement, { warm = true }: RenderOptions = {}): Promise<string> {
  const opts = await options(node);
  if (warm) await warmUp(node, opts);
  return toPng(node, opts);
}

export async function renderPngBlob(node: HTMLElement): Promise<Blob> {
  const opts = await options(node);
  await warmUp(node, opts);
  const blob = await toBlob(node, opts);
  if (!blob) throw new Error("empty image");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
