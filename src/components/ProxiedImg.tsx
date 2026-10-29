import type { ImgHTMLAttributes } from "react";
import { useProxiedSrc } from "@/lib/graphicExport";

/**
 * <img> for graphics that get exported: pictures from other hosts load through the image proxy
 * as data URLs (see useProxiedSrc); nothing is shown until the picture is there.
 */
export default function ProxiedImg({ src, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const resolved = useProxiedSrc(src);
  return resolved ? <img src={resolved} {...rest} /> : null;
}
