import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, LayoutList, Newspaper, PanelTop, Plus, Trash2, X } from "lucide-react";
import ArticlePicker from "./ArticlePicker";
import RichTextField from "./RichTextField";
import { articleUrl, safeUrl, type ArticlesBlock, type Block, type TextBlock } from "./types";

interface Props {
  block: Block;
  index: number;
  count: number;
  lang: string;
  onChange: (block: Block) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

/** One section of the issue: frame with move and remove, content by type */
export default function BlockEditor({ block, index, count, lang, onChange, onMove, onRemove }: Props) {
  const name = `${block.type === "text" ? "Textabschnitt" : "Artikel"} ${index + 1}`;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {block.type === "text" ? <PanelTop className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <Newspaper className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          {name}
        </CardTitle>
        <div className="flex">
          <Button variant="ghost" size="icon" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`${name} nach oben`}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`${name} nach unten`}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} disabled={count === 1} aria-label={`${name} entfernen`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`heading-${block.id}`}>Überschrift</Label>
          <Input
            id={`heading-${block.id}`}
            value={block.heading}
            onChange={(e) => onChange({ ...block, heading: e.target.value.slice(0, 120) })}
            placeholder={block.type === "articles" ? "Optional, z. B. Unsere Reviews der Woche" : undefined}
          />
        </div>
        {block.type === "text" ? <TextFields block={block} lang={lang} onChange={onChange} /> : <ArticleFields block={block} onChange={onChange} />}
      </CardContent>
    </Card>
  );
}

function TextFields({ block, lang, onChange }: { block: TextBlock; lang: string; onChange: (b: Block) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <RichTextField id={`body-${block.id}`} label="Text" value={block.body} onChange={(body) => onChange({ ...block, body })} maxLength={4000} lang={lang} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`btn-label-${block.id}`}>Button-Text</Label>
          <Input id={`btn-label-${block.id}`} value={block.linkLabel} onChange={(e) => onChange({ ...block, linkLabel: e.target.value.slice(0, 60) })} placeholder="Zum Review" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-end justify-between gap-2">
            <Label htmlFor={`btn-url-${block.id}`}>Button-Link</Label>
            <button type="button" onClick={() => setPickerOpen(true)} className="text-xs font-medium text-accent-light hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Artikel wählen
            </button>
          </div>
          <Input id={`btn-url-${block.id}`} value={block.linkUrl} onChange={(e) => onChange({ ...block, linkUrl: e.target.value.slice(0, 500) })} placeholder="https://criticore.cc/…" inputMode="url" />
        </div>
      </div>
      {block.linkUrl.trim() && !safeUrl(block.linkUrl) && <p className="text-xs text-destructive">Nur Links mit https:// oder http:// werden übernommen.</p>}
      {safeUrl(block.linkUrl) && !block.linkLabel.trim() && <p className="text-xs text-amber-500">Ohne Button-Text erscheint kein Button.</p>}
      <ArticlePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={([a]) => a && onChange({ ...block, linkUrl: articleUrl(a.slug, lang), linkLabel: block.linkLabel || "Weiterlesen" })}
      />
    </>
  );
}

function ArticleFields({ block, onChange }: { block: ArticlesBlock; onChange: (b: Block) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const move = (i: number, dir: -1 | 1) => {
    const list = [...block.articles];
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    onChange({ ...block, articles: list });
  };

  return (
    <>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Darstellung</legend>
        <div className="flex gap-2">
          {(
            [
              ["card", "Große Karten", PanelTop],
              ["list", "Kompakte Liste", LayoutList],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={block.layout === value}
              onClick={() => onChange({ ...block, layout: value })}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                block.layout === value ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {block.articles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">Noch kein Artikel ausgewählt.</p>
      ) : (
        <ol className="space-y-1.5">
          {block.articles.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-1.5 pl-2">
              {a.cover_image_url ? (
                <img src={a.cover_image_url} alt="" loading="lazy" className="h-9 w-14 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-secondary text-muted-foreground">
                  <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.title}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`„${a.title}“ nach oben`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, 1)} disabled={i === block.articles.length - 1} aria-label={`„${a.title}“ nach unten`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange({ ...block, articles: block.articles.filter((x) => x.id !== a.id) })} aria-label={`„${a.title}“ entfernen`}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPickerOpen(true)} disabled={block.articles.length >= 10}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Artikel hinzufügen
      </Button>
      <p className="text-xs text-muted-foreground">Titel, Teaser und Bild kommen aus dem Artikel. Gibt es eine Übersetzung in der Newsletter-Sprache, wird sie verwendet.</p>

      <ArticlePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        multiple
        exclude={block.articles.map((a) => a.id)}
        onPick={(list) => onChange({ ...block, articles: [...block.articles, ...list].slice(0, 10) })}
      />
    </>
  );
}
