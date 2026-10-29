import { getDefaultAvatar } from "@/lib/defaultAvatars";
import { isOpinion, opinionWord } from "@/lib/article-labels";
import { getFormat } from "./formats";
import { BODY, C, fitted, footer, frame, image, pill, shape, text, uid, type Frame } from "./templateKit";
import { textWidth } from "./textFit";
import type { CanvasElement, Slide } from "./types";

export interface SlideArticle {
  title: string;
  category: string | null;
  cover: string | null;
  /** Short summary below the headline (written by the AI, else the excerpt) */
  summary?: string | null;
  /** Who wrote it: picture and name stand in the footer instead of the domain */
  author?: SlideAuthor | null;
  /** Article type and language: an opinion piece gets "MEINUNG" (in its language) instead of the category */
  type?: string | null;
  language?: string | null;
}

export interface SlideAuthor {
  userId: string;
  name: string;
  avatar: string | null;
}

/**
 * Round picture and name side by side, as one group so they move together. `align: "right"` puts
 * the pair's right edge at `x`. A long name gets smaller instead of wrapping.
 */
export function authorBadge(author: SlideAuthor, x: number, y: number, size: number, opts: { align?: "left" | "right"; maxWidth?: number; color?: string } = {}): CanvasElement[] {
  const gap = Math.round(size * 0.3);
  const room = (opts.maxWidth ?? size * 8) - size - gap;
  // Box width for one line, with the same slack the line count uses (see textFit)
  const needs = (px: number) => textWidth(author.name, BODY, 600, px) / 0.97 + px * 0.3;
  let fontSize = Math.round(size * 0.44);
  while (needs(fontSize) > room && fontSize > size * 0.25) fontSize -= 1;
  const nameW = Math.ceil(Math.min(room, needs(fontSize)));
  const left = Math.round(opts.align === "right" ? x - (size + gap + nameW) : x);
  const groupId = `g_${uid()}`;
  return [
    image(author.avatar || getDefaultAvatar(author.userId), left, y, size, size, { fit: "cover", radius: 9999, label: author.name, layerName: "Autor Bild", groupId }),
    text(author.name, left + size + gap, Math.round(y + (size - fontSize * 1.3) / 2), nameW, Math.round(fontSize * 1.3), {
      fontFamily: BODY, fontWeight: 600, fontSize, color: opts.color ?? C.paper, lineHeight: 1.25, layerName: "Autor", groupId,
    }),
  ];
}

/** The author pair on the right of the footer row, level with the logo */
function footerAuthor(f: Frame, author: SlideAuthor, logoTop: number, logoH: number): CanvasElement[] {
  const size = Math.round(logoH * 1.15);
  return authorBadge(author, f.right, Math.round(logoTop + (logoH - size) / 2), size, { align: "right", maxWidth: (f.right - f.left) * 0.5 });
}

/** Article category slugs as a short label on the graphic */
const CATEGORY_LABEL: Record<string, string> = { games: "Games", movies: "Filme", series: "Serien", anime: "Anime", patchnotes: "Patchnotes" };

/** Characters the summary may have in this format, so it fits below the headline */
export function summaryLength(formatId: string): number {
  const f = getFormat(formatId);
  const ratio = f.width / f.height;
  if (ratio >= 2.4) return 90;
  if (ratio >= 1.5) return 130;
  if (ratio <= 0.66) return 200;
  return 170;
}

/**
 * One slide from an article: the cover fills the background, a dark fade keeps the text readable,
 * and category, headline and summary stand as one block above the logo. The block is stacked from
 * the bottom up with fitted sizes, so a long headline shrinks instead of running under the summary.
 * Wide formats put the block on the left, where the fade is darkest.
 */
export function slideFromArticle(article: SlideArticle, formatId: string): Slide {
  const fmt = getFormat(formatId);
  const { width: w, height: h } = fmt;
  const f = frame(w, h);
  const category = article.category ? CATEGORY_LABEL[article.category] : undefined;
  const opinion = isOpinion(article.type);
  const summary = article.summary?.trim() || "";
  const body = Math.round(f.s * (f.ultra ? 0.042 : 0.034));
  const gap = Math.round(f.s * 0.03);
  const colW = f.wide ? (f.right - f.left) * (f.ultra ? 0.62 : 0.6) : f.right - f.left;

  const ft = footer(f, { color: "rgba(241,240,245,0.8)", domain: !article.author });
  const logoEl = ft.elements[0];
  const els: CanvasElement[] = [
    shape(0, 0, w, h, f.wide
      ? "linear-gradient(90deg, rgba(11,13,18,0.94) 0%, rgba(11,13,18,0.78) 42%, rgba(11,13,18,0.15) 78%, rgba(11,13,18,0) 100%)"
      : "linear-gradient(180deg, rgba(11,13,18,0) 18%, rgba(11,13,18,0.55) 42%, rgba(11,13,18,0.92) 68%, #0b0d12 100%)", { layerName: "Verlauf" }),
    ...ft.elements,
    ...(article.author ? footerAuthor(f, article.author, logoEl.y, logoEl.h) : []),
  ];

  let y = ft.top;
  if (summary) {
    const lines = f.ultra ? 2 : f.wide ? 3 : 4;
    const lead = fitted(summary, f.left, 0, colW, Math.round(body * 1.38 * lines), { maxSize: body, minSize: Math.round(body * 0.78), fontFamily: BODY, fontWeight: 500, lineHeight: 1.38 }, { color: "rgba(241,240,245,0.86)", layerName: "Zusammenfassung" });
    lead.y = Math.round(y - lead.h);
    y = lead.y - gap;
    els.push(lead);
  }
  const kickerSize = Math.round(f.s * (f.ultra ? 0.036 : 0.027));
  const kicker = opinion
    ? pill(opinionWord(article.language, article.type), f.left, 0, kickerSize, C.amber, C.ink, { layerName: "Meinung" })
    : category
      ? pill(category, f.left, 0, kickerSize, C.blue, C.ink)
      : null;
  const topLimit = f.top + (kicker ? kicker.h + gap * 0.7 : 0);
  const head = fitted(article.title, f.left, 0, colW, Math.max(f.s * 0.12, y - topLimit), { maxSize: Math.round(f.s * (f.ultra ? 0.12 : f.wide ? 0.085 : 0.078)), minSize: Math.round(f.s * 0.042), lineHeight: 1.06 }, {
    color: C.paper, layerName: "Überschrift", shadow: { color: "rgba(0,0,0,0.45)", blur: Math.round(f.s * 0.02), x: 0, y: 4 },
  });
  head.y = Math.round(y - head.h);
  els.push(head);
  if (kicker) {
    kicker.y = Math.round(head.y - gap * 0.7 - kicker.h);
    els.push(kicker);
  }

  return {
    id: uid(),
    formatId: fmt.id,
    width: w,
    height: h,
    background: {
      type: article.cover ? "image" : "gradient",
      color: C.ink,
      gradient: "radial-gradient(110% 80% at 80% 0%, #1f4583 0%, #121722 55%, #0b0d12 100%)",
      image: article.cover,
      imageFit: "cover",
      imageOpacity: 1,
    },
    elements: els,
  };
}
