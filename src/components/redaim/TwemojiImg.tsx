import { useRef, useEffect } from "react";
import twemoji from "@twemoji/api";

/** Render a single emoji as Twemoji SVG <img> */
export default function TwemojiImg({ emoji, size = 22 }: { emoji: string; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = emoji;
      twemoji.parse(ref.current, {
        folder: "svg",
        ext: ".svg",
        base: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/",
      });
      const img = ref.current.querySelector("img");
      if (img) {
        img.style.width = `${size}px`;
        img.style.height = `${size}px`;
        img.style.display = "inline-block";
        img.style.verticalAlign = "middle";
        img.draggable = false;
      }
    }
  }, [emoji, size]);
  return <span ref={ref} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }} />;
}
