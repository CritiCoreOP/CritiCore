import { useTranslation } from "react-i18next";
import type { JobPosting } from "@/lib/jobs";
import { cn } from "@/lib/utils";

/** "Freelance · Remote" or "Teilzeit · Hybrid, Solingen" */
export default function JobMeta({ job, className }: { job: Pick<JobPosting, "employment_type" | "workplace" | "location">; className?: string }) {
  const { t } = useTranslation();
  const place = [t(`jobs.workplace.${job.workplace}`, { defaultValue: job.workplace }), job.workplace !== "remote" ? job.location : null].filter(Boolean).join(", ");
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {t(`jobs.type.${job.employment_type}`, { defaultValue: job.employment_type })} · {place}
    </p>
  );
}
