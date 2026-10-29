import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import TrailerEmbed from "@/components/TrailerEmbed";
import { fetchYouTubeMeta, YOUTUBE_ID, youtubeThumbnailUrl } from "@/lib/youtube";

interface ArticleHtmlProps {
  /** Already sanitized article HTML */
  html: string;
  className?: string;
}

interface Video {
  el: HTMLElement;
  id: string;
  start: number;
  title: string | null;
  author: string | null;
}

/** Player with the preview from criticore.cc; videos stored before titles were saved fetch theirs */
function ArticleVideo({ video }: { video: Video }) {
  const { t } = useTranslation();
  const [meta, setMeta] = useState({ title: video.title, author: video.author });
  useEffect(() => {
    if (video.title) return;
    let cancelled = false;
    void fetchYouTubeMeta(video.id).then((m) => {
      if (m && !cancelled) setMeta(m);
    });
    return () => {
      cancelled = true;
    };
  }, [video.id, video.title]);
  return (
    <TrailerEmbed
      videoKey={video.id}
      start={video.start}
      title={t("article.video.title")}
      caption={t("article.video.caption")}
      thumbnail={youtubeThumbnailUrl(video.id)}
      videoTitle={meta.title}
      channel={meta.author}
    />
  );
}

/**
 * Article body. Videos are stored as a placeholder with a plain YouTube link; here that link is
 * swapped for the click-to-play player, so a reader's browser contacts YouTube only after the click.
 */
export default function ArticleHtml({ html, className }: ArticleHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<Video[]>([]);

  useLayoutEffect(() => {
    const found = [...(ref.current?.querySelectorAll<HTMLElement>(".video-embed[data-youtube-id]") ?? [])].flatMap((el) => {
      const id = el.getAttribute("data-youtube-id") ?? "";
      if (!YOUTUBE_ID.test(id)) return [];
      el.replaceChildren();
      el.classList.add("not-prose");
      return [{
        el,
        id,
        start: Number(el.getAttribute("data-start")) || 0,
        title: el.getAttribute("data-title"),
        author: el.getAttribute("data-author"),
      }];
    });
    setVideos(found);
  }, [html]);

  return (
    <>
      <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />
      {videos.map((v, i) => createPortal(<ArticleVideo video={v} />, v.el, `${v.id}-${i}`))}
    </>
  );
}
