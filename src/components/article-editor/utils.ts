import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE } from "@/lib/compressImage";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Checks type and size before uploading. Returns the i18n key of the error, or null. */
export function imageFileError(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "article.imageInvalid";
  if (file.size > MAX_IMAGE_BYTES) return "article.imageTooLarge";
  return null;
}

/** Uploads to the article-images bucket under the user's folder and returns the public URL. */
export async function uploadArticleImage(original: File, userId: string): Promise<string | null> {
  const file = await compressImage(original, ARTICLE_IMAGE);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("article-images").upload(path, file, { contentType: file.type });
  if (error) {
    console.error("Article image upload failed:", error.message);
    return null;
  }
  return supabase.storage.from("article-images").getPublicUrl(path).data.publicUrl;
}

/**
 * Accepts only http(s) (and optionally mailto) links and adds https:// to bare domains.
 * Anything else, e.g. javascript: URLs, returns null.
 */
export function normalizeUrl(input: string, { allowMailto = false } = {}): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol === "http:" || url.protocol === "https:") return url.host ? url.href : null;
    if (allowMailto && url.protocol === "mailto:") return url.href;
    return null;
  } catch {
    return null;
  }
}
