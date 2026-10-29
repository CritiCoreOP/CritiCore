import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Briefcase, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, RowsSkeleton, focusRing } from "@/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EMPLOYMENT_TYPES, WORKPLACES, isOpen, jobSlug, type JobPosting } from "@/lib/jobs";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";

type Draft = Omit<JobPosting, "id" | "created_at" | "updated_at" | "published_at"> & { id?: string };

const EMPTY: Draft = {
  slug: "",
  title: "",
  team: "",
  employment_type: "freelance",
  workplace: "remote",
  location: "",
  summary: "",
  description: "",
  tasks: "",
  profile: "",
  offer: "",
  apply_email: "",
  apply_url: "",
  valid_through: null,
  published: false,
  sort_order: 0,
};

const KEY = ["admin-jobs"];

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Admins write the job postings shown on /jobs: draft, publish, order, close */
export default function AdminJobs() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const jobs = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<JobPosting[]> => {
      const { data, error } = await supabase.from("job_postings").select("*").order("sort_order").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobPosting[];
    },
  });
  const list = useMemo(() => jobs.data ?? [], [jobs.data]);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: KEY });
    void client.invalidateQueries({ queryKey: ["jobs"] });
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = {
        slug: d.slug.trim(),
        title: d.title.trim(),
        team: d.team?.trim() || null,
        employment_type: d.employment_type,
        workplace: d.workplace,
        location: d.location?.trim() || null,
        summary: d.summary?.trim() || null,
        description: d.description.trim(),
        tasks: d.tasks.trim(),
        profile: d.profile.trim(),
        offer: d.offer.trim(),
        apply_email: d.apply_email?.trim() || null,
        apply_url: d.apply_url?.trim() || null,
        valid_through: d.valid_through || null,
        published: d.published,
        sort_order: d.sort_order,
      };
      const { error } = d.id ? await supabase.from("job_postings").update(row).eq("id", d.id) : await supabase.from("job_postings").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("jobs.admin.saved"));
      setDraft(null);
      refresh();
    },
    onError: (e: { message?: string; code?: string }) =>
      toast.error(e.code === "23505" ? t("jobs.admin.slugTaken") : t("jobs.admin.saveError"), { description: e.code === "23505" ? undefined : e.message }),
  });

  const remove = async (job: JobPosting) => {
    if (!window.confirm(t("jobs.admin.confirmDelete", { title: job.title }))) return;
    const { error } = await supabase.from("job_postings").delete().eq("id", job.id);
    if (error) return void toast.error(t("jobs.admin.saveError"), { description: error.message });
    refresh();
  };

  const togglePublished = async (job: JobPosting) => {
    const { error } = await supabase.from("job_postings").update({ published: !job.published }).eq("id", job.id);
    if (error) return void toast.error(t("jobs.admin.saveError"), { description: error.message });
    refresh();
  };

  // Swap places with the neighbour; sort_order is rewritten 0..n so gaps and ties disappear
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...list];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    const results = await Promise.all(next.map((j, i) => (j.sort_order === i ? null : supabase.from("job_postings").update({ sort_order: i }).eq("id", j.id))));
    if (results.some((r) => r?.error)) toast.error(t("jobs.admin.saveError"));
    refresh();
  };

  const openNew = () => {
    setSlugTouched(false);
    setDraft({ ...EMPTY, sort_order: list.length });
  };
  const openEdit = (job: JobPosting) => {
    setSlugTouched(true);
    setDraft({ ...job, team: job.team ?? "", location: job.location ?? "", summary: job.summary ?? "", apply_email: job.apply_email ?? "", apply_url: job.apply_url ?? "" });
  };
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const status = (job: JobPosting) =>
    !job.published ? { label: t("jobs.admin.draft"), cls: "bg-muted text-muted-foreground" } : isOpen(job) ? { label: t("jobs.admin.live"), cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" } : { label: t("jobs.admin.expired"), cls: "bg-amber-500/15 text-amber-800 dark:text-amber-200" };

  const canSave = !!draft && !!draft.title.trim() && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("jobs.admin.title")}
        description={t("jobs.admin.intro")}
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/jobs" target="_blank">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> {t("jobs.admin.viewPage")}
              </Link>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openNew}>
              <Plus className="h-4 w-4" aria-hidden="true" /> {t("jobs.admin.new")}
            </Button>
          </>
        }
      />

      {jobs.isLoading ? (
        <RowsSkeleton rows={3} />
      ) : jobs.isError ? (
        <p className="text-sm text-destructive">{t("dash.loadError")}</p>
      ) : !list.length ? (
        <EmptyState icon={<Briefcase className="h-7 w-7" />} title={t("jobs.admin.emptyTitle")}>
          {t("jobs.admin.emptyText")}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border/60 rounded-2xl border border-border/50 bg-card/40">
          {list.map((job, i) => {
            const s = status(job);
            return (
              <li key={job.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", s.cls)}>{s.label}</span>
                    <button type="button" onClick={() => openEdit(job)} className={cn("truncate rounded-sm text-left font-medium text-foreground hover:underline", focusRing)}>
                      {job.title}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[job.team, t(`jobs.type.${job.employment_type}`), t(`jobs.workplace.${job.workplace}`)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={job.published} onCheckedChange={() => void togglePublished(job)} aria-label={t("jobs.admin.published")} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => void move(i, -1)} title={t("jobs.admin.up")}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t("jobs.admin.up")}</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === list.length - 1} onClick={() => void move(i, 1)} title={t("jobs.admin.down")}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t("jobs.admin.down")}</span>
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={t("jobs.admin.preview")}>
                    <Link to={`/jobs/${job.slug}`} target="_blank">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{t("jobs.admin.preview")}</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(job)} title={t("jobs.admin.edit")}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t("jobs.admin.edit")}</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => void remove(job)} title={t("jobs.admin.delete")}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t("jobs.admin.delete")}</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{draft?.id ? t("jobs.admin.editTitle") : t("jobs.admin.newTitle")}</SheetTitle>
          </SheetHeader>
          {draft && (
            <form
              className="mt-6 grid gap-5 pb-8"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSave) save.mutate(draft);
              }}
            >
              <Field id="job-title" label={t("jobs.admin.fTitle")}>
                <Input
                  id="job-title"
                  value={draft.title}
                  maxLength={140}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!slugTouched) set("slug", jobSlug(e.target.value));
                  }}
                  placeholder={t("jobs.admin.titlePlaceholder")}
                  required
                />
              </Field>
              <Field id="job-slug" label={t("jobs.admin.fSlug")} hint={t("jobs.admin.slugHint", { path: `/jobs/${draft.slug || "…"}` })}>
                <Input
                  id="job-slug"
                  value={draft.slug}
                  maxLength={80}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  required
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="job-team" label={t("jobs.admin.fTeam")}>
                  <Input id="job-team" value={draft.team ?? ""} maxLength={60} onChange={(e) => set("team", e.target.value)} placeholder={t("jobs.admin.teamPlaceholder")} />
                </Field>
                <Field id="job-type" label={t("jobs.admin.fType")}>
                  <Select value={draft.employment_type} onValueChange={(v) => set("employment_type", v)}>
                    <SelectTrigger id="job-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`jobs.type.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="job-workplace" label={t("jobs.admin.fWorkplace")}>
                  <Select value={draft.workplace} onValueChange={(v) => set("workplace", v)}>
                    <SelectTrigger id="job-workplace">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKPLACES.map((w) => (
                        <SelectItem key={w} value={w}>
                          {t(`jobs.workplace.${w}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="job-location" label={t("jobs.admin.fLocation")}>
                  <Input id="job-location" value={draft.location ?? ""} maxLength={80} onChange={(e) => set("location", e.target.value)} placeholder="Solingen" disabled={draft.workplace === "remote"} />
                </Field>
              </div>
              <Field id="job-summary" label={t("jobs.admin.fSummary")} hint={t("jobs.admin.summaryHint")}>
                <Textarea id="job-summary" value={draft.summary ?? ""} maxLength={300} rows={2} onChange={(e) => set("summary", e.target.value)} className="resize-none" />
              </Field>
              <Field id="job-description" label={t("jobs.admin.fDescription")} hint={t("jobs.admin.descriptionHint")}>
                <Textarea id="job-description" value={draft.description} maxLength={6000} rows={5} onChange={(e) => set("description", e.target.value)} className="[field-sizing:content] min-h-[7rem]" />
              </Field>
              <Field id="job-tasks" label={t("jobs.tasks")} hint={t("jobs.admin.linesHint")}>
                <Textarea id="job-tasks" value={draft.tasks} maxLength={4000} rows={4} onChange={(e) => set("tasks", e.target.value)} className="[field-sizing:content] min-h-[6rem]" />
              </Field>
              <Field id="job-profile" label={t("jobs.profile")} hint={t("jobs.admin.linesHint")}>
                <Textarea id="job-profile" value={draft.profile} maxLength={4000} rows={4} onChange={(e) => set("profile", e.target.value)} className="[field-sizing:content] min-h-[6rem]" />
              </Field>
              <Field id="job-offer" label={t("jobs.offer")} hint={t("jobs.admin.linesHint")}>
                <Textarea id="job-offer" value={draft.offer} maxLength={4000} rows={4} onChange={(e) => set("offer", e.target.value)} className="[field-sizing:content] min-h-[6rem]" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="job-email" label={t("jobs.admin.fEmail")} hint={t("jobs.admin.emailHint")}>
                  <Input id="job-email" type="email" value={draft.apply_email ?? ""} maxLength={200} onChange={(e) => set("apply_email", e.target.value)} />
                </Field>
                <Field id="job-url" label={t("jobs.admin.fUrl")} hint={t("jobs.admin.urlHint")}>
                  <Input id="job-url" type="url" value={draft.apply_url ?? ""} maxLength={500} pattern="https://.*" onChange={(e) => set("apply_url", e.target.value)} placeholder="https://" />
                </Field>
                <Field id="job-until" label={t("jobs.factUntil")} hint={t("jobs.admin.untilHint")}>
                  <Input id="job-until" type="date" value={draft.valid_through ?? ""} onChange={(e) => set("valid_through", e.target.value || null)} />
                </Field>
                <div className="flex items-center justify-between gap-3 self-end rounded-xl border border-border/60 px-3 py-2.5">
                  <Label htmlFor="job-published">{t("jobs.admin.published")}</Label>
                  <Switch id="job-published" checked={draft.published} onCheckedChange={(v) => set("published", v)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border/60 pt-5">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  {t("jobs.admin.cancel")}
                </Button>
                <Button type="submit" disabled={!canSave || save.isPending} className="gap-1.5">
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {t("jobs.admin.save")}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
