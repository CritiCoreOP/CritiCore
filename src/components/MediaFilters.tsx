import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "@/lib/locale-router";
import { useCategoryTree, useTags, type Category } from "@/hooks/useCategories";
import { useMovieGenres, useSeriesGenres, useWatchProviders } from "@/hooks/useMedia";
import { tmdbImage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronRight as ChevronRightTwoTone, X as CloseTwoTone, ChevronDown as ExpandMoreTwoTone, Filter as FilterListTwoTone } from "lucide-react";

/* ── Collapsible Filter Section ── */

const FilterSection = ({
  title, defaultOpen = true, children,
}: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/40 pb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full py-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        {title}
        <ExpandMoreTwoTone
          className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
};

/* ── Chip Button ── */

const ChipButton = ({
  active, label, onClick,
}: {
  active: boolean; label: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
      active
        ? "bg-primary text-primary-foreground border-primary shadow-sm"
        : "bg-secondary/60 text-secondary-foreground border-border/50 hover:border-primary/40 hover:bg-secondary"
    )}
  >
    {label}
  </button>
);

/* ── Main Component ── */

const MediaFilters = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { data: tree } = useCategoryTree();
  const { data: tags } = useTags("approved");
  const { data: movieGenres } = useMovieGenres();
  const { data: seriesGenres } = useSeriesGenres();
  const { data: watchProviders } = useWatchProviders();

  const activeCategory = params.get("kategorie") || "";
  const activeType = params.get("typ") || "";
  const activeStatus = params.get("status") || "";
  const activeTag = params.get("tag") || "";
  const activeGenre = params.get("genre") || "";
  const activeSort = params.get("sort") || "";
  const releaseDateFrom = params.get("from") || "";
  const releaseDateTo = params.get("to") || "";
  const activeProvider = params.get("provider") || "";

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams({}, { replace: true });
  const hasFilters = activeCategory || activeType || activeStatus || activeTag || activeGenre || activeSort || releaseDateFrom || releaseDateTo || activeProvider;

  const types = [
    { value: "movie", label: t("explore.typeMovie") },
    { value: "series", label: t("explore.typeSeries") },
    { value: "game", label: t("explore.typeGame") },
  ];

  const statuses = [
    { value: "released", label: t("explore.statusReleased") },
    { value: "upcoming", label: t("explore.statusUpcoming") },
    { value: "delayed", label: t("explore.statusDelayed") },
    { value: "cancelled", label: t("explore.statusCancelled") },
  ];

  const sortOptions = [
    { value: "trending", label: t("explore.sortTrending", "Trending") },
    { value: "rating", label: t("explore.sortRating", "Rating") },
    { value: "newest", label: t("explore.sortNewest", "Newest") },
    { value: "oldest", label: t("explore.sortOldest", "Oldest") },
  ];

  // Merge movie + series genres, deduplicate by name
  const allGenres = (() => {
    const map = new Map<string, { id: number; name: string }>();
    movieGenres?.forEach(g => map.set(g.name, g));
    seriesGenres?.forEach(g => { if (!map.has(g.name)) map.set(g.name, g); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FilterListTwoTone className="w-3.5 h-3.5" />
          {t("explore.filters")}
        </h3>
        {hasFilters && (
          <button onClick={clearAll} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
            <CloseTwoTone className="w-3 h-3" /> {t("explore.clearFilters")}
          </button>
        )}
      </div>

      {/* Sort */}
      <FilterSection title={t("explore.sortBy", "Sort")}>
        <div className="flex flex-wrap gap-1.5">
          {sortOptions.map(s => (
            <ChipButton
              key={s.value}
              active={activeSort === s.value}
              label={s.label}
              onClick={() => updateParam("sort", activeSort === s.value ? "" : s.value)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Where To Watch */}
      {watchProviders && watchProviders.length > 0 && (
        <FilterSection title={t("explore.whereToWatch", "Where To Watch")} defaultOpen={false}>
          <div className="grid grid-cols-5 gap-1.5">
            {watchProviders.map(p => (
              <button
                key={p.provider_id}
                onClick={() => updateParam("provider", activeProvider === String(p.provider_id) ? "" : String(p.provider_id))}
                className={cn(
                  "relative rounded-lg overflow-hidden border-2 transition-all duration-200 aspect-square",
                  activeProvider === String(p.provider_id)
                    ? "border-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)] scale-105"
                    : "border-transparent hover:border-border opacity-80 hover:opacity-100"
                )}
                title={p.provider_name}
              >
                {p.logo_path ? (
                  <img
                    src={tmdbImage(p.logo_path, "w92")!}
                    alt={p.provider_name}
                    className="w-full h-full object-cover rounded-md"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-[9px] text-muted-foreground font-medium p-0.5 text-center leading-tight">
                    {p.provider_name.slice(0, 8)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Media Type */}
      <FilterSection title={t("explore.mediaType")}>
        <div className="flex flex-wrap gap-1.5">
          {types.map(tp => (
            <ChipButton
              key={tp.value}
              active={activeType === tp.value}
              label={tp.label}
              onClick={() => updateParam("typ", activeType === tp.value ? "" : tp.value)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Release Status */}
      <FilterSection title={t("explore.releaseStatus")}>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map(s => (
            <ChipButton
              key={s.value}
              active={activeStatus === s.value}
              label={s.label}
              onClick={() => updateParam("status", activeStatus === s.value ? "" : s.value)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Release Date Range */}
      <FilterSection title={t("explore.releaseDates", "Release Dates")} defaultOpen={false}>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">{t("explore.from", "From")}</label>
            <input
              type="date"
              value={releaseDateFrom}
              onChange={e => updateParam("from", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">{t("explore.to", "To")}</label>
            <input
              type="date"
              value={releaseDateTo}
              onChange={e => updateParam("to", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </FilterSection>

      {/* Genres */}
      {allGenres.length > 0 && (
        <FilterSection title={t("explore.genres", "Genres")} defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {allGenres.map(g => (
              <ChipButton
                key={g.id}
                active={activeGenre === String(g.id)}
                label={g.name}
                onClick={() => updateParam("genre", activeGenre === String(g.id) ? "" : String(g.id))}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Categories */}
      {tree && tree.length > 0 && (
        <FilterSection title={t("explore.categories")} defaultOpen={false}>
          <div className="space-y-0.5">
            {tree.map(cat => (
              <CategoryItem
                key={cat.id}
                category={cat}
                activeSlug={activeCategory}
                onSelect={slug => updateParam("kategorie", activeCategory === slug ? "" : slug)}
                depth={0}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <FilterSection title={t("explore.tags")} defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <Badge
                key={tag.id}
                variant={activeTag === tag.slug ? "default" : "secondary"}
                className="cursor-pointer text-[11px]"
                onClick={() => updateParam("tag", activeTag === tag.slug ? "" : tag.slug)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
};

/* ── Category Tree Item ── */

const CategoryItem = ({
  category, activeSlug, onSelect, depth,
}: {
  category: Category; activeSlug: string; onSelect: (slug: string) => void; depth: number;
}) => {
  const isActive = activeSlug === category.slug;
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div>
      <button
        onClick={() => onSelect(category.slug)}
        className={cn(
          "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1",
          isActive ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        )}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
      >
        {hasChildren && (
          <ChevronRightTwoTone className={cn("w-3 h-3 transition-transform", isActive && "rotate-90")} />
        )}
        {category.name}
      </button>
      {hasChildren && (isActive || category.children!.some(c => c.slug === activeSlug)) && (
        <div className="ml-1.5">
          {category.children!.map(child => (
            <CategoryItem key={child.id} category={child} activeSlug={activeSlug} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaFilters;
