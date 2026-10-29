import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Equal } from "lucide-react";
import criticoreLogo from "@/assets/criticore-full.png";
import { ACCENTS, filledEntries, FORMATS, NEW_LABEL, numericValue, type TopTenData, type TopTenEntry, type TopTenFormat } from "./types";

const DISPLAY = "'Glacial Indifference', Inter, system-ui, sans-serif";
const BODY = "Inter, system-ui, sans-serif";
const BG = "#14161d";
const INK = "#eef0f7";
const MUTED = "#9aa0b4";
const UP = "#3ecf8e";
const DOWN = "#f0596b";

/** Sizes per format; the list rows share whatever height is left */
const LAYOUT: Record<TopTenFormat, { pad: number; title: number; hero: number; tile: number; listRows: number; gap: number; scale: number }> = {
  portrait: { pad: 60, title: 70, hero: 236, tile: 200, listRows: 7, gap: 16, scale: 1 },
  story: { pad: 72, title: 92, hero: 430, tile: 300, listRows: 7, gap: 22, scale: 1.3 },
  square: { pad: 56, title: 62, hero: 290, tile: 224, listRows: 2, gap: 16, scale: 1 },
  landscape: { pad: 56, title: 64, hero: 330, tile: 230, listRows: 7, gap: 16, scale: 1 },
};

const clamp = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

function TrendChip({ entry, lang, size }: { entry: TopTenEntry; lang: string; size: number }) {
  if (!entry.trend || entry.trend === "none") return null;
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: size * 0.25,
    height: size * 1.7,
    padding: `0 ${size * 0.6}px`,
    borderRadius: 999,
    fontFamily: BODY,
    fontSize: size,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
  if (entry.trend === "new") {
    return <span style={{ ...base, background: "rgba(255,255,255,0.12)", color: INK, letterSpacing: "0.06em" }}>{NEW_LABEL[lang] ?? NEW_LABEL.en}</span>;
  }
  if (entry.trend === "same") {
    return (
      <span style={{ ...base, background: "rgba(255,255,255,0.08)", color: MUTED }}>
        <Equal size={size * 1.1} strokeWidth={2.5} />
      </span>
    );
  }
  const up = entry.trend === "up";
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span style={{ ...base, background: up ? "rgba(62,207,142,0.14)" : "rgba(240,89,107,0.14)", color: up ? UP : DOWN }}>
      <Icon size={size * 1.05} strokeWidth={2.75} />
      {Math.max(1, entry.trendBy)}
    </span>
  );
}

/** Picture with a dark fade, the base of the big tiles */
function Picture({ src, fade, children, radius }: { src: string | null; fade: string; children: ReactNode; radius: number }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: radius, background: "#232634", height: "100%" }}>
      {src && <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <div style={{ position: "absolute", inset: 0, background: fade }} />
      <div style={{ position: "relative", height: "100%" }}>{children}</div>
    </div>
  );
}

function Title({ text, accent, size }: { text: string; accent: string; size: number }) {
  // "Top 10 Anime der Woche": the count in the accent colour, the rest in white
  const m = text.match(/^(top\s*\d+)\s+(.+)$/i);
  return (
    <div style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: "-0.02em", color: INK, ...clamp(2) }}>
      {m ? (
        <>
          <span style={{ color: accent }}>{m[1]}</span> {m[2]}
        </>
      ) : (
        text
      )}
    </div>
  );
}

interface Props {
  data: TopTenData;
  format: TopTenFormat;
  /** Cover URL → data URL (useGraphicPictures); covers not loaded yet stay empty */
  pictures: Record<string, string | null>;
}

/**
 * The graphic at its real pixel size (1080 × 1350 and so on); the page scales it down for the
 * preview and html-to-image exports this node. Inline styles, so the export does not depend on
 * the site's theme classes.
 */
