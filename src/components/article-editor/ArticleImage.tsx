import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { GripVertical, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampWidth,
  FLOAT_DEFAULT_WIDTH,
  MAX_IMAGES_PER_ROW,
  round1,
  rowWidths,
  validRatio,
  widthFromDrag,
  type ImageAlign,
} from "./imageLayout";

export interface ImageAttrs {
  src: string;
  alt: string | null;
  title: string | null;
  /** Percent of the text column; null is the full width */
  width: number | null;
  align: ImageAlign;
  caption: string | null;
  /** Who the picture is from ("Nintendo", "Foto: Jane Doe / Unsplash") */
  credit: string | null;
  creditUrl: string | null;
  /** Width / height, measured once the picture loads; used to line up images side by side */
  ratio: number | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleImage: {
      /** Width (percent, null = full) and alignment of the selected image */
      setImageLayout: (layout: { width?: number | null; align?: ImageAlign }) => ReturnType;
      /** Puts the selected image side by side with the image (or row) next to it, or the one before */
      joinImageWithNeighbour: () => ReturnType;
      /** Adds a new image right beside the one at `pos` (or the selected one) */
      addImageBeside: (src: string, pos?: number) => ReturnType;
      /** Turns the row around the selected image back into images one below the other */
      splitImageRow: () => ReturnType;
      /** Moves the selected image (or its row) one block up or down; inside a row with "row" left/right */
      moveImage: (direction: -1 | 1, within?: "row") => ReturnType;
    };
  }
}

const ROW = "imageRow";
const IMAGE = "image";

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ").slice(0, max) : null;

