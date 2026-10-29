import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpRight, EyeOff, Link2, Mail } from "lucide-react";
import Footer from "@/components/Footer";
import JobMeta from "@/components/jobs/JobMeta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJob } from "@/hooks/useJobs";
import { applyHref, bulletLines, isOpen, jobPostingJsonLd, paragraphs, DEFAULT_APPLY_EMAIL } from "@/lib/jobs";
import { formatDate } from "@/lib/locale";
import { Link, useParams } from "@/lib/locale-router";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

const SITE_URL = "https://criticore.cc";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function PointList({ title, text }: { title: string; text: string }) {
  const items = bulletLines(text);
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-3 leading-relaxed text-foreground/90">
            <span className="mt-[0.7em] h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

const JobDetailPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { data: job, isLoading } = useJob(slug);
  const open = !!job && isOpen(job);

  useEffect(() => {
    if (!job) return;
    setSeo({
      title: t("meta.jobDetail.title", { title: job.title }),
      description: job.summary || t("meta.jobs.description"),
      url: `/jobs/${job.slug}`,
      // Only open positions go to Google's job search; a closed one must not stay listed there
      jsonLd: open ? jobPostingJsonLd(job, { tasks: t("jobs.tasks"), profile: t("jobs.profile"), offer: t("jobs.offer") }, SITE_URL) : undefined,
    });
    return () => cleanupSeo();
  }, [job, open, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pb-20 pt-20 md:pt-24" aria-busy="true">
          <div className="mx-auto max-w-5xl space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-24 w-full max-w-2xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pb-20 pt-24 md:pt-32">
          <div className="mx-auto max-w-xl">
            <h1 className="font-display text-3xl font-bold text-foreground">{t("jobs.notFoundTitle")}</h1>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t("jobs.notFoundText")}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/jobs">{t("jobs.allJobs")}</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const href = applyHref(job, t("jobs.applySubject"));
  const external = href.startsWith("https://");
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split("#")[0]);
      toast.success(t("jobs.linkCopied"));
    } catch {
      // Clipboard blocked
    }
  };

  const facts: { label: string; value: string }[] = [
    { label: t("jobs.factType"), value: t(`jobs.type.${job.employment_type}`, { defaultValue: job.employment_type }) },
    { label: t("jobs.factPlace"), value: [t(`jobs.workplace.${job.workplace}`, { defaultValue: job.workplace }), job.workplace !== "remote" ? job.location : null].filter(Boolean).join(", ") },
    ...(job.team ? [{ label: t("jobs.factTeam"), value: job.team }] : []),
    ...(job.valid_through ? [{ label: t("jobs.factUntil"), value: formatDate(`${job.valid_through}T12:00:00`, { day: "numeric", month: "long", year: "numeric" }) }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pb-20 pt-20 md:pt-24">
        <div className="mx-auto max-w-5xl">
          <Link to="/jobs" className={cn("mb-8 inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground", focusRing)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("jobs.allJobs")}
          </Link>

          {!open && (
            <p className="mb-6 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" /> {t("jobs.previewNote")}
            </p>
          )}

          <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <header className="max-w-2xl lg:col-start-1 lg:row-start-1">
              {job.team && <p className="mb-2 text-sm font-semibold text-accent-light">{job.team}</p>}
              <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">{job.title}</h1>
              <JobMeta job={job} className="mt-3 text-base" />
              {job.summary && <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-foreground/85">{job.summary}</p>}
            </header>

            {/* On phones right under the title, next to the text from lg on */}
            <aside className="self-start rounded-2xl border border-border/60 bg-card/50 p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <dl className="grid gap-3 text-sm">
                {facts.map((f) => (
                  <div key={f.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="font-medium text-foreground">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <Button asChild className="mt-5 w-full gap-2 active:scale-[0.98]">
                <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {external ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
                  {t("jobs.apply")}
                </a>
              </Button>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {external ? t("jobs.applyExternal", { host: new URL(href).hostname }) : t("jobs.applyByMail", { email: job.apply_email || DEFAULT_APPLY_EMAIL })}
              </p>
              <button type="button" onClick={copyLink} className={cn("mt-4 inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground", focusRing)}>
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("jobs.copyLink")}
              </button>
            </aside>

            <div className="max-w-2xl lg:col-start-1">
              {paragraphs(job.description).map((p, i) => (
                <p key={i} className="mb-5 whitespace-pre-line text-[1.0625rem] leading-[1.75] text-foreground/90">
                  {p}
                </p>
              ))}
              <PointList title={t("jobs.tasks")} text={job.tasks} />
              <PointList title={t("jobs.profile")} text={job.profile} />
              <PointList title={t("jobs.offer")} text={job.offer} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default JobDetailPage;
