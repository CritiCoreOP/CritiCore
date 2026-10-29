import { describe, expect, it } from "vitest";
import { applyHref, bulletLines, isOpen, jobPostingJsonLd, jobSlug, paragraphs, type JobPosting } from "./jobs";

const JOB: JobPosting = {
  id: "j1",
  slug: "redakteurin-games",
  title: "Redakteur:in Games (m/w/d)",
  team: "Redaktion",
  employment_type: "freelance",
  workplace: "remote",
  location: null,
  summary: "Du schreibst News & Reviews.",
  description: "Erster Absatz.\n\nZweiter <Absatz>.",
  tasks: "- News schreiben\n* Reviews testen\n\n• Social Posts",
  profile: "Gutes Deutsch",
  offer: "",
  apply_email: null,
  apply_url: null,
  valid_through: "2026-11-30",
  published: true,
  published_at: "2026-10-20T08:00:00Z",
  sort_order: 0,
  created_at: "2026-10-19T08:00:00Z",
  updated_at: "2026-10-20T08:00:00Z",
};

describe("jobs", () => {
  it("reads one point per line and paragraphs at blank lines", () => {
    expect(bulletLines(JOB.tasks)).toEqual(["News schreiben", "Reviews testen", "Social Posts"]);
    expect(paragraphs(JOB.description)).toEqual(["Erster Absatz.", "Zweiter <Absatz>."]);
  });

  it("makes addresses from titles", () => {
    expect(jobSlug("Redakteur:in Games (m/w/d)")).toBe("redakteur-in-games-m-w-d");
    expect(jobSlug("Größe & Übung für Café")).toBe("groesse-uebung-fuer-cafe");
  });

  it("applies by link first, otherwise by mail with the job in the subject", () => {
    expect(applyHref({ ...JOB, apply_url: "https://jobs.example.org/42" }, "Bewerbung")).toBe("https://jobs.example.org/42");
    expect(applyHref({ ...JOB, apply_email: "jobs@criticore.cc" }, "Bewerbung")).toBe("mailto:jobs@criticore.cc?subject=Bewerbung%3A%20Redakteur%3Ain%20Games%20(m%2Fw%2Fd)");
    // An http link is not trusted
    expect(applyHref({ ...JOB, apply_url: "http://example.org" }, "Bewerbung")).toMatch(/^mailto:/);
  });

  it("is open while published and the closing day has not passed in Germany", () => {
    const evening = new Date("2026-11-30T22:30:00Z"); // 23:30 in Berlin
    expect(isOpen(JOB, evening)).toBe(true);
    expect(isOpen(JOB, new Date("2026-11-30T23:30:00Z"))).toBe(false);
    expect(isOpen({ ...JOB, published: false }, evening)).toBe(false);
    expect(isOpen({ ...JOB, valid_through: null }, evening)).toBe(true);
  });

  it("describes the job for Google with escaped text", () => {
    const ld = jobPostingJsonLd(JOB, { tasks: "Deine Aufgaben", profile: "Das bringst du mit", offer: "Das bieten wir" }, "https://criticore.cc");
    expect(ld).toMatchObject({ "@type": "JobPosting", employmentType: "CONTRACTOR", datePosted: "2026-10-20", validThrough: "2026-11-30", jobLocationType: "TELECOMMUTE" });
    expect(ld.description).toContain("<p>Zweiter &lt;Absatz&gt;.</p>");
    expect(ld.description).toContain("<h3>Deine Aufgaben</h3><ul><li>News schreiben</li>");
    expect(ld.description).not.toContain("Das bieten wir");
    const onsite = jobPostingJsonLd({ ...JOB, workplace: "onsite", location: "Solingen" }, { tasks: "", profile: "", offer: "" }, "https://criticore.cc");
    expect(onsite.jobLocation).toEqual({ "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Solingen", addressCountry: "DE" } });
  });
});
