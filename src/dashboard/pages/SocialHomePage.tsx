import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";
import { NAV } from "../nav";
import { DraftsPanel, UnsharedPanel } from "../panels";
import { PLATFORM_SPECS, PLATFORMS, type Platform } from "../social/postTemplates";
import { PageHeader, Panel, focusRing } from "../ui";

function useWeekShares() {
  return useQuery({
    queryKey: ["dash", "shares-week"],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data, error } = await supabase.from("social_shares").select("platform").gte("shared_at", since).limit(2000);
      if (error) throw error;
      const counts = Object.fromEntries(PLATFORMS.map((p) => [p, 0])) as Record<Platform, number>;
      for (const row of data ?? []) if (row.platform in counts) counts[row.platform as Platform] += 1;
      return counts;
    },
  });
}

export default function SocialHomePage() {
  const { t } = useTranslation();
  const week = useWeekShares();
  const tools = NAV.find((g) => g.id === "social")!.items.filter((i) => i.id !== "social");

  return (
    <div className="grid gap-6">
      <PageHeader title={t("dash.groups.social")} description={t("dash.social.intro")} />

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link
              to={tool.path}
              className={cn("group flex h-full flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card/70 active:scale-[0.99]", focusRing)}
            >
              <span className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <tool.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {tool.standalone && <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-label={t("dash.fullscreen")} />}
              </span>
              <span>
                <span className="block font-display text-base font-bold text-foreground">{t(...tool.label)}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t(`dash.social.tools.${tool.id}`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Panel title={t("dash.social.weekTitle")}>
        {week.isError ? (
          <p className="text-sm text-muted-foreground">{t("dash.social.weekUnavailable")}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
            {PLATFORMS.map((p) => (
              <div key={p}>
                <dt className="text-sm text-muted-foreground">{PLATFORM_SPECS[p].name}</dt>
                <dd className={cn("text-2xl font-semibold tabular-nums text-foreground", week.isLoading && "animate-pulse text-muted-foreground motion-reduce:animate-none")}>{week.data?.[p] ?? 0}</dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <UnsharedPanel days={14} />
        <DraftsPanel />
      </div>
    </div>
  );
}
