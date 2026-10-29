import { memo, useId } from "react";
import { useTranslation } from "react-i18next";
import { useCategoryTree } from "@/hooks/useCategories";
import type { ExploreTypeFilter } from "@/hooks/useExploreMedia";
import ExploreScrollRow from "./ExploreScrollRow";
import { EXPLORE_THEMES, type ExploreTheme } from "@/lib/exploreThemes";

interface ExploreFilterBarProps {
  mediaType: ExploreTypeFilter;
  rootCategoryId: string | null;
  subCategoryId: string | null;
  onRootCategoryChange: (id: string | null) => void;
  onSubCategoryChange: (id: string | null) => void;
  activeCategorySlug: string | null;
  onApplyTheme: (theme: ExploreTheme) => void;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Chips: 36px tall for touch, filled when active, hairline otherwise
export const chipBase = `inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-[color,background-color,border-color] duration-200 ease-[var(--mcc-ease-out)] ${focusRing}`;
export const chipActive = "border-transparent bg-primary text-primary-foreground";
export const chipIdle =
  "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground";

/** Label to the left of a chip row, wrapping to its own line on narrow screens */
const Row = ({ label, id, children }: { label: string; id: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
    <span id={id} className="w-20 shrink-0 text-sm font-semibold text-foreground">
      {label}
    </span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

/**
 * Curated moods and the genre taxonomy, each in its own labelled row so they read as
 * two different things (a mood rewrites several filters at once, a genre is one of them).
 */
const ExploreFilterBar = ({
  mediaType,
  rootCategoryId,
  subCategoryId,
  onRootCategoryChange,
  onSubCategoryChange,
  activeCategorySlug,
  onApplyTheme,
}: ExploreFilterBarProps) => {
  const { t } = useTranslation();
  const { data: tree } = useCategoryTree();
  const moodId = useId();
  const genreId = useId();

  const roots = tree ?? [];
  const activeRoot = roots.find((c) => c.id === rootCategoryId);
  const subCategories = activeRoot?.children ?? [];

  return (
    <div className="space-y-4">
      <Row label={t("explore.mood")} id={moodId}>
        <ExploreScrollRow role="group" ariaLabel={t("explore.mood")}>
          {EXPLORE_THEMES.map((theme) => {
            const active =
              (!!theme.categorySlug && theme.categorySlug === activeCategorySlug) ||
              (!theme.categorySlug && !!theme.mediaType && theme.mediaType === mediaType);
            return (
              <button
                key={theme.slug}
                type="button"
                onClick={() => onApplyTheme(theme)}
                aria-pressed={active}
                className={`${chipBase} ${active ? chipActive : chipIdle}`}
              >
                {t(`explore.themeSlug.${theme.slug}`, theme.label)}
              </button>
            );
          })}
        </ExploreScrollRow>
      </Row>

      {roots.length > 0 && (
        <Row label={t("explore.genre")} id={genreId}>
          <ExploreScrollRow role="group" ariaLabel={t("explore.genre")}>
            {roots.map((cat) => {
              const active = rootCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onRootCategoryChange(active ? null : cat.id)}
                  aria-pressed={active}
                  className={`${chipBase} ${active ? chipActive : chipIdle}`}
                >
                  {t(`explore.categorySlug.${cat.slug}`, cat.name)}
                </button>
              );
            })}
          </ExploreScrollRow>
        </Row>
      )}

      {/* Subgenres of the chosen genre, indented under it */}
      {activeRoot && subCategories.length > 0 && (
        <div className="explore-card-in sm:pl-24">
          <ExploreScrollRow role="group" ariaLabel={t(`explore.categorySlug.${activeRoot.slug}`, activeRoot.name)}>
            {subCategories.map((sub) => {
              const active = subCategoryId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSubCategoryChange(active ? null : sub.id)}
                  aria-pressed={active}
                  className={`${chipBase} ${active ? chipActive : chipIdle}`}
                >
                  {t(`explore.categorySlug.${sub.slug}`, sub.name)}
                </button>
              );
            })}
          </ExploreScrollRow>
        </div>
      )}
    </div>
  );
};

/** Memoized so the rows do not re-render while the grid pages in during infinite scroll */
export default memo(ExploreFilterBar);
