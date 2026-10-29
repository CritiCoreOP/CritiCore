import { useTranslation } from "react-i18next";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter,
  ArrowDown, ArrowUp, BringToFront, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Group, Image as ImageIcon, Layers, Lock, Plus, SendToBack, Shapes, Sparkles, Star, Trash2, Type, Ungroup, Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import SocialCanvas from "./SocialCanvas";
import { layerName } from "./effects";
import { selectionInfo } from "./selection";
import type { CanvasElement, Slide } from "./types";

export type CanvasAlign = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

const TYPE_ICON = { text: Type, image: ImageIcon, icon: Star, shape: Shapes, score: Sparkles } as const;

function IconButton({ label, onClick, disabled, children, className }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className={cn("h-8 w-8", className)} onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

/* ── Floating bar over the canvas for the selection ───────────────────────── */

export interface SelectionActions {
  onAlign: (a: CanvasAlign) => void;
  onDistribute: (axis: "h" | "v") => void;
  onGroup: () => void;
  onUngroup: () => void;
  onLayer: (dir: "front" | "back") => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

const ALIGNS: [CanvasAlign, typeof AlignStartVertical][] = [
  ["left", AlignStartVertical],
  ["hcenter", AlignCenterVertical],
  ["right", AlignEndVertical],
  ["top", AlignStartHorizontal],
  ["vcenter", AlignCenterHorizontal],
  ["bottom", AlignEndHorizontal],
];

export function SelectionBar({ elements, ...a }: { elements: CanvasElement[] } & SelectionActions) {
  const { t } = useTranslation();
  const info = selectionInfo(elements);
  const one = elements.length === 1 ? elements[0] : null;
  const Icon = one ? TYPE_ICON[one.type] : Layers;
  return (
    <div
      role="toolbar"
      aria-label={t("socialCreator.selection.label")}
      className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[12px] border border-border/60 bg-card/95 p-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      <span className="flex shrink-0 items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden max-w-[9rem] truncate sm:inline">
          {one ? layerName(one, t(`socialCreator.types.${one.type}`)) : t("socialCreator.selection.count", { count: elements.length })}
        </span>
      </span>
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      {ALIGNS.map(([al, AIcon]) => (
        <IconButton key={al} label={t(`socialCreator.selection.align.${al}`)} onClick={() => a.onAlign(al)} disabled={info.locked}>
          <AIcon className="h-4 w-4" />
        </IconButton>
      ))}
      {info.canDistribute && (
        <>
          <IconButton label={t("socialCreator.selection.distributeH")} onClick={() => a.onDistribute("h")}>
            <AlignHorizontalDistributeCenter className="h-4 w-4" />
          </IconButton>
          <IconButton label={t("socialCreator.selection.distributeV")} onClick={() => a.onDistribute("v")}>
            <AlignVerticalDistributeCenter className="h-4 w-4" />
          </IconButton>
        </>
      )}
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      {info.canGroup && (
        <IconButton label={t("socialCreator.selection.group")} onClick={a.onGroup}>
          <Group className="h-4 w-4" />
        </IconButton>
      )}
      {info.canUngroup && (
        <IconButton label={t("socialCreator.selection.ungroup")} onClick={a.onUngroup}>
          <Ungroup className="h-4 w-4" />
        </IconButton>
      )}
      <IconButton label={t("socialCreator.actions.toFront")} onClick={() => a.onLayer("front")}>
        <BringToFront className="h-4 w-4" />
      </IconButton>
      <IconButton label={t("socialCreator.actions.toBack")} onClick={() => a.onLayer("back")}>
        <SendToBack className="h-4 w-4" />
      </IconButton>
      <IconButton label={t("socialCreator.actions.duplicate")} onClick={a.onDuplicate}>
        <Copy className="h-4 w-4" />
      </IconButton>
      <IconButton label={t(info.locked ? "socialCreator.actions.unlock" : "socialCreator.actions.lock")} onClick={a.onToggleLock} className={info.locked ? "text-primary" : undefined}>
        {info.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      </IconButton>
      <IconButton label={t("socialCreator.actions.delete")} onClick={a.onDelete} className="text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

/* ── Design panel for several elements ────────────────────────────────────── */

export function MultiPanel({ elements, onOpacity, ...a }: { elements: CanvasElement[]; onOpacity: (v: number) => void } & SelectionActions) {
  const { t } = useTranslation();
  const info = selectionInfo(elements);
  const opacity = Math.round(Math.max(...elements.map((e) => e.opacity ?? 1)) * 100);
  const section = "grid gap-2 border-b border-border/60 px-4 py-4";
  const heading = "text-xs font-semibold text-muted-foreground";
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/12 text-primary">
          <Layers className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{t("socialCreator.selection.count", { count: elements.length })}</p>
          <p className="text-xs text-muted-foreground">{t("socialCreator.selection.hint")}</p>
        </div>
      </div>
      <div className={section}>
        <p className={heading}>{t("socialCreator.selection.alignTitle")}</p>
        <div className="grid grid-cols-6 gap-1">
          {ALIGNS.map(([al, AIcon]) => (
            <IconButton key={al} label={t(`socialCreator.selection.align.${al}`)} onClick={() => a.onAlign(al)} disabled={info.locked} className="w-full">
              <AIcon className="h-4 w-4" />
            </IconButton>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button type="button" variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" disabled={!info.canDistribute} onClick={() => a.onDistribute("h")}>
            <AlignHorizontalDistributeCenter className="h-4 w-4" aria-hidden="true" />
            {t("socialCreator.selection.distributeH")}
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" disabled={!info.canDistribute} onClick={() => a.onDistribute("v")}>
            <AlignVerticalDistributeCenter className="h-4 w-4" aria-hidden="true" />
            {t("socialCreator.selection.distributeV")}
          </Button>
        </div>
        {!info.canDistribute && <p className="text-[11px] text-muted-foreground">{t("socialCreator.selection.distributeHint")}</p>}
      </div>
      <div className={section}>
        <p className={heading}>{t("socialCreator.selection.arrange")}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {info.canGroup && (
            <Button type="button" variant="secondary" size="sm" className="col-span-2 h-8 gap-1.5 text-xs" onClick={a.onGroup}>
              <Group className="h-4 w-4" aria-hidden="true" />
              {t("socialCreator.selection.group")}
            </Button>
          )}
          {info.canUngroup && (
            <Button type="button" variant="secondary" size="sm" className="col-span-2 h-8 gap-1.5 text-xs" onClick={a.onUngroup}>
              <Ungroup className="h-4 w-4" aria-hidden="true" />
              {t("socialCreator.selection.ungroup")}
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => a.onLayer("front")}>
            <BringToFront className="h-4 w-4" aria-hidden="true" />
            {t("socialCreator.actions.toFront")}
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => a.onLayer("back")}>
            <SendToBack className="h-4 w-4" aria-hidden="true" />
            {t("socialCreator.actions.toBack")}
          </Button>
        </div>
      </div>
      <div className={section}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("socialCreator.inspector.opacity")}</span>
          <span className="font-medium tabular-nums text-foreground">{opacity} %</span>
        </div>
        <Slider value={[opacity]} min={0} max={100} step={1} onValueChange={([v]) => onOpacity(v / 100)} aria-label={t("socialCreator.inspector.opacity")} />
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-4 py-4">
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={a.onDuplicate}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          {t("socialCreator.actions.duplicate")}
        </Button>
        <Button type="button" variant="outline" size="sm" className={cn("h-8 gap-1.5 px-2 text-xs", info.locked && "text-primary")} onClick={a.onToggleLock}>
          {info.locked ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
          {t(info.locked ? "socialCreator.actions.unlock" : "socialCreator.actions.lock")}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs text-destructive hover:text-destructive" onClick={a.onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t("socialCreator.actions.delete")}
        </Button>
      </div>
    </div>
  );
}

/* ── Layers: top of the stack first ───────────────────────────────────────── */

export function LayersPanel({ slide, selectedIds, onSelect, onPatch, onMove }: {
  slide: Slide;
  selectedIds: string[];
  /** `additive`: Shift, Ctrl or Cmd held, the layer joins or leaves the selection */
  onSelect: (id: string, additive: boolean) => void;
  onPatch: (id: string, patch: Partial<CanvasElement>) => void;
  /** Moves one step up (towards the front) or down */
  onMove: (id: string, dir: 1 | -1) => void;
}) {
  const { t } = useTranslation();
  const layers = [...slide.elements].reverse();
  if (!layers.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <Layers className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{t("socialCreator.layers.emptyTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("socialCreator.layers.emptyBody")}</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-0.5 p-2" aria-label={t("socialCreator.layers.title")}>
      {layers.map((el, i) => {
        const Icon = TYPE_ICON[el.type];
        const on = selectedIds.includes(el.id);
        const grouped = !!el.groupId;
        const top = i === 0;
        const bottom = i === layers.length - 1;
        return (
          <li key={el.id}>
            <div className={cn("group flex items-center gap-1 rounded-[10px] pr-1 transition-colors", on ? "bg-primary/12" : "hover:bg-muted/50")}>
              <button
                type="button"
                onClick={(e) => onSelect(el.id, e.shiftKey || e.metaKey || e.ctrlKey)}
                aria-pressed={on}
                className={cn("flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm", el.hidden ? "text-muted-foreground line-through" : "text-foreground", grouped && "pl-4")}
              >
                <Icon className={cn("h-4 w-4 shrink-0", on ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                <span className="truncate">{layerName(el, t(`socialCreator.types.${el.type}`))}</span>
                {grouped && <Group className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={t("socialCreator.layers.inGroup")} />}
              </button>
              <span className="flex shrink-0 opacity-60 transition-opacity group-hover:opacity-100">
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={top} onClick={() => onMove(el.id, 1)} aria-label={t("socialCreator.layers.up")} title={t("socialCreator.layers.up")}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={bottom} onClick={() => onMove(el.id, -1)} aria-label={t("socialCreator.layers.down")} title={t("socialCreator.layers.down")}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className={cn("h-7 w-7", el.locked && "text-primary")} onClick={() => onPatch(el.id, { locked: !el.locked })} aria-label={t(el.locked ? "socialCreator.actions.unlock" : "socialCreator.actions.lock")} aria-pressed={!!el.locked}>
                  {el.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => onPatch(el.id, { hidden: !el.hidden })} aria-label={t(el.hidden ? "socialCreator.layers.show" : "socialCreator.layers.hide")} aria-pressed={!!el.hidden}>
                  {el.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Filmstrip of slides ──────────────────────────────────────────────────── */

export function Filmstrip({ slides, activeIdx, onSelect, onAdd, onDuplicate, onDelete, onMove, vertical }: {
  slides: Slide[];
  activeIdx: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  /** In the phone sheet the slides are a grid, on desktop a row */
  vertical?: boolean;
}) {
  const { t } = useTranslation();
  const thumb = vertical ? { w: 120, h: 150 } : { w: 92, h: 64 };
  return (
    <div className={cn("flex min-w-0 gap-3", vertical ? "flex-col" : "items-center")}>
      <ol className={cn("flex min-w-0 gap-2", vertical ? "grid grid-cols-2" : "overflow-x-auto py-1")} aria-label={t("socialCreator.slides")}>
        {slides.map((sl, i) => (
          <li key={sl.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={i === activeIdx ? "true" : undefined}
              aria-label={t("socialCreator.filmstrip.slide", { n: i + 1 })}
              className={cn(
                "relative flex items-center justify-center rounded-[10px] border-2 bg-black/20 p-1 transition-colors",
                i === activeIdx ? "border-primary" : "border-transparent hover:border-border",
              )}
              style={{ width: thumb.w + 12, height: thumb.h + 12 }}
            >
              <span className="pointer-events-none">
                <SocialCanvas slide={sl} maxWidth={thumb.w} maxHeight={thumb.h} interactive={false} onChange={() => {}} />
              </span>
              <span className="absolute bottom-1 left-1 rounded-[5px] bg-background/90 px-1.5 text-[10px] font-semibold tabular-nums text-foreground">{i + 1}</span>
            </button>
          </li>
        ))}
        <li className="shrink-0">
          <button
            type="button"
            onClick={onAdd}
            className="flex flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-dashed border-border/70 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            style={{ width: thumb.w + 12, height: thumb.h + 12 }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("socialCreator.filmstrip.add")}
          </button>
        </li>
      </ol>
      <div className={cn("flex shrink-0 gap-0.5", vertical ? "justify-center" : "flex-col sm:flex-row")}>
        <IconButton label={t("socialCreator.filmstrip.left")} onClick={() => onMove(-1)} disabled={activeIdx === 0}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <IconButton label={t("socialCreator.filmstrip.right")} onClick={() => onMove(1)} disabled={activeIdx === slides.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
        <IconButton label={t("socialCreator.filmstrip.duplicate")} onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </IconButton>
        <IconButton label={t("socialCreator.filmstrip.delete")} onClick={onDelete} disabled={slides.length === 1} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
