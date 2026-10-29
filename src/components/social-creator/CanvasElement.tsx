import ProxiedImg from "@/components/ProxiedImg";
import { useEffect, useRef } from "react";
import { icons } from "lucide-react";
import { CanvasElement as El } from "./types";
import { computeAnim } from "./animations";
import { effectStyle } from "./effects";
import { snapAngle } from "./snapping";

interface Props {
  element: El;
  scale: number;
  /** Part of the selection: drawn with an outline */
  selected: boolean;
  /** The only thing selected: resize and rotate handles */
  handles: boolean;
  interactive: boolean;
  editing: boolean;
  /** Pointer down on the element; the canvas selects and moves (see SocialCanvas) */
  onPress: (e: React.PointerEvent) => void;
  onChange: (id: string, patch: Partial<El>) => void;
  onStartEdit?: (id: string) => void;
  onEndEdit?: () => void;
  time?: number | null;
}

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const ACCENT = "#5c9dff";
const MIN = 16;

export default function CanvasElementView({ element, scale, selected, handles, interactive, editing, onPress, onChange, onStartEdit, onEndEdit, time }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canMove = interactive && !element.locked && !editing;

  // Put the caret at the end of the text when editing starts
  useEffect(() => {
    if (!editing || !textRef.current) return;
    const node = textRef.current;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  const track = (onMove: (ev: PointerEvent) => void) => {
    const up = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", up);
  };

  const beginResize = (e: React.PointerEvent, handle: Handle) => {
    if (!canMove) return;
    e.stopPropagation();
    const o = { ...element };
    const px = e.clientX;
    const py = e.clientY;
    // Handles follow the element's rotation; move the pointer delta into the element's own axes
    const rad = ((o.rotation ?? 0) * Math.PI) / 180;
    track((ev) => {
      const sx = (ev.clientX - px) / scale;
      const sy = (ev.clientY - py) / scale;
      const dx = sx * Math.cos(rad) + sy * Math.sin(rad);
      const dy = -sx * Math.sin(rad) + sy * Math.cos(rad);
      let { x, y, w, h } = o;
      if (handle.includes("e")) w = Math.max(MIN, o.w + dx);
      if (handle.includes("s")) h = Math.max(MIN, o.h + dy);
      if (handle.includes("w")) { w = Math.max(MIN, o.w - dx); x = o.x + (o.w - w); }
      if (handle.includes("n")) { h = Math.max(MIN, o.h - dy); y = o.y + (o.h - h); }
      // Corners with Shift keep the proportions
      if (ev.shiftKey && handle.length === 2) {
        const ratio = o.w / o.h;
        if (w / h > ratio) w = h * ratio;
        else h = w / ratio;
        if (handle.includes("w")) x = o.x + (o.w - w);
        if (handle.includes("n")) y = o.y + (o.h - h);
      }
      onChange(element.id, { x, y, w, h } as Partial<El>);
    });
  };

  const beginRotate = (e: React.PointerEvent) => {
    if (!canMove || !wrapRef.current) return;
    e.stopPropagation();
    const box = wrapRef.current.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    track((ev) => {
      const deg = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      onChange(element.id, { rotation: snapAngle(deg, ev.altKey) } as Partial<El>);
    });
  };

  const finishEdit = () => {
    const text = textRef.current?.innerText.replace(/\n$/, "") ?? "";
    if (element.type === "text" && text !== element.text) onChange(element.id, { text } as Partial<El>);
    onEndEdit?.();
  };

  const anim = computeAnim(element.anim, time != null ? time : null);
  const baseTransform = element.rotation ? `rotate(${element.rotation}deg)` : "";
  const transform = [anim.transform, baseTransform].filter(Boolean).join(" ") || undefined;
  const handle = 12 / scale;

  return (
    <div
      ref={wrapRef}
      data-element-id={element.id}
      className="group/el"
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        transform,
        transformOrigin: "center center",
        opacity: (element.opacity ?? 1) * anim.opacity,
        cursor: editing ? "text" : canMove ? "move" : "default",
        userSelect: editing ? "text" : "none",
        touchAction: "none",
      }}
      onPointerDown={editing ? (e) => e.stopPropagation() : onPress}
      onDoubleClick={(e) => {
        if (!interactive || element.type !== "text" || element.locked) return;
        e.stopPropagation();
        onStartEdit?.(element.id);
      }}
    >
      {element.type === "text" ? (
        <TextBody el={element} editing={editing} textRef={textRef} onFinish={finishEdit} />
      ) : (
        renderInner(element)
      )}
      {interactive && !selected && (
        // Hover outline, as in Canva: shows what a click would pick
        <div
          data-export-ignore="true"
          aria-hidden="true"
          className="opacity-0 transition-opacity group-hover/el:opacity-100"
          style={{ position: "absolute", inset: 0, outline: `${1.5 / scale}px solid ${ACCENT}`, pointerEvents: "none" }}
        />
      )}
      {interactive && selected && (
        <>
          <div
            data-export-ignore="true"
            style={{ position: "absolute", inset: 0, outline: `${(handles ? 2 : 1.5) / scale}px ${handles ? "solid" : "dashed"} ${ACCENT}`, pointerEvents: "none" }}
          />
          {handles && !element.locked && !editing && (
            <>
              {HANDLES.map((hd) => {
                const corner = hd.length === 2;
                const w = corner ? handle : hd === "n" || hd === "s" ? handle * 1.8 : handle * 0.7;
                const h = corner ? handle : hd === "e" || hd === "w" ? handle * 1.8 : handle * 0.7;
                return (
                  <div
                    key={hd}
                    data-export-ignore="true"
                    onPointerDown={(e) => beginResize(e, hd)}
                    style={{
                      position: "absolute",
                      width: w,
                      height: h,
                      background: "#fff",
                      border: `${1.5 / scale}px solid ${ACCENT}`,
                      borderRadius: corner ? "50%" : handle,
                      left: hd.includes("w") ? -w / 2 : hd === "n" || hd === "s" ? `calc(50% - ${w / 2}px)` : undefined,
                      right: hd.includes("e") ? -w / 2 : undefined,
                      top: hd.includes("n") ? -h / 2 : hd === "e" || hd === "w" ? `calc(50% - ${h / 2}px)` : undefined,
                      bottom: hd.includes("s") ? -h / 2 : undefined,
                      cursor: `${hd}-resize`,
                      touchAction: "none",
                    }}
                  />
                );
              })}
              {/* Rotation: a handle on a short stalk above the top edge */}
              <div
                data-export-ignore="true"
                style={{ position: "absolute", left: "50%", top: -28 / scale, width: 1.5 / scale, height: 22 / scale, background: ACCENT, transform: "translateX(-50%)", pointerEvents: "none" }}
              />
              <div
                data-export-ignore="true"
                data-testid="rotate-handle"
                onPointerDown={beginRotate}
                style={{
                  position: "absolute",
                  left: `calc(50% - ${handle * 0.65}px)`,
                  top: -28 / scale - handle * 1.3,
                  width: handle * 1.3,
                  height: handle * 1.3,
                  borderRadius: "50%",
                  background: ACCENT,
                  border: `${2 / scale}px solid #fff`,
                  cursor: "grab",
                  touchAction: "none",
                }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function TextBody({ el, editing, textRef, onFinish }: { el: Extract<El, { type: "text" }>; editing: boolean; textRef: React.RefObject<HTMLSpanElement>; onFinish: () => void }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        color: el.color,
        textAlign: el.align,
        fontFamily: el.fontFamily,
        lineHeight: el.lineHeight,
        letterSpacing: el.letterSpacing,
        textTransform: el.uppercase ? "uppercase" : "none",
        fontStyle: el.italic ? "italic" : "normal",
        background: el.bgColor || "transparent",
        padding: el.padding,
        borderRadius: el.radius,
        whiteSpace: "pre-wrap",
        overflow: editing ? "visible" : "hidden",
        wordBreak: "break-word",
        boxSizing: "border-box",
        ...effectStyle(el),
      }}
    >
      <span
        ref={textRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onBlur={editing ? onFinish : undefined}
        onKeyDown={(e) => {
          if (!editing) return;
          e.stopPropagation();
          if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) (e.currentTarget as HTMLElement).blur();
        }}
        style={{ width: "100%", outline: "none", minHeight: "1em" }}
      >
        {el.text}
      </span>
    </div>
  );
}

function renderInner(el: El): React.ReactNode {
  const fx = effectStyle(el);
  switch (el.type) {
    case "image":
      return (
        <ProxiedImg
          src={el.src}
          alt={el.label || ""}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: el.fit, borderRadius: el.radius, display: "block", pointerEvents: "none", ...fx }}
        />
      );
    case "icon": {
      const Cmp = (icons as Record<string, React.ComponentType<Record<string, unknown>>>)[el.name] || icons.Square;
      const size = Math.min(el.w, el.h);
      return <Cmp size={size} color={el.color} strokeWidth={el.strokeWidth} fill={el.fill ? el.color : "none"} style={{ width: "100%", height: "100%", ...fx }} />;
    }
    case "shape":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: el.fill,
            borderRadius: el.radius,
            border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : "none",
            boxSizing: "border-box",
            ...fx,
          }}
        />
      );
    case "score": {
      const size = Math.min(el.w, el.h);
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: el.bgColor,
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: el.color,
            fontFamily: "'Glacial Indifference', sans-serif",
            lineHeight: 1,
            ...fx,
          }}
        >
          <span style={{ fontSize: size * 0.4, fontWeight: 700 }}>{el.value}</span>
          <span style={{ fontSize: size * 0.13, fontWeight: 400, letterSpacing: 2, textTransform: "uppercase", marginTop: size * 0.04 }}>{el.label}</span>
        </div>
      );
    }
    default:
      return null;
  }
}
