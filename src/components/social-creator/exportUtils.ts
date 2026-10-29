import JSZip from "jszip";
import { downloadBlob, renderPngBlob, renderPngDataUrl } from "@/lib/graphicExport";

export { downloadBlob };

// Only the fonts the slide uses get embedded (src/lib/graphicExport); before, every web font of the
// site was fetched and inlined on each export, and on every single frame of a video
export const nodeToPngBlob = renderPngBlob;

export async function exportNodeAsPng(node: HTMLElement, filename: string) {
  const blob = await nodeToPngBlob(node);
  downloadBlob(blob, filename);
}

export async function exportPackAsZip(
  nodes: { node: HTMLElement; name: string }[],
  zipName: string,
) {
  const zip = new JSZip();
  for (let i = 0; i < nodes.length; i++) {
    const blob = await nodeToPngBlob(nodes[i].node);
    zip.file(nodes[i].name, blob);
  }
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, zipName);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function pickVideoMime(): { mime: string; ext: string } {
  const candidates: { mime: string; ext: string }[] = [
    { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "video/webm", ext: "webm" };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Renders an animated slide to a downloadable video.
 * 1. Pre-renders every frame to an image at full resolution.
 * 2. Plays the frames back in real time into a recorded canvas stream so the
 *    resulting video has the correct duration regardless of render speed.
 */
export async function exportSlideAsVideo(opts: {
  node: HTMLElement;
  width: number;
  height: number;
  durationMs: number;
  fps?: number;
  baseName: string;
  setTime: (t: number | null) => Promise<void>;
  onProgress?: (phase: "render" | "encode", ratio: number) => void;
}): Promise<void> {
  const { node, width, height, durationMs, baseName, setTime, onProgress } = opts;
  const fps = opts.fps ?? 24;
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

  // Phase 1 — pre-render every frame to an image.
  const frames: HTMLImageElement[] = [];
  for (let f = 0; f < totalFrames; f++) {
    const t = (f / fps) * 1000;
    await setTime(t);
    const dataUrl = await renderPngDataUrl(node, { warm: f === 0 });
    frames.push(await loadImage(dataUrl));
    onProgress?.("render", (f + 1) / totalFrames);
  }
  await setTime(null);

  // Phase 2 — play frames back in real time into a recorded canvas.
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(frames[0], 0, 0, width, height);

  const stream = canvas.captureStream(fps);
  const { mime, ext } = pickVideoMime();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start();
  const frameDelay = 1000 / fps;
  for (let f = 0; f < totalFrames; f++) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(frames[f], 0, 0, width, height);
    onProgress?.("encode", (f + 1) / totalFrames);
    await wait(frameDelay);
  }
  // Hold the last frame briefly so the final frame is captured.
  await wait(frameDelay * 2);
  recorder.stop();
  const blob = await stopped;
  downloadBlob(blob, `${baseName}.${ext}`);
}


/* -------------------------------------------------------------------------- */
/*  Transparent video export (MKV / ProRes 4444, alpha channel preserved)     */
/* -------------------------------------------------------------------------- */

const FFMPEG_CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

async function getFFmpeg(onLog?: (msg: string) => void) {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ff = new FFmpeg();
      ff.on("log", ({ message }) => onLog?.(message));
      await ff.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })().catch((e) => { ffmpegPromise = null; throw e; });
  }
  return ffmpegPromise;
}

async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Renders an animated slide to a transparent video.
 *
 * The slide is captured as a sequence of RGBA PNG frames (the caller hides the
 * slide background so the frames keep their alpha channel), which are then
 * encoded with ffmpeg.wasm to Matroska using ProRes 4444 (yuva444p10le), an
 * intermediate codec every NLE (Premiere, Resolve, Final Cut) reads with a
 * working alpha channel.
 */
export async function exportSlideAsTransparentVideo(opts: {
  node: HTMLElement;
  width: number;
  height: number;
  durationMs: number;
  fps?: number;
  baseName: string;
  setTime: (t: number | null) => Promise<void>;
  onProgress?: (phase: "render" | "encode", ratio: number) => void;
}): Promise<void> {
  const { node, width, height, durationMs, baseName, setTime, onProgress } = opts;
  const fps = opts.fps ?? 24;
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

  // Load the encoder while the frames are being rendered.
  const ffmpegReady = getFFmpeg();

  const framePaths: string[] = [];
  const frameBytes: Uint8Array[] = [];
  for (let f = 0; f < totalFrames; f++) {
    await setTime((f / fps) * 1000);
    const dataUrl = await renderPngDataUrl(node, { warm: f === 0 });
    frameBytes.push(await dataUrlToBytes(dataUrl));
    framePaths.push(`f${String(f).padStart(5, "0")}.png`);
    onProgress?.("render", (f + 1) / totalFrames);
  }
  await setTime(null);

  const ff = await ffmpegReady;
  const outName = `${baseName}.mkv`;
  try {
    for (let f = 0; f < totalFrames; f++) {
      await ff.writeFile(framePaths[f], frameBytes[f]);
      onProgress?.("encode", ((f + 1) / totalFrames) * 0.3);
    }

    const onProg = ({ progress }: { progress: number }) =>
      onProgress?.("encode", 0.3 + Math.min(1, Math.max(0, progress)) * 0.7);
    ff.on("progress", onProg);

    // ProRes 4444: 10-bit YUV + alpha, "apl0" vendor tag for max NLE compatibility.
    await ff.exec([
      "-framerate", String(fps),
      "-i", "f%05d.png",
      "-c:v", "prores_ks",
      "-profile:v", "4444",
      "-pix_fmt", "yuva444p10le",
      "-alpha_bits", "16",
      "-vendor", "apl0",
      "-quant_mat", "hq",
      "-s", `${width}x${height}`,
      outName,
    ]);
    ff.off("progress", onProg);

    const data = await ff.readFile(outName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    downloadBlob(new Blob([buffer], { type: "video/x-matroska" }), outName);
  } finally {
    for (const p of framePaths) { try { await ff.deleteFile(p); } catch { /* ignore */ } }
    try { await ff.deleteFile(outName); } catch { /* ignore */ }
  }
}
