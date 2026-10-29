import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE } from "@/lib/compressImage";

export interface SocialAsset {
  id: string;
  name: string;
  path: string;
  kind: "image" | "video";
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  url: string;
}

const BUCKET = "social-assets";
const SIGN_TTL = 60 * 60 * 24 * 7; // 7 days
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const probeImage = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

export function useSocialAssets() {
  const [assets, setAssets] = useState<SocialAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("social_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      setAssets([]);
      setLoading(false);
      return;
    }

    const signed = data.length
      ? await supabase.storage.from(BUCKET).createSignedUrls(data.map((a) => a.path), SIGN_TTL)
      : { data: [] as { path: string | null; signedUrl: string }[] };

    const urlByPath = new Map<string, string>();
    (signed.data || []).forEach((s) => {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    });

    setAssets(
      data.map((a) => ({ ...a, kind: a.kind === "video" ? "video" : "image", url: urlByPath.get(a.path) || "" })) as SocialAsset[],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Uploads one file and returns an error message, or null on success. */
  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) return "unsupported";
      if (isImage && file.size > MAX_IMAGE_BYTES) return "tooLargeImage";
      if (isVideo && file.size > MAX_VIDEO_BYTES) return "tooLargeVideo";

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return "notSignedIn";

      setUploading(true);
      try {
        file = await compressImage(file, ARTICLE_IMAGE);
        const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) return upErr.message;

        const dims = isImage ? await probeImage(file) : { width: 0, height: 0 };

        const { error: dbErr } = await supabase.from("social_assets").insert({
          user_id: userId,
          name: file.name.slice(0, 120),
          path,
          kind: isVideo ? "video" : "image",
          mime_type: file.type,
          size_bytes: file.size,
          width: dims.width || null,
          height: dims.height || null,
        });
        if (dbErr) {
          await supabase.storage.from(BUCKET).remove([path]);
          return dbErr.message;
        }

        await load();
        return null;
      } finally {
        setUploading(false);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (asset: SocialAsset) => {
      await supabase.storage.from(BUCKET).remove([asset.path]);
      await supabase.from("social_assets").delete().eq("id", asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    },
    [],
  );

  const rename = useCallback(async (asset: SocialAsset, name: string) => {
    const clean = name.trim().slice(0, 120);
    if (!clean) return;
    await supabase.from("social_assets").update({ name: clean }).eq("id", asset.id);
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, name: clean } : a)));
  }, []);

  return { assets, loading, uploading, upload, remove, rename, reload: load };
}

/** Grabs a frame from a video URL as a data URL (used to place video stills on the canvas). */
export async function captureVideoFrame(url: string, atSeconds = 0.1): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    const done = (result: string | null) => {
      video.removeAttribute("src");
      resolve(result);
    };
    video.onloadeddata = () => {
      video.currentTime = Math.min(atSeconds, video.duration || atSeconds);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return done(null);
        ctx.drawImage(video, 0, 0);
        done(canvas.toDataURL("image/png"));
      } catch {
        done(null);
      }
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}
