import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlignCenter, AlignLeft, AlignRight, CaseUpper, Copy, FlipHorizontal2, FlipVertical2, Image as ImageIcon, Italic, Lock, Palette, Shapes, Sparkles, Star, Trash2, Type, Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANIM_OPTIONS, DEFAULT_ANIM, type AnimType } from "./animations";
import { BRAND_COLORS, BRAND_FONTS, BRAND_GRADIENTS } from "./brandAssets";
import { DEFAULT_FILTERS, DEFAULT_SHADOW } from "./effects";
import { SOCIAL_FORMATS } from "./formats";
import type { CanvasElement as El, ImageFilters, Slide } from "./types";

interface Props {
  element: El | null;
  slide: Slide;
  onChange: (patch: Partial<El>) => void;
  onBackgroundChange: (patch: Partial<Slide["background"]>) => void;
  onFormatChange: (formatId: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const TYPE_ICON = { text: Type, image: ImageIcon, icon: Star, shape: Shapes, score: Sparkles } as const;

function ColorField({ label, value, onChange, allowNone, onNone }: { label: string; value: string; onChange: (v: string) => void; allowNone?: boolean; onNone?: () => void }) {
  const { t } = useTranslation();
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-[8px] border border-border" style={{ background: value || "transparent" }}>
          <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={label} />
        </label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 font-mono text-xs" aria-label={`${label} (Hex)`} />
        {allowNone && (
          <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={onNone}>
            {t("socialCreator.inspector.none")}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {BRAND_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            aria-label={c.label}
            onClick={() => onChange(c.value)}
            className={cn("h-5 w-5 rounded-full border transition-transform hover:scale-110", value.toLowerCase() === c.value.toLowerCase() ? "border-foreground ring-2 ring-primary/50" : "border-border")}
            style={{ background: c.value }}
          />
        ))}
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">{format ? format(value) : value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  );
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="relative">
        <Input
          type="number"
          value={Math.round(value)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="h-8 pr-6 text-xs tabular-nums"
        />
        {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

function Toggle({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <Button type="button" size="icon" variant={active ? "secondary" : "ghost"} className={cn("h-8 w-8", active && "text-primary")} onClick={onClick} aria-label={label} aria-pressed={active} title={label}>
      {children}
    </Button>
  );
}

function SwitchRow({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <div className="grid gap-3">
      <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-foreground">
        {label}
        <Switch checked={checked} onCheckedChange={onChange} />
      </label>
      {checked && children}
    </div>
  );
}

function Group({ value, title, children }: { value: string; title: string; children: ReactNode }) {
  return (
    <AccordionItem value={value} className="border-border/50">
      <AccordionTrigger className="px-4 py-3 text-xs font-semibold hover:no-underline">{title}</AccordionTrigger>
      <AccordionContent className="grid gap-4 px-4 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const sec = (v: number) => `${(v / 1000).toFixed(1)} s`;

/** The selected element's settings, or the slide's when nothing is selected */
export default function Inspector({ element, slide, onChange, onBackgroundChange, onFormatChange, onDelete, onDuplicate }: Props) {
  const { t } = useTranslation();
  const set = (patch: Record<string, unknown>) => onChange(patch as Partial<El>);

  if (!element) {
    const bg = slide.background;
    const platforms = Array.from(new Set(SOCIAL_FORMATS.map((f) => f.platform)));
    return (
      <Accordion key="slide" type="multiple" defaultValue={["format", "background"]}>
        <div className="flex items-center gap-2.5 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary/12 text-primary">
            <Palette className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{t("socialCreator.inspector.slide")}</h2>
            <p className="text-xs text-muted-foreground">{t("socialCreator.inspector.slideHint")}</p>
          </div>
        </div>
        <Group value="format" title={t("socialCreator.inspector.format")}>
          <Select value={slide.formatId} onValueChange={onFormatChange}>
            <SelectTrigger className="h-9 text-xs" aria-label={t("socialCreator.inspector.format")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((platform) => (
                <SelectGroup key={platform}>
                  <SelectLabel className="text-[11px]">{platform}</SelectLabel>
                  {SOCIAL_FORMATS.filter((f) => f.platform === platform).map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.label} <span className="text-muted-foreground">{f.width}×{f.height}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Group>
        <Group value="background" title={t("socialCreator.inspector.background")}>
          <div role="radiogroup" aria-label={t("socialCreator.inspector.background")} className="grid grid-cols-3 gap-1 rounded-[10px] bg-secondary/60 p-1">
            {(["color", "gradient", "image"] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={bg.type === type}
                onClick={() => onBackgroundChange({ type })}
                className={cn("rounded-[7px] py-1.5 text-xs font-medium transition-colors", bg.type === type ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {t(`socialCreator.inspector.bg.${type}`)}
              </button>
            ))}
          </div>
          {bg.type === "color" && <ColorField label={t("socialCreator.inspector.color")} value={bg.color} onChange={(color) => onBackgroundChange({ color })} />}
          {bg.type === "gradient" && (
            <div className="grid grid-cols-3 gap-2">
              {BRAND_GRADIENTS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  title={g.label}
                  aria-label={g.label}
                  aria-pressed={bg.gradient === g.value}
                  onClick={() => onBackgroundChange({ gradient: g.value })}
                  className={cn("h-12 rounded-[8px] border", bg.gradient === g.value ? "border-foreground ring-2 ring-primary" : "border-border")}
                  style={{ background: g.value }}
                />
              ))}
            </div>
          )}
          {bg.type === "image" && (
            <>
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">{t("socialCreator.inspector.imageUrl")}</span>
                <Input value={bg.image || ""} placeholder="https://" onChange={(e) => onBackgroundChange({ image: e.target.value || null })} className="h-8 text-xs" />
              </label>
              <p className="text-[11px] text-muted-foreground">{t("socialCreator.inspector.imageHint")}</p>
              <div className="grid grid-cols-2 gap-1">
                {(["cover", "contain"] as const).map((fit) => (
                  <Button key={fit} type="button" size="sm" variant={bg.imageFit === fit ? "secondary" : "ghost"} className="text-xs" onClick={() => onBackgroundChange({ imageFit: fit })}>
                    {t(`socialCreator.inspector.fit.${fit}`)}
                  </Button>
                ))}
              </div>
              <SliderField label={t("socialCreator.inspector.opacity")} value={bg.imageOpacity} min={0} max={1} step={0.01} format={pct} onChange={(imageOpacity) => onBackgroundChange({ imageOpacity })} />
              <ColorField label={t("socialCreator.inspector.behindImage")} value={bg.color} onChange={(color) => onBackgroundChange({ color })} />
            </>
          )}
        </Group>
      </Accordion>
    );
  }

  const e = element;
  const Icon = TYPE_ICON[e.type];
  const filters: ImageFilters = e.type === "image" ? { ...DEFAULT_FILTERS, ...e.filters } : DEFAULT_FILTERS;
  const setFilter = (patch: Partial<ImageFilters>) => set({ filters: { ...filters, ...patch } });

  return (
    <Accordion key="element" type="multiple" defaultValue={["content", "style", "effects", "position"]}>
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-primary/12 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <Input
          value={e.layerName ?? ""}
          placeholder={t(`socialCreator.types.${e.type}`)}
          onChange={(ev) => set({ layerName: ev.target.value || undefined })}
          className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-sm font-semibold hover:border-border focus-visible:border-border"
          aria-label={t("socialCreator.inspector.layerName")}
        />
        <div className="flex shrink-0">
          <Toggle active={!!e.locked} onClick={() => set({ locked: !e.locked })} label={t(e.locked ? "socialCreator.actions.unlock" : "socialCreator.actions.lock")}>
            {e.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Toggle>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onDuplicate} aria-label={t("socialCreator.actions.duplicate")} title={t("socialCreator.actions.duplicate")}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete} aria-label={t("socialCreator.actions.delete")} title={t("socialCreator.actions.delete")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {e.type !== "shape" && (
        <Group value="content" title={t("socialCreator.inspector.content")}>
          {e.type === "text" && (
            <label className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">{t("socialCreator.inspector.text")}</span>
              <Textarea value={e.text} onChange={(ev) => set({ text: ev.target.value })} className="min-h-[84px] text-sm" />
              <span className="text-[11px] text-muted-foreground">{t("socialCreator.inspector.textHint")}</span>
            </label>
          )}
          {e.type === "image" && (
            <>
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">{t("socialCreator.inspector.imageUrl")}</span>
                <Input value={e.src} onChange={(ev) => set({ src: ev.target.value })} className="h-8 text-xs" />
              </label>
              <div className="grid grid-cols-2 gap-1">
                {(["cover", "contain"] as const).map((fit) => (
                  <Button key={fit} type="button" size="sm" variant={e.fit === fit ? "secondary" : "ghost"} className="text-xs" onClick={() => set({ fit })}>
                    {t(`socialCreator.inspector.fit.${fit}`)}
                  </Button>
                ))}
              </div>
            </>
          )}
          {e.type === "score" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-[11px] text-muted-foreground">{t("socialCreator.inspector.value")}</span>
                <Input type="number" step="0.1" value={e.value} onChange={(ev) => set({ value: parseFloat(ev.target.value) || 0 })} className="h-8 text-xs" />
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] text-muted-foreground">{t("socialCreator.inspector.label")}</span>
                <Input value={e.label} onChange={(ev) => set({ label: ev.target.value })} className="h-8 text-xs" />
              </label>
            </div>
          )}
          {e.type === "icon" && (
            <label className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">{t("socialCreator.inspector.iconName")}</span>
              <Input value={e.name ?? ""} onChange={(ev) => set({ name: ev.target.value })} className="h-8 font-mono text-xs" />
            </label>
          )}
        </Group>
      )}

      <Group value="style" title={t("socialCreator.inspector.style")}>
        {e.type === "text" && (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
              <Select value={e.fontFamily} onValueChange={(fontFamily) => set({ fontFamily })}>
                <SelectTrigger className="h-8 text-xs" aria-label={t("socialCreator.inspector.font")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(e.fontWeight)} onValueChange={(v) => set({ fontWeight: Number(v) })}>
                <SelectTrigger className="h-8 text-xs" aria-label={t("socialCreator.inspector.weight")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                    <SelectItem key={w} value={String(w)} className="text-xs">{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SliderField label={t("socialCreator.inspector.size")} value={e.fontSize} min={8} max={320} step={1} format={(v) => `${v} px`} onChange={(fontSize) => set({ fontSize })} />
            <div className="flex flex-wrap items-center gap-0.5">
              {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, AIcon]) => (
                <Toggle key={a} active={e.align === a} onClick={() => set({ align: a })} label={t(`socialCreator.inspector.align.${a}`)}>
                  <AIcon className="h-4 w-4" />
                </Toggle>
              ))}
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
              <Toggle active={e.italic} onClick={() => set({ italic: !e.italic })} label={t("socialCreator.inspector.italic")}>
                <Italic className="h-4 w-4" />
              </Toggle>
              <Toggle active={e.uppercase} onClick={() => set({ uppercase: !e.uppercase })} label={t("socialCreator.inspector.uppercase")}>
                <CaseUpper className="h-4 w-4" />
              </Toggle>
            </div>
            <ColorField label={t("socialCreator.inspector.textColor")} value={e.color} onChange={(color) => set({ color })} />
            <SliderField label={t("socialCreator.inspector.lineHeight")} value={e.lineHeight} min={0.8} max={2.2} step={0.05} format={(v) => v.toFixed(2)} onChange={(lineHeight) => set({ lineHeight })} />
            <SliderField label={t("socialCreator.inspector.letterSpacing")} value={e.letterSpacing} min={-5} max={24} step={0.5} format={(v) => `${v} px`} onChange={(letterSpacing) => set({ letterSpacing })} />
            <SwitchRow label={t("socialCreator.inspector.textBackground")} checked={!!e.bgColor} onChange={(on) => set({ bgColor: on ? "#efedf4" : null, padding: on ? Math.max(e.padding, Math.round(e.fontSize * 0.3)) : e.padding })}>
              <ColorField label={t("socialCreator.inspector.color")} value={e.bgColor ?? "#efedf4"} onChange={(bgColor) => set({ bgColor })} />
              <SliderField label={t("socialCreator.inspector.padding")} value={e.padding} min={0} max={120} step={1} format={(v) => `${v} px`} onChange={(padding) => set({ padding })} />
              <SliderField label={t("socialCreator.inspector.radius")} value={Math.min(e.radius, 200)} min={0} max={200} step={1} format={(v) => `${v} px`} onChange={(radius) => set({ radius })} />
            </SwitchRow>
          </>
        )}

        {e.type === "image" && (
          <>
            <SliderField label={t("socialCreator.inspector.radius")} value={Math.min(e.radius, 400)} min={0} max={400} step={2} format={(v) => `${v} px`} onChange={(radius) => set({ radius })} />
            <SliderField label={t("socialCreator.inspector.brightness")} value={filters.brightness} min={0} max={2} step={0.05} format={pct} onChange={(brightness) => setFilter({ brightness })} />
            <SliderField label={t("socialCreator.inspector.contrast")} value={filters.contrast} min={0} max={2} step={0.05} format={pct} onChange={(contrast) => setFilter({ contrast })} />
            <SliderField label={t("socialCreator.inspector.saturation")} value={filters.saturate} min={0} max={2} step={0.05} format={pct} onChange={(saturate) => setFilter({ saturate })} />
            <SliderField label={t("socialCreator.inspector.grayscale")} value={filters.grayscale} min={0} max={1} step={0.05} format={pct} onChange={(grayscale) => setFilter({ grayscale })} />
            <SliderField label={t("socialCreator.inspector.blur")} value={filters.blur} min={0} max={40} step={1} format={(v) => `${v} px`} onChange={(blur) => setFilter({ blur })} />
            {(e.filters && JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)) && (
              <Button type="button" variant="ghost" size="sm" className="justify-self-start text-xs" onClick={() => set({ filters: undefined })}>
                {t("socialCreator.inspector.resetFilters")}
              </Button>
            )}
          </>
        )}

        {e.type === "shape" && (
          <>
            {e.fill.startsWith("linear-gradient") ? (
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">{t("socialCreator.inspector.fill")}</span>
                <Button type="button" variant="outline" size="sm" className="justify-self-start text-xs" onClick={() => set({ fill: "#5c9dff" })}>
                  {t("socialCreator.inspector.fillSolid")}
                </Button>
              </div>
            ) : (
              <ColorField label={t("socialCreator.inspector.fill")} value={e.fill} onChange={(fill) => set({ fill })} allowNone onNone={() => set({ fill: "transparent" })} />
            )}
            <div className="grid grid-cols-6 gap-1.5">
              {BRAND_GRADIENTS.map((g) => (
                <button key={g.label} type="button" title={g.label} aria-label={g.label} onClick={() => set({ fill: g.value })} className="h-7 rounded-[6px] border border-border" style={{ background: g.value }} />
              ))}
            </div>
            <SliderField label={t("socialCreator.inspector.radius")} value={Math.min(e.radius, 400)} min={0} max={400} step={2} format={(v) => `${v} px`} onChange={(radius) => set({ radius })} />
            <SliderField label={t("socialCreator.inspector.border")} value={e.borderWidth} min={0} max={32} step={1} format={(v) => `${v} px`} onChange={(borderWidth) => set({ borderWidth })} />
            {e.borderWidth > 0 && <ColorField label={t("socialCreator.inspector.borderColor")} value={e.borderColor} onChange={(borderColor) => set({ borderColor })} />}
          </>
        )}

        {e.type === "icon" && (
          <>
            <ColorField label={t("socialCreator.inspector.color")} value={e.color} onChange={(color) => set({ color })} />
            <SliderField label={t("socialCreator.inspector.stroke")} value={e.strokeWidth} min={0.5} max={4} step={0.25} onChange={(strokeWidth) => set({ strokeWidth })} />
            <SwitchRow label={t("socialCreator.inspector.filled")} checked={e.fill} onChange={(fill) => set({ fill })} />
          </>
        )}

        {e.type === "score" && (
          <>
            <ColorField label={t("socialCreator.inspector.badgeColor")} value={e.bgColor} onChange={(bgColor) => set({ bgColor })} />
            <ColorField label={t("socialCreator.inspector.textColor")} value={e.color} onChange={(color) => set({ color })} />
          </>
        )}
      </Group>

      <Group value="effects" title={t("socialCreator.inspector.effects")}>
        <SliderField label={t("socialCreator.inspector.opacity")} value={e.opacity ?? 1} min={0} max={1} step={0.01} format={pct} onChange={(opacity) => set({ opacity })} />
        <SwitchRow label={t("socialCreator.inspector.shadow")} checked={!!e.shadow} onChange={(on) => set({ shadow: on ? DEFAULT_SHADOW : null })}>
          {e.shadow && (
            <>
              <SliderField label={t("socialCreator.inspector.shadowBlur")} value={e.shadow.blur} min={0} max={80} step={1} format={(v) => `${v} px`} onChange={(blur) => set({ shadow: { ...e.shadow!, blur } })} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={t("socialCreator.inspector.offsetX")} value={e.shadow.x} onChange={(x) => set({ shadow: { ...e.shadow!, x } })} suffix="px" />
                <NumberField label={t("socialCreator.inspector.offsetY")} value={e.shadow.y} onChange={(y) => set({ shadow: { ...e.shadow!, y } })} suffix="px" />
              </div>
              <ColorField label={t("socialCreator.inspector.shadowColor")} value={e.shadow.color} onChange={(color) => set({ shadow: { ...e.shadow!, color } })} />
            </>
          )}
        </SwitchRow>
        {e.type === "text" && (
          <SwitchRow label={t("socialCreator.inspector.outline")} checked={!!e.strokeWidth} onChange={(on) => set({ strokeWidth: on ? Math.max(1, Math.round(e.fontSize * 0.04)) : 0, strokeColor: e.strokeColor ?? "#19171b" })}>
            <SliderField label={t("socialCreator.inspector.outlineWidth")} value={e.strokeWidth ?? 0} min={1} max={20} step={0.5} format={(v) => `${v} px`} onChange={(strokeWidth) => set({ strokeWidth })} />
            <ColorField label={t("socialCreator.inspector.outlineColor")} value={e.strokeColor ?? "#19171b"} onChange={(strokeColor) => set({ strokeColor })} />
          </SwitchRow>
        )}
        {(e.type === "image" || e.type === "icon" || e.type === "shape") && (
          <div className="flex items-center gap-1">
            <span className="mr-auto text-xs text-muted-foreground">{t("socialCreator.inspector.flip")}</span>
            <Toggle active={!!e.flipX} onClick={() => set({ flipX: !e.flipX })} label={t("socialCreator.inspector.flipX")}>
              <FlipHorizontal2 className="h-4 w-4" />
            </Toggle>
            <Toggle active={!!e.flipY} onClick={() => set({ flipY: !e.flipY })} label={t("socialCreator.inspector.flipY")}>
              <FlipVertical2 className="h-4 w-4" />
            </Toggle>
          </div>
        )}
      </Group>

      <Group value="position" title={t("socialCreator.inspector.position")}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={e.x} onChange={(x) => set({ x })} />
          <NumberField label="Y" value={e.y} onChange={(y) => set({ y })} />
          <NumberField label={t("socialCreator.inspector.width")} value={e.w} onChange={(w) => set({ w: Math.max(4, w) })} />
          <NumberField label={t("socialCreator.inspector.height")} value={e.h} onChange={(h) => set({ h: Math.max(4, h) })} />
        </div>
        <SliderField label={t("socialCreator.inspector.rotation")} value={e.rotation ?? 0} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(rotation) => set({ rotation })} />
      </Group>

      <Group value="animation" title={t("socialCreator.inspector.animation")}>
        <Select value={e.anim?.type ?? "none"} onValueChange={(type) => set({ anim: { ...(e.anim ?? DEFAULT_ANIM), type: type as AnimType } })}>
          <SelectTrigger className="h-8 text-xs" aria-label={t("socialCreator.inspector.animEffect")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANIM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{t(`socialCreator.anim.${o.value}`, o.label)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(e.anim?.type ?? "none") !== "none" && (
          <>
            <SliderField label={t("socialCreator.inspector.delay")} value={e.anim?.delay ?? 0} min={0} max={5000} step={100} format={sec} onChange={(delay) => set({ anim: { ...(e.anim ?? DEFAULT_ANIM), delay } })} />
            <SliderField label={t("socialCreator.inspector.duration")} value={e.anim?.duration ?? 700} min={200} max={4000} step={100} format={sec} onChange={(duration) => set({ anim: { ...(e.anim ?? DEFAULT_ANIM), duration } })} />
          </>
        )}
        <p className="text-[11px] text-muted-foreground">{t("socialCreator.inspector.animHint")}</p>
      </Group>
    </Accordion>
  );
}
