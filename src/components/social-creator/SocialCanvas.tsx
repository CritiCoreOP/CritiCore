import ProxiedImg from "@/components/ProxiedImg";
import { useState } from "react";
import { Slide, CanvasElement as El } from "./types";
import CanvasElementView from "./CanvasElement";
import { snapRect, type Guides } from "./snapping";
import { scaleElements, toggleIds, unionBox, withGroup, type Patches, type Rect } from "./selection";

interface Props {
  slide: Slide;
  maxWidth: number;
  maxHeight: number;
  interactive: boolean;
  /** Selected elements; a group is always selected as a whole */
  selectedIds?: string[];
  onSelectIds?: (ids: string[]) => void;
  /** Change of one element while resizing, rotating or editing its text */
  onChange: (id: string, patch: Partial<El>) => void;
  /** Changes of several elements at once while moving or scaling the selection */
  onChangeMany?: (patches: Patches) => void;
  registerRef?: (node: HTMLDivElement | null) => void;
  time?: number | null;
  /** hide slide background so exports keep an alpha channel */
  transparent?: boolean;
  /** Text element being edited right on the canvas */
  editingId?: string | null;
  onEditingChange?: (id: string | null) => void;
  /** Shade where Instagram/TikTok put their own buttons over a story */
  showSafeZones?: boolean;
  /** Drag-select frame in slide coordinates, drawn while it is pulled open */
  marquee?: Rect | null;
}

const ACCENT = "#5c9dff";
// Instagram and TikTok cover about this much of a 9:16 story with their own interface
const SAFE_TOP = 0.13;
const SAFE_BOTTOM = 0.18;
const NO_GUIDES: Guides = { v: [], h: [] };
const CORNERS = ["nw", "ne", "se", "sw"] as const;

function track(onMove: (ev: PointerEvent) => void, onUp?: () => void) {
  const up = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", up);
    onUp?.();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", up);
}

