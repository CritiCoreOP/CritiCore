import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MediaSearch from "./MediaSearch";
import type { Provider } from "./sources";
import { newEntry, type TopTenEntry, type TopTenWorld, type Trend } from "./types";

const TRENDS: Trend[] = ["none", "new", "up", "down", "same"];
const MAX_UPLOAD = 6 * 1024 * 1024;
// Raster only: an SVG inside the exported graphic (itself rendered via SVG) breaks the export
const UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];

interface Props {
  entry: TopTenEntry;
  rank: number;
  world: TopTenWorld;
  /** Where the title search looks: the provider of the chosen list */
  provider: Provider;
  canUp: boolean;
  canDown: boolean;
  onChange: (entry: TopTenEntry) => void;
  onMove: (direction: -1 | 1) => void;
  /** Drag and drop between places: this one is picked up, or something is dropped on it */
  onDragStart: () => void;
  onDrop: () => void;
  dropTarget: boolean;
}

/** One place of the list: title (searched or typed), pictures, value and trend */
export default function EntryEditor({ entry, rank, world, provider, canUp, canDown, onChange, onMove, onDragStart, onDrop, dropTarget }: Props) {
  const [over, setOver] = useState(false);
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const set = (patch: Partial<TopTenEntry>) => onChange({ ...entry, ...patch });

  // An own picture stays in the browser as a data URL; nothing is uploaded
  const upload = (file: File | undefined) => {
    if (!file || !UPLOAD_TYPES.includes(file.type) || file.size > MAX_UPLOAD) return;
    const reader = new FileReader();
    reader.onload = () => set({ poster: String(reader.result), backdrop: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <li
      className={cn(
        "grid grid-cols-[2rem_3rem_minmax(0,1fr)] gap-3 rounded-xl border bg-card/40 p-3 transition-colors",
        dropTarget && over ? "border-primary bg-primary/10" : "border-border/60",
      )}
      data-testid="topten-entry"
      onDragOver={(e) => {
        if (!dropTarget) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop();
      }}
    >
      <div className="flex flex-col items-center gap-1 pt-1.5">
        <span className="font-display text-xl font-bold tabular-nums text-foreground">{rank}</span>
        {/* Only the handle drags, so text in the fields can still be selected */}
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(rank));
            onDragStart();
          }}
          className="cursor-grab rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing"
          title={t("admin.topten.dragHandle")}
          aria-hidden="true"
        >
          <GripVertical className="h-4 w-4" />
        </span>
      </div>

      <label className="relative h-[4.5rem] w-12 cursor-pointer overflow-hidden rounded-md bg-muted focus-within:ring-2 focus-within:ring-ring" title={t("admin.topten.upload")}>
        {entry.poster ? (
          <img src={entry.poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <input type="file" accept={UPLOAD_TYPES.join(",")} className="sr-only" aria-label={t("admin.topten.upload")} onChange={(e) => upload(e.target.files?.[0])} />
      </label>

      <div className="grid min-w-0 gap-2">
        <div className="flex gap-2">
          <Input value={entry.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("admin.topten.entryTitle")} aria-label={t("admin.topten.entryTitle")} maxLength={80} />
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="shrink-0" aria-label={t("admin.topten.search")} title={t("admin.topten.search")}>
                <Search className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <MediaSearch
                world={world}
                provider={provider}
                initial={entry.title}
                onPick={(hit) => {
                  set({ title: hit.title, poster: hit.poster, backdrop: hit.backdrop });
                  setSearchOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Input value={entry.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder={t("admin.topten.subtitle")} aria-label={t("admin.topten.subtitle")} maxLength={60} />
          <Input value={entry.value} onChange={(e) => set({ value: e.target.value })} placeholder={t("admin.topten.valuePlaceholder")} aria-label={t("admin.topten.value")} maxLength={20} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={entry.trend ?? "none"} onValueChange={(trend) => set({ trend: trend as Trend })}>
            <SelectTrigger className="h-9 w-40" aria-label={t("admin.topten.trend")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRENDS.map((tr) => (
                <SelectItem key={tr} value={tr}>
                  {t(`admin.topten.trends.${tr}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(entry.trend === "up" || entry.trend === "down") && (
            <Input
              type="number"
              min={1}
              max={99}
              value={entry.trendBy}
              onChange={(e) => set({ trendBy: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
              className="h-9 w-20"
              aria-label={t("admin.topten.places")}
            />
          )}
          <div className="ml-auto flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={!canUp} onClick={() => onMove(-1)} aria-label={t("admin.topten.moveUp")}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={!canDown} onClick={() => onMove(1)} aria-label={t("admin.topten.moveDown")}>
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => onChange({ ...newEntry(), id: entry.id })} aria-label={t("admin.topten.clear")}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
