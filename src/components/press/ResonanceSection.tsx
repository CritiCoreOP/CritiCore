import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { articleCategoryLabel } from "@/lib/article-labels";
import { Heart } from "lucide-react";
import type { DashArticle } from "@/hooks/usePressDashboard";
import DashboardSection from "./DashboardSection";
import { focusRing } from "./styles";

interface Props {
  published: DashArticle[];
  reactions: Record<string, number>;
}

/**
 * How readers responded to the published articles. Reactions are the only reader signal the site
 * stores per article (no view counts), so this says reactions and nothing more.
 */
export default function ResonanceSection({ published, reactions }: Props) {
  const { t } = useTranslation();
  const total = published.reduce((sum, a) => sum + (reactions[a.id] ?? 0), 0);
  const top = [...published].sort((a, b) => (reactions[b.id] ?? 0) - (reactions[a.id] ?? 0) || b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  return (
    <DashboardSection id="dash-resonance" title={t("redaktion.dash.resonance.title")}>
      {published.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {t("redaktion.dash.resonance.empty")}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">{t("redaktion.dash.resonance.published")}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-foreground">{published.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("redaktion.dash.resonance.reactions")}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-foreground">{total}</dd>
            </div>
          </dl>
          <ol className="mt-4 space-y-1 border-t border-border/40 pt-3">
            {top.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/news/${a.slug}`}
                  className={`flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/50 ${focusRing}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{a.title}</span>
                    <span className="text-xs text-muted-foreground">{articleCategoryLabel(t, a.category || "general")}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-muted-foreground" aria-label={t("redaktion.dash.resonance.count", { count: reactions[a.id] ?? 0 })}>
                    <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                    {reactions[a.id] ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </DashboardSection>
  );
}
