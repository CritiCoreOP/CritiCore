/**
 * Image optimisation helpers for Supabase Storage.
 *
 * Uses the Supabase render/image endpoint which resizes + re-encodes
 * on the fly.  Falls back to the original URL for non-Supabase images.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface ImageOptions {
  /** Target width in CSS pixels (height auto) */
  width?: number;
  /** JPEG/WebP quality 1-100 (default 75) */
  quality?: number;
  /** Resize mode */
  resize?: "cover" | "contain" | "fill";
  /** Output format */
  format?: "origin" | "avif" | "webp";
}

/**
 * Returns an optimised Supabase Storage URL using the render endpoint.
 * Non-Supabase URLs are returned unchanged.
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  opts: ImageOptions = {},
): string {
  if (!url) return "";

  // Only transform Supabase Storage URLs
  if (!SUPABASE_URL || !url.includes(SUPABASE_URL)) return url;

  // Already a render URL → don't double-transform
  if (url.includes("/render/image/")) return url;

  // Extract the path after /storage/v1/object/public/
  const marker = "/storage/v1/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const storagePath = url.slice(idx + marker.length);

  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.quality) params.set("quality", String(opts.quality));
  if (opts.resize) params.set("resize", opts.resize);
  if (opts.format) params.set("format", opts.format);

  const qs = params.toString();
  return `${SUPABASE_URL}/storage/v1/render/image/public/${storagePath}${qs ? `?${qs}` : ""}`;
}

/** Preset: post thumbnail in feed (small) */
export const thumbUrl = (url: string | null | undefined) =>
  optimizeImageUrl(url, { width: 160, quality: 70, format: "webp" });

/** Preset: post detail image (medium) */
export const detailUrl = (url: string | null | undefined) =>
  optimizeImageUrl(url, { width: 800, quality: 80, format: "webp" });

/** Preset: community icon (tiny) */
export const iconUrl = (url: string | null | undefined) =>
  optimizeImageUrl(url, { width: 64, quality: 75, format: "webp" });

/** Preset: community banner (wide) */
export const bannerUrl = (url: string | null | undefined) =>
  optimizeImageUrl(url, { width: 1200, quality: 75, format: "webp" });

/** Preset: avatar (small square) */
export const avatarUrl = (url: string | null | undefined) =>
  optimizeImageUrl(url, { width: 96, quality: 75, format: "webp" });