const safeUrl = (value: unknown): string | null => {
  const raw = text(value, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
};

const parseWidth = (el: HTMLElement): number | null => {
  const w = parseFloat(el.style.width);
  return Number.isFinite(w) && w > 0 && w < 100 ? clampWidth(round1(w)) : null;
};

const parseAlign = (value: string | null): ImageAlign => (value === "left" || value === "right" ? value : "center");

/** The selected image with its position, or null */
function selectedImage(state: EditorState): { node: PMNode; pos: number; $pos: ResolvedPos } | null {
  const sel = state.selection;
  if (!(sel instanceof NodeSelection) || sel.node.type.name !== IMAGE) return null;
  return { node: sel.node, pos: sel.from, $pos: state.doc.resolve(sel.from) };
}

/** The block that moves with the image: its row, or the image itself */
function imageBlock(state: EditorState) {
  const image = selectedImage(state);
  if (!image) return null;
  const inRow = image.$pos.parent.type.name === ROW;
  const pos = inRow ? image.$pos.before() : image.pos;
  const node = inRow ? image.$pos.parent : image.node;
  return { image, inRow, pos, node, offset: image.pos - pos };
}

const plain = (node: PMNode) => node.type.create({ ...node.attrs, width: null, align: "center" });

function selectImageAt(tr: Transaction, pos: number) {
  const node = tr.doc.nodeAt(pos);
  if (node?.type.name === IMAGE) tr.setSelection(NodeSelection.create(tr.doc, pos));
  return tr;
}

/* ── Node view ─────────────────────────────────────────────────────────────── */

function MetaField({
  value,
  onCommit,
  placeholder,
  label,
  className,
  multiline,
}: {
  value: string | null;
  onCommit: (value: string | null) => void;
  placeholder: string;
  label: string;
  className?: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const timer = useRef<number>();
  useEffect(() => setDraft(value ?? ""), [value]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const commit = (next: string) => {
    window.clearTimeout(timer.current);
    const clean = next.trim() || null;
    if (clean !== (value ?? null)) onCommit(clean);
  };
  const change = (next: string) => {
    setDraft(next);
    window.clearTimeout(timer.current);
    // Written into the article while typing, so a save in between keeps it
    timer.current = window.setTimeout(() => commit(next), 500);
  };
  const keyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit(draft);
      (e.target as HTMLElement).blur();
    }
  };
  const common = {
    value: draft,
    placeholder,
    "aria-label": label,
    onBlur: () => commit(draft),
    onKeyDown: keyDown,
    className: cn(
      "w-full resize-none border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-muted-foreground/70 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring",
      className,
    ),
  };
  return multiline ? (
    <textarea {...common} rows={1} maxLength={300} onChange={(e) => change(e.target.value)} style={{ fieldSizing: "content" } as React.CSSProperties} />
  ) : (
    <input {...common} maxLength={160} onChange={(e) => change(e.target.value)} />
  );
}

function ImageView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const { t } = useTranslation();
  const attrs = node.attrs as ImageAttrs;
  const img = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [broken, setBroken] = useState(false);
  const editable = editor.isEditable;

  const pos = typeof getPos === "function" ? getPos() : undefined;
  const inRow = typeof pos === "number" && pos <= editor.state.doc.content.size && editor.state.doc.resolve(pos).parent.type.name === ROW;

  // Side by side the widths come from the aspect ratios, so a row needs them measured
  const measure = () => {
    const el = img.current;
    if (editor.isDestroyed || !el?.complete || !el.naturalWidth) return;
    const ratio = validRatio(el.naturalWidth / el.naturalHeight);
    if (!ratio || attrs.ratio === ratio || !inRow) return;
    const at = typeof getPos === "function" ? getPos() : undefined;
    if (typeof at !== "number") return;
    // Not an undo step: a measurement, not an edit
    editor.view.dispatch(editor.state.tr.setNodeAttribute(at, "ratio", ratio).setMeta("addToHistory", false));
  };
  // A frame later, not inside React's commit: dispatching there makes TipTap flush node views
  // synchronously mid-render, which in Safari cascaded into "Maximum update depth exceeded"
  useEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [inRow, attrs.ratio, attrs.src]); // eslint-disable-line react-hooks/exhaustive-deps

  const figure = () => img.current?.closest<HTMLElement>(".article-image") ?? null;

  const startResize = (side: "left" | "right") => (e: ReactPointerEvent<HTMLButtonElement>) => {
    const fig = figure();
    const column = fig?.parentElement;
    if (!fig || !column) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const container = column.clientWidth;
    const start = attrs.width ?? 100;
    const startX = e.clientX;
    let current = start;
    setResizing(start);
    const move = (ev: PointerEvent) => {
      current = widthFromDrag({ start, dx: ev.clientX - startX, container, align: attrs.align, side });
      fig.style.width = `${current}%`;
      setResizing(current);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      setResizing(null);
      if (current !== start) updateAttributes({ width: current >= 100 ? null : current });
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  // Arrow keys on a handle resize in 5 % steps, for keyboard users
  const keyResize = (side: "left" | "right") => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const grow = (e.key === "ArrowRight") === (side === "right") ? 5 : -5;
    const next = clampWidth((attrs.width ?? 100) + grow);
    updateAttributes({ width: next >= 100 ? null : next });
  };

  const showHandles = editable && !inRow;
  const showCaption = !!attrs.caption || (editable && (selected || focused));
  const handle =
    "absolute top-1/2 z-10 h-14 w-3 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-background bg-primary opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover/image:opacity-100";

  return (
    <NodeViewWrapper
      className="article-image-body"
      data-testid="editor-image"
      onFocus={() => setFocused(true)}
      onBlur={(e: React.FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) setFocused(false);
      }}
    >
      <div className={cn("group/image relative rounded-xl", selected && "ring-2 ring-ring ring-offset-2 ring-offset-background")}>
        <img
          ref={img}
          src={attrs.src}
          alt={attrs.alt ?? ""}
          draggable={false}
          onLoad={() => {
            setBroken(false);
            measure();
          }}
          onError={() => setBroken(true)}
          className={cn(broken && "h-0")}
        />
        {/* A picture that does not load still needs a body, or it can be neither selected nor removed */}
        {broken && (
          <div className="flex aspect-video w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 px-4 text-center text-sm text-muted-foreground">
            <ImageOff className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t("article.image.broken")}
          </div>
        )}
        {editable && (
          <button
            type="button"
            contentEditable={false}
            draggable="true"
            data-drag-handle=""
            aria-label={t("article.image.move")}
            title={t("article.image.move")}
            className={cn(
              "absolute left-2 top-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg bg-media-scrim/75 text-white opacity-0 backdrop-blur transition-opacity active:cursor-grabbing group-hover/image:opacity-100",
              selected && "opacity-100",
            )}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {showHandles && (
          <>
            <button
              type="button"
              contentEditable={false}
              aria-label={t("article.image.resize")}
              data-testid="image-resize-left"
              className={cn(handle, "-left-1.5", selected && "opacity-100")}
              onPointerDown={startResize("left")}
              onKeyDown={keyResize("left")}
            />
            <button
              type="button"
              contentEditable={false}
              aria-label={t("article.image.resize")}
              data-testid="image-resize-right"
              className={cn(handle, "-right-1.5", selected && "opacity-100")}
              onPointerDown={startResize("right")}
              onKeyDown={keyResize("right")}
            />
          </>
        )}
        {resizing !== null && (
          <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-media-scrim/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
            {Math.round(resizing)} %
          </span>
        )}
      </div>

      {(showCaption || editable || attrs.credit) && (
        <div className="image-meta" contentEditable={false}>
          {showCaption &&
            (editable ? (
              <MetaField
                multiline
                value={attrs.caption}
                onCommit={(caption) => updateAttributes({ caption })}
                placeholder={t("article.image.captionPlaceholder")}
                label={t("article.image.caption")}
                className="image-caption"
              />
            ) : (
              <span className="image-caption">{attrs.caption}</span>
            ))}
          {editable ? (
            <span className={cn("image-credit-field flex items-baseline gap-1", !attrs.credit && "is-missing")}>
              <span className="shrink-0">{t("article.image.creditLabel")}</span>
              <MetaField
                value={attrs.credit}
                onCommit={(credit) => updateAttributes({ credit })}
                placeholder={t("article.image.creditPlaceholder")}
                label={t("article.image.credit")}
              />
            </span>
          ) : (
            attrs.credit && <span className="image-credit">{attrs.credit}</span>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}

/* ── Row of images ─────────────────────────────────────────────────────────── */

/**
 * Two to four images side by side. Their widths follow their aspect ratios, so they line up at the
 * same height without being cropped. A row with a single image left turns back into that image.
 */
export const ImageRow = Node.create({
  name: ROW,
  group: "block",
  content: `${IMAGE}+`,
  isolating: true,
  selectable: false,
  draggable: false,

  parseHTML() {
    return [{ tag: "div.image-row" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "image-row" }), 0];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imageRowLayout"),
        appendTransaction: (transactions, _old, state) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const rows: { node: PMNode; pos: number }[] = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === ROW) rows.push({ node, pos });
            return node.type.name !== ROW;
          });
          if (!rows.length) return null;
          const tr = state.tr;
          // Back to front, so earlier positions stay valid
          for (const { node, pos } of rows.reverse()) {
            if (node.childCount < 2) {
              const images: PMNode[] = [];
              node.forEach((child) => images.push(plain(child)));
              tr.replaceWith(pos, pos + node.nodeSize, images);
              continue;
            }
            const widths = rowWidths(Array.from({ length: node.childCount }, (_, i) => node.child(i).attrs.ratio));
            let offset = pos + 1;
            node.forEach((child, _o, i) => {
              if (child.attrs.width !== widths[i] || child.attrs.align !== "center") {
                tr.setNodeMarkup(offset, undefined, { ...child.attrs, width: widths[i], align: "center" });
              }
              offset += child.nodeSize;
            });
          }
          return tr.docChanged ? tr.setMeta("addToHistory", false) : null;
        },
      }),
    ];
  },
});