const TopTenCanvas = forwardRef<HTMLDivElement, Props>(({ data, format, pictures }, ref) => {
  const pic = (url: string | null | undefined) => (!url ? null : url.startsWith("data:") ? url : (pictures[url] ?? null));
  const { width, height } = FORMATS[format];
  const L = LAYOUT[format];
  const accent = ACCENTS[data.accent];
  const entries = filledEntries(data);
  const [first, second, third, ...rest] = entries;
  const list = rest.slice(0, L.listRows);
  const values = entries.map((e) => numericValue(e.value)).filter((v): v is number => v !== null);
  const max = values.length ? Math.max(...values) : null;
  const s = L.scale;
  const landscape = format === "landscape";
  const heroBg = pic(first?.backdrop ?? first?.poster ?? null);
  const showValues = data.showValues !== false;
  const showTrends = data.showTrends !== false;
  const glow = data.background !== "plain";

  const header = (
    <header style={{ display: "flex", flexDirection: "column", gap: 18 * s }}>
      <img src={criticoreLogo} alt="CritiCore" style={{ height: 40 * s, width: "auto", alignSelf: "flex-start" }} />
      <Title text={data.title || "Top 10"} accent={accent} size={L.title} />
      {data.period && <p style={{ margin: 0, fontFamily: BODY, fontSize: 24 * s, color: MUTED, fontWeight: 500 }}>{data.period}</p>}
    </header>
  );

  const hero = first && (
    <div style={{ height: L.hero }}>
      <Picture src={heroBg} radius={28 * s} fade={`linear-gradient(90deg, ${BG} 0%, rgba(20,22,29,0.88) 38%, rgba(20,22,29,0.15) 100%)`}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 * s, height: "100%", padding: `0 ${40 * s}px` }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: L.hero * 0.62, lineHeight: 0.8, color: accent }}>1</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 * s, maxWidth: "62%" }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 46 * s, lineHeight: 1.05, color: INK, ...clamp(2) }}>{first.title}</span>
            {first.subtitle && <span style={{ fontFamily: BODY, fontSize: 22 * s, color: MUTED, ...clamp(1) }}>{first.subtitle}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 16 * s, marginTop: 6 * s }}>
              {showValues && first.value && <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 40 * s, color: INK }}>{first.value}</span>}
              {showTrends && <TrendChip entry={first} lang={data.lang} size={17 * s} />}
            </div>
          </div>
        </div>
      </Picture>
    </div>
  );

  const tile = (entry: TopTenEntry, rank: number) => (
    <Picture
      key={entry.id}
      src={pic(entry.backdrop ?? entry.poster)}
      radius={24 * s}
      fade={`linear-gradient(0deg, ${BG} 4%, rgba(20,22,29,0.7) 45%, rgba(20,22,29,0.1) 100%)`}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: 22 * s }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 60 * s, lineHeight: 0.85, color: accent }}>{rank}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 * s }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30 * s, lineHeight: 1.08, color: INK, ...clamp(2) }}>{entry.title}</span>
          {entry.subtitle && <span style={{ fontFamily: BODY, fontSize: 18 * s, color: MUTED, ...clamp(1) }}>{entry.subtitle}</span>}
          <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
            {showValues && entry.value && <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26 * s, color: INK }}>{entry.value}</span>}
            {showTrends && <TrendChip entry={entry} lang={data.lang} size={14 * s} />}
          </div>
        </div>
      </div>
    </Picture>
  );

  const tiles = second && (
    <div style={{ display: "grid", gridTemplateColumns: third ? "1fr 1fr" : "1fr", gap: L.gap, height: L.tile }}>
      {tile(second, 2)}
      {third && tile(third, 3)}
    </div>
  );

  const rows = list.length > 0 && (
    <div style={{ display: "grid", gridAutoRows: "1fr", gap: 8 * s, flex: 1, minHeight: 0 }}>
      {list.map((entry, i) => {
        const v = numericValue(entry.value);
        const share = showValues && max && v !== null && max > 0 ? Math.max(0.04, v / max) : null;
        return (
          <div
            key={entry.id}
            style={{
              display: "grid",
              gridTemplateColumns: `${56 * s}px auto minmax(0,1fr) auto`,
              alignItems: "center",
              gap: 18 * s,
              padding: `0 ${18 * s}px 0 ${8 * s}px`,
              borderRadius: 18 * s,
              background: "rgba(255,255,255,0.045)",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 36 * s, color: INK, textAlign: "center" }}>{i + 4}</span>
            <div style={{ height: "78%", aspectRatio: "2 / 3", borderRadius: 10 * s, overflow: "hidden", background: "#2a2e3d" }}>
              {(entry.poster || entry.backdrop) && (
                <img src={pic(entry.poster ?? entry.backdrop) ?? undefined} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 * s }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 25 * s, lineHeight: 1.1, color: INK, ...clamp(1) }}>
                {entry.title}
                {entry.subtitle && share !== null && <span style={{ fontFamily: BODY, fontWeight: 400, fontSize: 18 * s, color: MUTED }}> {entry.subtitle}</span>}
              </span>
              {share !== null ? (
                // Length of the line = value compared with the leader; no track behind it
                <span style={{ height: 4 * s, width: `${share * 100}%`, borderRadius: 4, background: accent, opacity: 0.85 }} />
              ) : (
                entry.subtitle && <span style={{ fontFamily: BODY, fontSize: 17 * s, color: MUTED, ...clamp(1) }}>{entry.subtitle}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
              {showValues && entry.value && <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24 * s, color: INK, fontVariantNumeric: "tabular-nums" }}>{entry.value}</span>}
              {showTrends && <TrendChip entry={entry} lang={data.lang} size={13 * s} />}
            </div>
          </div>
        );
      })}
    </div>
  );

  const footer = (
    <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, fontFamily: BODY, fontSize: 19 * s, color: MUTED }}>
      <span style={{ ...clamp(1) }}>{data.footer}</span>
      <span style={{ color: INK, fontWeight: 600, whiteSpace: "nowrap" }}>criticore.cc</span>
    </footer>
  );

  return (
    <div
      ref={ref}
      data-testid="topten-canvas"
      style={{ position: "relative", width, height, overflow: "hidden", background: BG, color: INK, fontFamily: BODY }}
    >
      {/* The leader's picture as a soft glow behind the header */}
      {glow && heroBg && (
        <img
          src={heroBg}
          alt=""
         
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: landscape ? "100%" : "55%", objectFit: "cover", filter: "blur(60px) saturate(1.3)", opacity: 0.32, transform: "scale(1.2)" }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 60% at 0% 0%, ${accent}22, transparent 60%), linear-gradient(180deg, rgba(20,22,29,0.2) 0%, ${BG} ${landscape ? "85%" : "48%"})` }} />

      {landscape ? (
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 40, height: "100%", padding: L.pad }}>
          <div style={{ display: "flex", flexDirection: "column", gap: L.gap, minHeight: 0 }}>
            {header}
            <div style={{ flex: 1 }} />
            {hero}
            {tiles}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: L.gap, minHeight: 0 }}>
            {rows || <div style={{ flex: 1 }} />}
            {footer}
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: L.gap, height: "100%", padding: L.pad }}>
          {header}
          <div style={{ height: 6 * s }} />
          {hero}
          {tiles}
          {rows || <div style={{ flex: 1 }} />}
          {footer}
        </div>
      )}
    </div>
  );
});
TopTenCanvas.displayName = "TopTenCanvas";

export default TopTenCanvas;
