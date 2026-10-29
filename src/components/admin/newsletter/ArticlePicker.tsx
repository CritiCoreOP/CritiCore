import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { Check, Newspaper, Search } from "lucide-react";
import { usePublishedArticles, type ArticleRef } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** One article (a link) or several (an article section) */
  multiple?: boolean;
  /** Already in the section; shown as chosen and not added twice */
  exclude?: string[];
  onPick: (articles: ArticleRef[]) => void;
  /** Where the focus goes when the dialog closes; without it Radix returns it to the opening button */
  onCloseFocus?: () => void;
}

/** Search published articles by title and pick one or several */
export default function ArticlePicker({ open, onOpenChange, multiple = false, exclude = [], onPick, onCloseFocus }: Props) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [chosen, setChosen] = useState<ArticleRef[]>([]);
  const { data, isLoading, isError } = usePublishedArticles(debounced, open);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (open) setChosen([]);
  }, [open]);

  const toggle = (a: ArticleRef) => {
    if (!multiple) {
      onPick([a]);
      onOpenChange(false);
      return;
    }
    setChosen((list) => (list.some((x) => x.id === a.id) ? list.filter((x) => x.id !== a.id) : [...list, a]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] max-w-xl overflow-hidden p-0"
        onCloseAutoFocus={(e) => {
          if (!onCloseFocus) return;
          e.preventDefault();
          onCloseFocus();
        }}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{multiple ? "Artikel auswählen" : "Artikel verlinken"}</DialogTitle>
          <DialogDescription>Nur veröffentlichte Artikel. Die neuesten stehen oben.</DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titel suchen" aria-label="Artikel suchen" className="pl-9" autoFocus />
          </div>
        </div>
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto px-4 pb-2" aria-busy={isLoading}>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex gap-3 rounded-lg p-2">
                <Skeleton className="h-12 w-20 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ))}
          {isError && <li className="px-2 py-6 text-center text-sm text-destructive">Artikel konnten nicht geladen werden.</li>}
          {!isLoading && !isError && data?.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">Kein veröffentlichter Artikel passt zur Suche.</li>}
          {data?.map((a) => {
            const already = exclude.includes(a.id);
            const selected = already || chosen.some((x) => x.id === a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={already}
                  aria-pressed={multiple ? selected : undefined}
                  onClick={() => toggle(a)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                    selected ? "bg-primary/15" : "hover:bg-secondary/60",
                  )}
                >
                  {a.cover_image_url ? (
                    <img src={a.cover_image_url} alt="" loading="lazy" className="h-12 w-20 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                      <Newspaper className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{a.title}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(a.updated_at)}</span>
                  </span>
                  {multiple && selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
        {multiple && (
          <DialogFooter className="border-t border-border/60 px-6 py-4">
            <Button
              disabled={chosen.length === 0}
              onClick={() => {
                onPick(chosen);
                onOpenChange(false);
              }}
            >
              {chosen.length > 1 ? `${chosen.length} Artikel hinzufügen` : "Artikel hinzufügen"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