/* ── The image ─────────────────────────────────────────────────────────────── */

/**
 * Image in an article: resizable (percent of the column), left, centred or right with the text
 * flowing around, with caption and credit, movable by its handle or from the menu, and side by side
 * in an image row. Stored as
 *   <figure class="article-image" data-align style="width: 50%"><img><figcaption>…</figcaption></figure>
 * Plain <img> from older articles is read as a full-width, centred image.
 */
export const ArticleImage = Image.extend({
  name: IMAGE,
  draggable: true,

  addOptions() {
    return { ...this.parent!(), inline: false, allowBase64: false };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      align: { default: "center" },
      caption: { default: null },
      credit: { default: null },
      creditUrl: { default: null },
      ratio: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure.article-image",
        getAttrs: (el) => {
          const figure = el as HTMLElement;
          const img = figure.querySelector("img");
          const src = img?.getAttribute("src");
          if (!src || src.startsWith("data:")) return false;
          const creditEl = figure.querySelector(".image-credit");
          const link = creditEl?.querySelector("a");
          return {
            src,
            alt: img?.getAttribute("alt") || null,
            title: img?.getAttribute("title") || null,
            width: parseWidth(figure),
            align: parseAlign(figure.getAttribute("data-align")),
            caption: text(figure.querySelector(".image-caption")?.textContent, 300),
            credit: text(creditEl?.textContent, 160),
            creditUrl: safeUrl(link?.getAttribute("href")),
            ratio: validRatio(figure.getAttribute("data-ratio")),
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (el) => {
          const src = (el as HTMLElement).getAttribute("src");
          if (!src || src.startsWith("data:")) return false;
          return { src, alt: (el as HTMLElement).getAttribute("alt") || null, title: (el as HTMLElement).getAttribute("title") || null };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const a = node.attrs as ImageAttrs;
    const width = a.width && a.width < 100 ? round1(a.width) : null;
    const figcaption: unknown[] = [];
    if (a.caption) figcaption.push(["span", { class: "image-caption" }, a.caption]);
    if (a.credit) {
      figcaption.push([
        "span",
        { class: "image-credit" },
        a.creditUrl ? ["a", { href: a.creditUrl, target: "_blank", rel: "noopener noreferrer nofollow" }, a.credit] : a.credit,
      ]);
    }
    return [
      "figure",
      {
        class: "article-image",
        "data-align": a.align !== "center" ? a.align : null,
        "data-ratio": a.ratio ? String(a.ratio) : null,
        style: width ? `width: ${width}%;` : null,
      },
      ["img", { src: a.src, alt: a.alt, title: a.title }],
      ...(figcaption.length ? [["figcaption", {}, ...figcaption]] : []),
    ] as never;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView, {
      as: "figure",
      className: "article-image",
      // The figure itself carries width and alignment, so floats and rows lay out as on the article page
      attrs: ({ node }) => {
        const a = node.attrs as ImageAttrs;
        const width = a.width && a.width < 100 ? round1(a.width) : null;
        return { "data-align": a.align !== "center" ? a.align : "", style: width ? `width: ${width}%;` : "" };
      },
    });
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageLayout:
        ({ width, align }) =>
        ({ state, tr, dispatch }) => {
          const image = selectedImage(state);
          if (!image || image.$pos.parent.type.name === ROW) return false;
          const attrs = { ...image.node.attrs } as ImageAttrs;
          if (align !== undefined) {
            attrs.align = align;
            // A float over the full width would only push the text below it
            if (align !== "center" && (attrs.width ?? 100) > 75) attrs.width = FLOAT_DEFAULT_WIDTH;
          }
          if (width !== undefined) attrs.width = width === null || width >= 100 ? null : clampWidth(width);
          if (dispatch) dispatch(selectImageAt(tr.setNodeMarkup(image.pos, undefined, attrs), image.pos));
          return true;
        },

      joinImageWithNeighbour:
        () =>
        ({ state, tr, dispatch }) => {
          const block = imageBlock(state);
          if (!block) return false;
          const $block = state.doc.resolve(block.pos);
          const parent = $block.parent;
          const index = $block.index();
          const isImageish = (n: PMNode | null | undefined) => !!n && (n.type.name === IMAGE || n.type.name === ROW);
          const count = (n: PMNode) => (n.type.name === ROW ? n.childCount : 1);
          const images = (n: PMNode) => {
            const list: PMNode[] = [];
            if (n.type.name === ROW) n.forEach((c) => list.push(c));
            else list.push(plain(n));
            return list;
          };

          const next = index + 1 < parent.childCount ? parent.child(index + 1) : null;
          const prev = index > 0 ? parent.child(index - 1) : null;
          const fits = (n: PMNode | null) => isImageish(n) && count(n!) + count(block.node) <= MAX_IMAGES_PER_ROW;
          const useNext = fits(next);
          if (!useNext && !fits(prev)) return false;
          if (!dispatch) return true;

          const rowType = state.schema.nodes[ROW];
          const first = useNext ? block.node : prev!;
          const second = useNext ? next! : block.node;
          const from = useNext ? block.pos : block.pos - prev!.nodeSize;
          const to = from + first.nodeSize + second.nodeSize;
          const row = rowType.create(null, [...images(first), ...images(second)]);
          // Where the selected image ends up inside the new row
          const before = useNext ? 0 : count(prev!);
          const within = block.inRow ? block.offset - 1 : 0;
          let at = from + 1;
          for (let i = 0; i < before; i++) at += row.child(i).nodeSize;
          at += within;
          tr.replaceWith(from, to, row);
          dispatch(selectImageAt(tr, at));
          return true;
        },

      addImageBeside:
        (src, pos) =>
        ({ state, tr, dispatch }) => {
          const anchor = typeof pos === "number" ? state.doc.nodeAt(pos) : null;
          const image =
            anchor?.type.name === IMAGE ? { node: anchor, pos: pos!, $pos: state.doc.resolve(pos!) } : selectedImage(state);
          if (!image) return false;
          const created = state.schema.nodes[IMAGE].create({ src });
          const inRow = image.$pos.parent.type.name === ROW;
          if (inRow && image.$pos.parent.childCount >= MAX_IMAGES_PER_ROW) return false;
          if (!dispatch) return true;
          const after = image.pos + image.node.nodeSize;
          if (inRow) {
            tr.insert(after, created);
            dispatch(selectImageAt(tr, after));
          } else {
            const row = state.schema.nodes[ROW].create(null, [plain(image.node), created]);
            tr.replaceWith(image.pos, after, row);
            dispatch(selectImageAt(tr, image.pos + 1 + row.child(0).nodeSize));
          }
          return true;
        },

      splitImageRow:
        () =>
        ({ state, tr, dispatch }) => {
          const block = imageBlock(state);
          if (!block?.inRow) return false;
          if (!dispatch) return true;
          const images: PMNode[] = [];
          block.node.forEach((c) => images.push(plain(c)));
          tr.replaceWith(block.pos, block.pos + block.node.nodeSize, images);
          // Row boundaries are gone: one token less in front of the selected image
          dispatch(selectImageAt(tr, block.pos + block.offset - 1));
          return true;
        },

      moveImage:
        (direction, within) =>
        ({ state, tr, dispatch }) => {
          const block = imageBlock(state);
          if (!block) return false;
          // Inside a row: swap with the neighbouring image; otherwise move the whole block
          const moving = within === "row" && block.inRow ? block.image : block;
          const node = moving.node;
          const from = moving.pos;
          const $from = state.doc.resolve(from);
          const index = $from.index();
          const target = index + direction;
          if (target < 0 || target >= $from.parent.childCount) return false;
          if (!dispatch) return true;
          const sibling = $from.parent.child(target);
          tr.delete(from, from + node.nodeSize);
          const insertAt = direction < 0 ? from - sibling.nodeSize : from + sibling.nodeSize;
          tr.insert(insertAt, node);
          const imageAt = moving === block ? insertAt + block.offset : insertAt;
          dispatch(selectImageAt(tr, imageAt).scrollIntoView());
          return true;
        },
    };
  },
});

/** What the image menu needs to know about the selection */
export function imageMenuState(editor: Editor) {
  const block = imageBlock(editor.state);
  if (!block) return null;
  const attrs = block.image.node.attrs as ImageAttrs;
  const $block = editor.state.doc.resolve(block.pos);
  const $image = block.image.$pos;
  return {
    attrs,
    inRow: block.inRow,
    rowSize: block.inRow ? block.node.childCount : 1,
    canUp: $block.index() > 0,
    canDown: $block.index() < $block.parent.childCount - 1,
    canLeft: block.inRow && $image.index() > 0,
    canRight: block.inRow && $image.index() < $image.parent.childCount - 1,
    canJoin: editor.can().joinImageWithNeighbour(),
    imagePos: block.image.pos,
  };
}
