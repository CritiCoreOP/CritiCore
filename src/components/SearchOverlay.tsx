import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useGlobalSearch } from "@/hooks/useMedia";
import { tmdbImage, rawgImageResize } from "@/lib/api";
import { useNavigate } from "@/lib/locale-router";
import { useTranslation } from "react-i18next";
import { readRecentSearches, rememberSearch } from "@/lib/recentSearches";
import {
  X as CloseIcon,
  Tv as TvIcon,
  Film as FilmIcon,
  Search as SearchIcon,
  Gamepad2 as GameIcon,
  Clock as ClockIcon,
  ArrowLeft as BackIcon,
  ArrowRight as ArrowIcon,
} from "lucide-react";

type ResultItem = {
  key: string;
  title: string;
  image: string | null;
  path: string;
  kind: "movie" | "series" | "game";
};

const SearchOverlay = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [recents, setRecents] = useState<string[]>(readRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useGlobalSearch(query);
  const navigate = useNavigate();

  // Entrance animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Debounce the query so typing stays smooth
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setVisible(false);
    inputRef.current?.blur();
    setTimeout(onClose, 200);
  }, [closing, onClose]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const rememberQuery = (q: string) => setRecents(rememberSearch(q));

  const goTo = (path: string) => {
    rememberQuery(input);
    handleClose();
    setTimeout(() => navigate(path), 120);
  };

  /* Enter or "show all": every hit, sorted by kind, on the results page */
  const openSearchPage = () => {
    const term = input.trim();
    if (term.length < 2) return;
    goTo(`/suche?q=${encodeURIComponent(term)}`);
  };

  const sections: { key: string; label: string; icon: JSX.Element; items: ResultItem[] }[] = [
    {
      key: "movies",
      label: t("search.movies"),
      icon: <FilmIcon className="w-4 h-4" />,
      items: (data?.movies || []).slice(0, 8).map((m) => ({
        key: `m-${m.id}`,
        title: m.title,
        image: tmdbImage(m.poster_path),
        path: `/filme/${m.id}`,
        kind: "movie" as const,
      })),
    },
    {
      key: "series",
      label: t("search.series"),
      icon: <TvIcon className="w-4 h-4" />,
      items: (data?.series || []).slice(0, 8).map((s) => ({
        key: `s-${s.id}`,
        title: s.name || s.title,
        image: tmdbImage(s.poster_path),
        path: `/serien/${s.id}`,
        kind: "series" as const,
      })),
    },
    {
      key: "games",
      label: t("search.games"),
      icon: <GameIcon className="w-4 h-4" />,
      items: (data?.games || []).slice(0, 8).map((g) => ({
        key: `g-${g.id}`,
        title: g.name,
        image: g.background_image ? rawgImageResize(g.background_image, 420) : null,
        path: `/games/${g.id}`,
        kind: "game" as const,
      })),
    },
  ].filter((s) => s.items.length > 0);

  const hasQuery = query.length >= 2;
  const showEmpty = hasQuery && !isLoading && sections.length === 0;

  return createPortal(
    <div

      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        maxWidth: "none",
        transform: "none",
        background: "hsl(var(--background) / 0.92)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      role="dialog"
      data-fullscreen-overlay=""
      aria-modal="true"
    >
      {/* Search bar */}
      <div
        className="px-3 sm:px-6 pb-3 border-b border-border/40"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          transform: visible ? "translateY(0)" : "translateY(-12px)",
          transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            onClick={handleClose}
            className="sm:hidden flex items-center justify-center w-11 h-11 shrink-0 rounded-full text-muted-foreground active:bg-foreground/[0.06] transition-colors"
            aria-label={t("common.back", "Zurück")}
          >
            <BackIcon className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openSearchPage()}
              enterKeyHint="search"
              aria-label={t("search.placeholder")}
              autoComplete="off"
              autoCorrect="off"
              placeholder={t("search.placeholder")}
              className="w-full h-12 pl-11 pr-10 rounded-full bg-secondary/50 border border-border/50 text-foreground text-base placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:bg-secondary/70 transition-all duration-300"
            />
            {input && (
              <button
                onClick={() => {
                  setInput("");
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground active:bg-foreground/[0.06] transition-colors"
                aria-label={t("common.clear", "Löschen")}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleClose}
            className="hidden sm:flex items-center justify-center w-11 h-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            aria-label={t("common.close", "Schließen")}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 pt-4"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Recent searches */}
          {!hasQuery && recents.length > 0 && (
            <div className="animate-fade-in">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {t("search.recent", "Zuletzt gesucht")}
              </p>
              <div className="flex flex-wrap gap-2">
                {recents.map((r) => (
                  <button
                    key={r}
                    onClick={() => setInput(r)}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-secondary/50 border border-border/40 text-sm text-foreground/90 active:bg-secondary/80 transition-colors"
                  >
                    <ClockIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasQuery && recents.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">
              {t("search.hint", "Suche nach Filmen, Serien und Games")}
            </p>
          )}

          {/* Skeletons */}
          {hasQuery && isLoading && (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-[4.5rem] rounded-lg bg-secondary/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-secondary/60" />
                    <div className="h-3 w-1/4 rounded bg-secondary/40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {hasQuery && !isLoading && sections.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              {sections.map((section) => (
                <div key={section.key}>
                  <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    {section.icon}
                    {section.label}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => goTo(item.path)}
                        className="w-full flex items-center gap-3 p-2 rounded-2xl text-left active:bg-secondary/60 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="w-12 h-[4.5rem] shrink-0 rounded-lg overflow-hidden bg-secondary">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.title}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] text-foreground font-medium line-clamp-2">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{section.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {/* Up to eight per kind here; everything, plus anime and articles, on the results page */}
              <button
                type="button"
                onClick={openSearchPage}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/50 bg-secondary/40 px-4 py-3.5 text-left text-[15px] font-medium text-foreground active:bg-secondary/70 hover:bg-secondary/60 transition-colors"
              >
                <span className="min-w-0 truncate">{t("search.showAll")}</span>
                <ArrowIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>
          )}

          {showEmpty && (
            <div className="text-center py-14 animate-fade-in">
              <SearchIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">{t("search.noResults")}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SearchOverlay;
