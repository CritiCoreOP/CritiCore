/**
 * Shrinks pictures in the browser before they are uploaded. Phone photos of 4000 px and several MB
 * were stored as they came, and every visit downloaded them in full (Supabase egress): 28 of the
 * first 70 article pictures were over 1 MB, one avatar 5 MB.
 *
 * JPEG, PNG and WebP larger than `maxSize` on the long side or heavier than `minBytes` are scaled
 * down and saved as WebP (transparency stays). GIFs (animation), SVGs and anything the browser
 * cannot decode are uploaded unchanged, and so is the original whenever the result is not smaller.
 */
const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp"];

export interface CompressOptions {
  /** Longest side in pixels */
  maxSize?: number;
  /** WebP/JPEG quality, 0..1 */
  quality?: number;
  /** Files below this size that already fit are left alone */
  minBytes?: number;
}

/** The long side of article pictures: covers and inline images are shown at most ~1600 px wide */
export const ARTICLE_IMAGE = { maxSize: 2048, quality: 0.85 } satisfies CompressOptions;
/** Avatars and community icons are shown at most ~160 px */
export const AVATAR_IMAGE = { maxSize: 512, quality: 0.85, minBytes: 100 * 1024 } satisfies CompressOptions;

function toBlob(canvas: HTMLCanvasElement | OffscreenCanvas, type: string, quality: number): Promise<Blob | null> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality }).catch(() => null);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File, { maxSize = 2048, quality = 0.85, minBytes = 300 * 1024 }: CompressOptions = {}): Promise<File> {
  if (!COMPRESSIBLE.includes(file.type) || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, so portrait phone photos do not end up lying on their side
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const long = Math.max(bitmap.width, bitmap.height);
    if (long <= maxSize && file.size < minBytes) return file;
    const scale = Math.min(1, maxSize / long);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas === "function" ? new OffscreenCanvas(width, height) : Object.assign(document.createElement("canvas"), { width, height });
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    let blob = await toBlob(canvas, "image/webp", quality);
    // Older Safari cannot write WebP and hands back a PNG; JPEG is the smaller fallback for photos
    if (blob && blob.type !== "image/webp" && file.type === "image/jpeg") blob = await toBlob(canvas, "image/jpeg", quality);
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
    const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.${ext}`;
    return new File([blob], name, { type: blob.type, lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
