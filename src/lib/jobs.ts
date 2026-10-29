import { LEGAL_ENTITY } from "./legalEntity";

/**
 * Job postings on /jobs. The text fields are plain text: tasks, profile and offer hold one point per
 * line (a leading "-", "*" or "•" is dropped), the description paragraphs are split at blank lines.
 */
export type EmploymentType = "full_time" | "part_time" | "mini_job" | "freelance" | "internship" | "volunteer";
export type Workplace = "remote" | "hybrid" | "onsite";

export interface JobPosting {
  id: string;
  slug: string;
  title: string;
  team: string | null;
  employment_type: EmploymentType | string;
  workplace: Workplace | string;
  location: string | null;
  summary: string | null;
  description: string;
  tasks: string;
  profile: string;
  offer: string;
  apply_email: string | null;
  apply_url: string | null;
  valid_through: string | null;
  published: boolean;
  published_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const EMPLOYMENT_TYPES: EmploymentType[] = ["full_time", "part_time", "mini_job", "freelance", "internship", "volunteer"];
export const WORKPLACES: Workplace[] = ["remote", "hybrid", "onsite"];

/** Where applications go when a posting names neither an address nor a link */
export const DEFAULT_APPLY_EMAIL = LEGAL_ENTITY.email;

/** One point per line, without list markers and empty lines */
export function bulletLines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

/** Paragraphs separated by blank lines; single line breaks stay inside the paragraph */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** "kirby-redakteurin-m-w-d" from a title; umlauts written out */
export function jobSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** The link behind "Bewerben": the posting's own link, otherwise a mail with the job in the subject */
export function applyHref(job: Pick<JobPosting, "apply_url" | "apply_email" | "title">, subjectPrefix: string): string {
  if (job.apply_url && /^https:\/\//.test(job.apply_url)) return job.apply_url;
  const to = job.apply_email || DEFAULT_APPLY_EMAIL;
  return `mailto:${to}?subject=${encodeURIComponent(`${subjectPrefix}: ${job.title}`)}`;
}

/** A posting is shown while it is published and its closing day has not passed (German time) */
export function isOpen(job: Pick<JobPosting, "published" | "valid_through">, now = new Date()): boolean {
  if (!job.published) return false;
  if (!job.valid_through) return true;
  return job.valid_through >= now.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

const SCHEMA_TYPES: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  mini_job: "PART_TIME",
  freelance: "CONTRACTOR",
  internship: "INTERN",
  volunteer: "VOLUNTEER",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * JobPosting for Google's job search. The description is the posting as simple HTML (Google wants
 * it complete). Remote jobs are marked as telecommute; without a stated country Google needs one,
 * so applicants are expected to live in Germany like the provider.
 */
export function jobPostingJsonLd(job: JobPosting, headings: { tasks: string; profile: string; offer: string }, siteUrl: string): Record<string, unknown> {
  const list = (title: string, items: string[]) => (items.length ? `<h3>${esc(title)}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "");
  const description = [
    ...paragraphs(job.summary ? `${job.summary}\n\n${job.description}` : job.description).map((p) => `<p>${esc(p)}</p>`),
    list(headings.tasks, bulletLines(job.tasks)),
    list(headings.profile, bulletLines(job.profile)),
    list(headings.offer, bulletLines(job.offer)),
  ].join("");
  const place = {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: job.location || LEGAL_ENTITY.city,
      addressCountry: "DE",
    },
  };
  return {
    "@type": "JobPosting",
    title: job.title,
    description,
    datePosted: (job.published_at ?? job.created_at).slice(0, 10),
    ...(job.valid_through ? { validThrough: job.valid_through } : {}),
    employmentType: SCHEMA_TYPES[job.employment_type] ?? "OTHER",
    hiringOrganization: { "@type": "Organization", name: LEGAL_ENTITY.brand, sameAs: siteUrl, logo: `${siteUrl}/og-image.jpg` },
    directApply: false,
    ...(job.workplace === "remote"
      ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "DE" } }
      : { jobLocation: place }),
  };
}
