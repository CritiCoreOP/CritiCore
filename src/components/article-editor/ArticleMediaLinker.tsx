import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { globalSearch, tmdbImage } from "@/lib/api";
import { X as CloseTwoTone, Link as LinkTwoTone, Tv as LiveTvTwoTone, Film as MovieTwoTone, Search as SearchTwoTone, Gamepad2 as SportsEsportsTwoTone } from "lucide-react";

interface MediaLink {
  id?: string;
  media_id: string;
  media_type: "movie" | "series" | "game";
  media_title: string;
  media_poster: string | null;
}

interface ArticleMediaLinkerProps {
  articleId: string | null;
  userId: string | undefined;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  movie: <MovieTwoTone className="w-4 h-4" />,
  series: <LiveTvTwoTone className="w-4 h-4" />,
  game: <SportsEsportsTwoTone className="w-4 h-4" />,
};

const TYPE_LABEL_KEY: Record<string, string> = {
  movie: "explore.typeMovie",
  series: "explore.typeSeries",
  game: "explore.typeGame",
};

const ArticleMediaLinker = ({ articleId, userId }: ArticleMediaLinkerProps) => {
  const { t } = useTranslation();
  const [links, setLinks] = useState<MediaLink[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaLink[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load existing links
  useEffect(() => {
    if (!articleId) return;
    const load = async () => {
      const { data } = await supabase
        .from("article_media_links")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: true });
      if (data) {
        setLinks(data.map((d: any) => ({
          id: d.id,
          media_id: d.media_id,
          media_type: d.media_type,
          media_title: d.media_title,
          media_poster: d.media_poster,
        })));
      }
    };
    load();
  }, [articleId]);

  // Search with debounce
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const { movies, series, games } = await globalSearch(q.trim());
        const mapped: MediaLink[] = [
          ...movies.slice(0, 5).map(m => ({
            media_id: String(m.id),
            media_type: "movie" as const,
            media_title: m.title || m.name || "",
            media_poster: tmdbImage(m.poster_path, "w92"),
          })),
          ...series.slice(0, 5).map(s => ({
            media_id: String(s.id),
            media_type: "series" as const,
            media_title: s.name || s.title || "",
            media_poster: tmdbImage(s.poster_path, "w92"),
          })),
          ...games.slice(0, 5).map(g => ({
            media_id: String(g.id),
            media_type: "game" as const,
            media_title: g.name,
            media_poster: g.background_image || null,
          })),
        ];
        // Filter out already linked
        const linkedIds = new Set(links.map(l => `${l.media_type}-${l.media_id}`));
        setResults(mapped.filter(r => !linkedIds.has(`${r.media_type}-${r.media_id}`)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    setSearchTimeout(timeout);
  }, [links, searchTimeout]);

  const addLink = async (item: MediaLink) => {
    if (!articleId || !userId) {
      toast.error(t("article.mediaLink.saveFirst", "Bitte speichere den Artikel zuerst."));
      return;
    }
    const { data, error } = await supabase
      .from("article_media_links")
      .insert({
        article_id: articleId,
        media_id: item.media_id,
        media_type: item.media_type,
        media_title: item.media_title,
        media_poster: item.media_poster,
        added_by: userId,
      } as any)
      .select("id")
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      return;
    }
    setLinks(prev => [...prev, { ...item, id: data?.id }]);
    setResults(prev => prev.filter(r => !(r.media_id === item.media_id && r.media_type === item.media_type)));
    toast.success(t("article.mediaLink.added", "Verknüpft!"));
  };

  const removeLink = async (item: MediaLink) => {
    if (!item.id) return;
    const { error } = await supabase.from("article_media_links").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLinks(prev => prev.filter(l => l.id !== item.id));
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        <LinkTwoTone className="w-4 h-4 text-primary" />
        {t("article.mediaLink.label", "Verknüpfte Medien")}
      </Label>
      <p className="text-xs text-muted-foreground">
        {t("article.mediaLink.desc", "Verknüpfe diesen Artikel mit Filmen, Serien oder Games.")}
      </p>

      {/* Linked items */}
      {links.length > 0 && (
        <div className="space-y-1.5">
          {links.map((link) => (
            <div key={`${link.media_type}-${link.media_id}`} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/40">
              {link.media_poster ? (
                <img src={link.media_poster} alt="" className="w-8 h-10 rounded object-cover shrink-0" />
              ) : (
                <div className="w-8 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                  {TYPE_ICON[link.media_type]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{link.media_title}</p>
                <Badge variant="outline" className="text-[10px]">{t(TYPE_LABEL_KEY[link.media_type])}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => removeLink(link)} aria-label={t("common.delete")}>
                <CloseTwoTone className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <SearchTwoTone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t("article.mediaLink.searchPlaceholder", "Film, Serie oder Game suchen…")}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Search results */}
      {(results.length > 0 || searching) && (
        <div className="max-h-52 overflow-y-auto space-y-1 border border-border/40 rounded-lg p-1.5">
          {searching && (
            <p className="text-xs text-muted-foreground text-center py-2 animate-pulse">
              {t("common.loading", "Lädt...")}
            </p>
          )}
          {results.map((r) => (
            <button
              key={`${r.media_type}-${r.media_id}`}
              className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
              onClick={() => addLink(r)}
            >
              {r.media_poster ? (
                <img src={r.media_poster} alt="" className="w-7 h-9 rounded object-cover shrink-0" />
              ) : (
                <div className="w-7 h-9 rounded bg-muted shrink-0 flex items-center justify-center">
                  {TYPE_ICON[r.media_type]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{r.media_title}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{t(TYPE_LABEL_KEY[r.media_type])}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticleMediaLinker;