export default function SocialCanvas({
  slide, maxWidth, maxHeight, interactive, selectedIds = [], onSelectIds, onChange, onChangeMany, registerRef, time, transparent, editingId = null, onEditingChange, showSafeZones, marquee,
}: Props) {
  const scale = Math.min(maxWidth / slide.width, maxHeight / slide.height);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);

  const bg = slide.background;
  const backgroundStyle: React.CSSProperties = transparent
    ? { background: "transparent" }
    : bg.type === "gradient"
      ? { background: bg.gradient }
      : { background: bg.color };

  const selected = slide.elements.filter((e) => selectedIds.includes(e.id) && !e.hidden);
  // One element on its own gets its own handles; several (or a group) one box around all of them
  const lone = selected.length === 1 && !selected[0].groupId ? selected[0] : null;
  const box = selected.length > 1 || (selected.length === 1 && selected[0].groupId) ? unionBox(selected) : null;

  /**
   * Pointer down on an element: Shift, Ctrl or Cmd add it to the selection or take it out, a plain
   * click selects it (its whole group), and dragging moves everything selected, snapped as one box.
   * A click without dragging on part of a larger selection narrows the selection to that part.
   */
  const press = (e: React.PointerEvent, el: El) => {
    if (!interactive || !onSelectIds) return;
    e.stopPropagation();
    const ids = withGroup(slide.elements, el.id);
    if (e.button === 2) {
      if (!ids.every((id) => selectedIds.includes(id))) onSelectIds(ids);
      return;
    }
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const inSelection = ids.every((id) => selectedIds.includes(id));
    const next = additive ? toggleIds(selectedIds, ids) : inSelection ? selectedIds : ids;
    if (next !== selectedIds) onSelectIds(next);
    if (!next.includes(el.id)) return;

    const moving = slide.elements.filter((x) => next.includes(x.id) && !x.locked);
    if (!moving.length || !onChangeMany) return;
    const start = moving.map(({ id, x, y }) => ({ id, x, y }));
    const from = unionBox(moving)!;
    const others = slide.elements.filter((x) => !next.includes(x.id) && !x.hidden).map(({ x, y, w, h }) => ({ x, y, w, h }));
    const px = e.clientX;
    const py = e.clientY;
    let moved = false;
    track(
      (ev) => {
        if (!moved && Math.hypot(ev.clientX - px, ev.clientY - py) < 3) return;
        moved = true;
        const raw = { x: from.x + (ev.clientX - px) / scale, y: from.y + (ev.clientY - py) / scale, w: from.w, h: from.h };
        const r = ev.altKey ? { x: raw.x, y: raw.y, guides: NO_GUIDES } : snapRect(raw, others, { w: slide.width, h: slide.height }, 6 / scale);
        setGuides(r.guides);
        const dx = r.x - from.x;
        const dy = r.y - from.y;
        onChangeMany(Object.fromEntries(start.map((s) => [s.id, { x: Math.round(s.x + dx), y: Math.round(s.y + dy) }])));
      },
      () => {
        setGuides(NO_GUIDES);
        if (!moved && !additive && inSelection && selectedIds.length > ids.length) onSelectIds(ids);
      },
    );
  };

  /** Corner of the selection box: scales everything in it evenly around the opposite corner */
  const beginScale = (e: React.PointerEvent, corner: (typeof CORNERS)[number]) => {
    if (!box || !onChangeMany) return;
    e.stopPropagation();
    const els = selected.filter((s) => !s.locked).map((s) => ({ ...s }));
    if (!els.length) return;
    const anchor = { x: corner.includes("w") ? box.x + box.w : box.x, y: corner.includes("n") ? box.y + box.h : box.y };
    const px = e.clientX;
    const py = e.clientY;
    track((ev) => {
      const dx = (ev.clientX - px) / scale;
      const dy = (ev.clientY - py) / scale;
      const sx = (box.w + (corner.includes("e") ? dx : -dx)) / box.w;
      const sy = (box.h + (corner.includes("s") ? dy : -dy)) / box.h;
      onChangeMany(scaleElements(els, Math.max(0.05, Math.max(sx, sy)), anchor));
    });
  };

  const tall = slide.height / slide.width > 1.6;
  const line = 1 / scale;
  const handle = 12 / scale;

  return (
    <div style={{ width: slide.width * scale, height: slide.height * scale, flex: "none" }}>
      <div style={{ width: slide.width, height: slide.height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div ref={registerRef} data-slide-surface="true" style={{ position: "relative", width: slide.width, height: slide.height, overflow: "hidden", ...backgroundStyle }}>
          {!transparent && bg.type === "image" && bg.image && (
            <ProxiedImg
              src={bg.image}
              alt=""
              draggable={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: bg.imageFit, opacity: bg.imageOpacity, pointerEvents: "none" }}
            />
          )}
          {slide.elements.filter((el) => !el.hidden).map((el) => (
            <CanvasElementView
              key={el.id}
              element={el}
              scale={scale}
              selected={selectedIds.includes(el.id)}
              handles={lone?.id === el.id}
              interactive={interactive}
              editing={editingId === el.id}
              onPress={(e) => press(e, el)}
              onChange={onChange}
              onStartEdit={(id) => {
                onSelectIds?.([id]);
                onEditingChange?.(id);
              }}
              onEndEdit={() => onEditingChange?.(null)}
              time={time}
            />
          ))}

          {interactive && box && (
            <div
              data-export-ignore="true"
              data-testid="selection-box"
              style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, outline: `${2 * line}px solid ${ACCENT}`, pointerEvents: "none" }}
            >
              {CORNERS.map((c) => (
                <div
                  key={c}
                  data-export-ignore="true"
                  onPointerDown={(e) => beginScale(e, c)}
                  style={{
                    position: "absolute",
                    width: handle,
                    height: handle,
                    left: c.includes("w") ? -handle / 2 : undefined,
                    right: c.includes("e") ? -handle / 2 : undefined,
                    top: c.includes("n") ? -handle / 2 : undefined,
                    bottom: c.includes("s") ? -handle / 2 : undefined,
                    background: "#fff",
                    border: `${1.5 * line}px solid ${ACCENT}`,
                    borderRadius: "50%",
                    cursor: `${c}-resize`,
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                />
              ))}
            </div>
          )}

          {interactive && marquee && (
            <div
              data-export-ignore="true"
              aria-hidden="true"
              style={{ position: "absolute", left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, border: `${line}px solid ${ACCENT}`, background: "rgba(92,157,255,0.12)", pointerEvents: "none" }}
            />
          )}

          {interactive && showSafeZones && tall && (
            <>
              <div data-export-ignore="true" aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: slide.height * SAFE_TOP, background: "repeating-linear-gradient(135deg, rgba(255,79,163,0.18) 0 12px, rgba(255,79,163,0.06) 12px 24px)", borderBottom: `${line * 2}px dashed #ff4fa3`, pointerEvents: "none" }} />
              <div data-export-ignore="true" aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: slide.height * SAFE_BOTTOM, background: "repeating-linear-gradient(135deg, rgba(255,79,163,0.18) 0 12px, rgba(255,79,163,0.06) 12px 24px)", borderTop: `${line * 2}px dashed #ff4fa3`, pointerEvents: "none" }} />
            </>
          )}

          {guides.v.map((x) => (
            <div key={`v${x}`} data-export-ignore="true" aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: x - line / 2, width: line, background: "#ff4fa3", pointerEvents: "none" }} />
          ))}
          {guides.h.map((y) => (
            <div key={`h${y}`} data-export-ignore="true" aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: y - line / 2, height: line, background: "#ff4fa3", pointerEvents: "none" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
