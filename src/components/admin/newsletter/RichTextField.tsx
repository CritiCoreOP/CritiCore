import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bold, Link2, Newspaper } from "lucide-react";
import ArticlePicker from "./ArticlePicker";
import { articleUrl, safeUrl } from "./types";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  placeholder?: string;
  /** Newsletter language, for the address of linked articles */
  lang: string;
}

/**
 * Text field with the two marks the newsletter understands: **bold** and [link text](address).
 * The buttons wrap the selected text, so nobody has to type the syntax.
 */
export default function RichTextField({ id, label, value, onChange, maxLength, rows = 4, placeholder, lang }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [url, setUrl] = useState("");
  // Selection when the link menu opened; the textarea loses it to the popover
  const selection = useRef({ start: 0, end: 0 });

  const remember = () => {
    const el = ref.current;
    selection.current = { start: el?.selectionStart ?? value.length, end: el?.selectionEnd ?? value.length };
  };

  const focusAt = (pos: number) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(pos, pos);
  };

  /**
   * Replaces the remembered selection; the cursor goes behind the insertion. After the article
   * dialog the dialog itself hands the focus back (onCloseFocus), otherwise it would take it away again.
   */
  const insert = (make: (selected: string) => string, refocus = true) => {
    const { start, end } = selection.current;
    const text = make(value.slice(start, end));
    const next = (value.slice(0, start) + text + value.slice(end)).slice(0, maxLength);
    onChange(next);
    const pos = Math.min(start + text.length, next.length);
    selection.current = { start: pos, end: pos };
    if (refocus) requestAnimationFrame(() => focusAt(pos));
  };

  const bold = () => {
    remember();
    insert((s) => `**${s || "fett"}**`);
  };

  const link = (href: string, fallbackText: string, refocus = true) =>
    insert((s) => `[${(s || fallbackText).replace(/[[\]]/g, "")}](${href})`, refocus);

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={bold} aria-label={`${label}: markierten Text fett`}>
            <Bold className="h-3.5 w-3.5" aria-hidden="true" />
            Fett
          </Button>
          <Popover
            open={linkOpen}
            onOpenChange={(o) => {
              if (o) remember();
              setLinkOpen(o);
            }}
          >
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" aria-label={`${label}: Link einfügen`}>
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                Link
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  setLinkOpen(false);
                  setPickerOpen(true);
                }}
              >
                <Newspaper className="h-4 w-4" aria-hidden="true" />
                Artikel verlinken
              </Button>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const href = safeUrl(url);
                  if (!href) return;
                  link(href, href.replace(/^https?:\/\//, ""));
                  setUrl("");
                  setLinkOpen(false);
                }}
              >
                <Label htmlFor={`${id}-url`} className="text-xs">Oder eine Adresse</Label>
                <div className="flex gap-2">
                  <Input id={`${id}-url`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
                  <Button type="submit" size="sm" disabled={!safeUrl(url)}>
                    Einfügen
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Markierter Text wird zum Linktext.</p>
              </form>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Textarea id={id} ref={ref} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value.slice(0, maxLength))} />
      <p className="text-xs text-muted-foreground">Leerzeile = neuer Absatz. **fett** und [Linktext](https://…) werden in der Mail formatiert.</p>
      <ArticlePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={([a]) => a && link(articleUrl(a.slug, lang), a.title, false)}
        // Radix can report the close twice; the second time must not undo a selection made since
        onCloseFocus={() => document.activeElement !== ref.current && focusAt(selection.current.start)}
      />
    </div>
  );
}
