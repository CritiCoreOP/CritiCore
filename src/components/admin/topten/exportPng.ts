import { useEffect, useState } from "react";
import { downloadBlob, pictureDataUrl, renderPngBlob } from "@/lib/graphicExport";

/** Resolves every cover URL to a data URL; `pending` is true while some are still loading */
export function useGraphicPictures(urls: string[]) {
  const [resolved, setResolved] = useState<Record<string, string | null>>({});
  const key = urls.join("\n");
  useEffect(() => {
    let cancelled = false;
    for (const url of new Set(urls)) {
      void pictureDataUrl(url).then((data) => {
        if (!cancelled) setResolved((r) => (r[url] === data ? r : { ...r, [url]: data }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = urls.some((u) => !(u in resolved));
  return { resolved, pending };
}

/** Renders the node at its own pixel size; only the fonts it uses are embedded */
export const renderGraphic = renderPngBlob;

/** Renders the node and downloads it as PNG */
export async function exportGraphic(node: HTMLElement, filename: string) {
  downloadBlob(await renderPngBlob(node), filename);
}
