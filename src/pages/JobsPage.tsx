import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Briefcase } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs } from "@/hooks/useJobs";
import { DEFAULT_APPLY_EMAIL } from "@/lib/jobs";
import JobMeta from "@/components/jobs/JobMeta";
import { Link } from "@/lib/locale-router";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const JobsPage = () => {
  const { t } = useTranslation();
  const { data: jobs, isLoading, isError, refetch } = useJobs();

  useEffect(() => {
    setSeo({ title: t("meta.jobs.title"), description: t("meta.jobs.description"), url: "/jobs" });
    return () => cleanupSeo();
  }, [t]);

  const initiative = `mailto:${DEFAULT_APPLY_EMAIL}?subject=${encodeURIComponent(t("jobs.initiativeSubject"))}`;

  return (
    <Page>
      <Container>
        <div className="mx-auto max-w-4xl">
          <header className="max-w-2xl motion-safe:animate-fade-in">
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-5xl">{t("jobs.title")}</h1>
            <p className="mt-4 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">{t("jobs.intro")}</p>
          </header>

          <section aria-labelledby="open-jobs" className="mt-14">
            <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3">
              <h2 id="open-jobs" className="font-display text-xl font-bold text-foreground">
                {t("jobs.openTitle")}
              </h2>
              {jobs && jobs.length > 0 && <span className="text-sm tabular-nums text-muted-foreground">{t("jobs.count", { count: jobs.length })}</span>}
            </div>

            {isLoading ? (
              <div className="divide-y divide-border/60" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2 py-6">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-full max-w-lg" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-wrap items-center gap-3 py-10 text-sm text-muted-foreground">
                {t("jobs.loadError")}
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  {t("jobs.retry")}
                </Button>
              </div>
            ) : !jobs?.length ? (
              <div className="flex items-start gap-3 py-10">
                <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">{t("jobs.emptyTitle")}</p>
                  <p className="mt-1 max-w-[55ch] text-sm leading-relaxed text-muted-foreground">{t("jobs.emptyText")}</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <Link to={`/jobs/${job.slug}`} className={cn("group grid gap-4 rounded-sm py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center", focusRing)}>
                      <div className="min-w-0">
                        {job.team && <p className="mb-1 text-xs font-semibold text-accent-light">{job.team}</p>}
                        <h3 className="font-display text-xl font-bold leading-snug text-foreground underline-offset-4 [@media(hover:hover)]:group-hover:underline md:text-2xl">
                          {job.title}
                        </h3>
                        <JobMeta job={job} className="mt-1.5" />
                        {job.summary && <p className="mt-3 max-w-[62ch] leading-relaxed text-foreground/80">{job.summary}</p>}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        {t("jobs.view")}
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="mt-16 grid items-center gap-5 rounded-2xl border border-border/60 bg-card/40 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-8">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">{t("jobs.initiativeTitle")}</h2>
              <p className="mt-1.5 max-w-[55ch] text-sm leading-relaxed text-muted-foreground">{t("jobs.initiativeText")}</p>
            </div>
            <Button asChild variant="outline" className="w-full sm:w-auto active:scale-[0.98]">
              <a href={initiative}>{t("jobs.initiativeButton")}</a>
            </Button>
          </aside>
        </div>
      </Container>
    </Page>
  );
};

export default JobsPage;
