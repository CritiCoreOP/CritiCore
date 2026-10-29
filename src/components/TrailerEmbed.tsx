import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play as PlayArrowRounded } from "lucide-react";
interface TrailerEmbedProps {
  /** YouTube video key */
  videoKey: string;
  title: string;
  /** Backdrop / thumbnail image used as the poster before playback */
  thumbnail?: string | null;
  /** Start time in seconds */
  start?: number;
  /** Small label in the corner, e.g. "YouTube" for videos in articles that have no poster */
  caption?: string;
  /** Title and channel of the video, shown over the poster like on YouTube */
  videoTitle?: string | null;
  channel?: string | null;
}

/**
 * 16:9 trailer with a backdrop thumbnail and a centered violet glass play
 * button. The YouTube iframe is only mounted once the user clicks play, so
 * the page never loads the embed (or its cookies/scripts) up front.
 */
const TrailerEmbed = ({ videoKey, title, thumbnail, start, caption, videoTitle, channel }: TrailerEmbedProps) => {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState<string | null>(null);

  // No fallback to img.youtube.com: loading that preview alone contacts Google before the click.
  // Article videos get theirs from criticore.cc (youtubeThumbnailUrl); a failed one leaves the plain frame.
  const poster = thumbnail && posterFailed !== thumbnail ? thumbnail : null;

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/20 bg-muted shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0${start ? `&start=${start}` : ""}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={title}
          className="group absolute inset-0 h-full w-full"
        >
          {poster && <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setPosterFailed(poster)}
            data-testid="video-poster"
            className="h-full w-full object-cover transition-transform duration-500 ease-[var(--mcc-ease-out)] group-hover:scale-105"
          />}
          {videoTitle ? (
            <span className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-start gap-0.5 bg-gradient-to-b from-media-scrim/85 via-media-scrim/40 to-transparent px-4 pb-8 pt-3 text-left">
              <span className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-base" data-testid="video-title">{videoTitle}</span>
              <span className="text-xs text-white/75">{[caption, channel].filter(Boolean).join(" · ")}</span>
            </span>
          ) : caption && (
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-media-scrim/60 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
              {caption}
            </span>
          )}
          {/* Darkening scrim for contrast */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-media-scrim/70 via-media-scrim/20 to-media-scrim/10 transition-colors duration-300 group-hover:from-media-scrim/60" />

          {/* Violet glass play circle */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/25 text-media-scrim-foreground backdrop-blur-md transition-all duration-300 ease-[var(--mcc-ease-out)] group-hover:scale-110 group-hover:bg-primary/40 md:h-20 md:w-20"
              style={{ boxShadow: "0 8px 30px -6px hsl(var(--primary) / 0.55)" }}
            >
              {/* Lucide icons are sized by width/height; a font size leaves them at 24px */}
              <PlayArrowRounded className="h-8 w-8 translate-x-0.5 fill-current md:h-9 md:w-9" aria-hidden />
            </span>
          </span>

          {/* Said before the click, so clicking is an informed choice (the player then contacts Google) */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2 text-center text-[11px] leading-snug text-white/85">
            {t("trailer.youtubeNotice")}
          </span>
        </button>
      )}
    </div>
  );
};

export default TrailerEmbed;
