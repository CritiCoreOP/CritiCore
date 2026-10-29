/** YouTube video ids are 11 characters of A–Z, a–z, 0–9, "-" and "_" */
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export interface YouTubeVideo {
  id: string;
  /** Start time in seconds, 0 for the beginning */
  start: number;
}

const HOSTS = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

/** "90", "90s", "1m30s", "1h2m3s" → seconds */
function parseTime(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || !m[0]) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/**
 * Reads a YouTube link as people copy it: watch?v=, youtu.be/, shorts/, live/, embed/, with or
 * without https:// and with a start time (t= or start=). Anything else returns null.
 */
export function parseYouTubeUrl(input: string): YouTubeVideo | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!HOSTS.test(url.hostname)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (/youtu\.be$/i.test(url.hostname)) id = parts[0] ?? null;
  else if (parts[0] === "watch") id = url.searchParams.get("v");
  else if (["shorts", "live", "embed", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null;

  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { id, start: parseTime(url.searchParams.get("t") ?? url.searchParams.get("start")) };
}

/** Link to the video on YouTube itself, the fallback wherever the player is not shown */
export function youtubeWatchUrl({ id, start }: YouTubeVideo): string {
  return `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`;
}

/** 90 → "1:30", 3725 → "1:02:05" */
export function formatStart(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/**
 * Preview image of a video, served by criticore.cc (functions/media/yt), so showing it does not
 * contact Google before the reader clicks play.
 */
export function youtubeThumbnailUrl(id: string): string {
  return `/media/yt/${id}.jpg`;
}

export interface YouTubeMeta {
  title: string | null;
  author: string | null;
}

/** Title and channel of a video, through the same function; null when YouTube does not know it */
export async function fetchYouTubeMeta(id: string, fetchFn: typeof fetch = fetch): Promise<YouTubeMeta | null> {
  if (!YOUTUBE_ID.test(id)) return null;
  try {
    const res = await fetchFn(`/media/yt/${id}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: unknown; author?: unknown; author_name?: unknown };
    // The dev server passes YouTube's oEmbed answer through, which names the channel author_name
    const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);
    const meta = { title: text(data.title), author: text(data.author ?? data.author_name) };
    return meta.title ? meta : null;
  } catch {
    return null;
  }
}
