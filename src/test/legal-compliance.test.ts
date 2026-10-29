import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import deRaw from "@/i18n/locales/de.json";
import enRaw from "@/i18n/locales/en.json";
import frRaw from "@/i18n/locales/fr.json";
import esRaw from "@/i18n/locales/es.json";
import thRaw from "@/i18n/locales/th.json";
import { LEGAL_ENTITY } from "@/lib/legalEntity";

const de = deRaw as any;
const en = enRaw as any;
const fr = frRaw as any;
const es = esRaw as any;
const th = thRaw as any;

// ─── Constants ───────────────────────────────────────────────────────────────
// AGB and Datenschutz once named an old address (Redaim, Dietmannsried) while the Impressum had the
// current one. The provider data now lives only in lib/legalEntity; these must not come back.
// Until 2026-10-16 the seat was in Dahn (Rheinland-Pfalz); it is in Solingen now
const OUTDATED_PROVIDER_DATA = [/Dietmannsried/, /Welserstra/, /MDC Management/, /Redaim, c\/o/, /Erfweiler/, /66994/, /Rheinland-Pfalz/];

const LOCALES: Record<string, Record<string, unknown>> = { de, en, fr, es, th };
const LOCALE_KEYS = Object.keys(LOCALES);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively collect all leaf keys (dot-notation) from a nested object */
function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

/** Get a nested value by dot-key */
function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

// ─── 1. Contact Info Consistency ─────────────────────────────────────────────

describe("Contact Info Consistency", () => {
  /**
   * Provider name, postal address and contact email MUST be identical on Impressum, AGB and
   * Datenschutz. All three take them from lib/legalEntity; the translations only hold placeholders.
   */
  const PAGES = ["ImpressumPage.tsx", "AGBPage.tsx", "DatenschutzPage.tsx"];
  const readPage = (file: string) => fs.readFileSync(path.join(process.cwd(), "src/pages", file), "utf8");

  it("provider data is complete", () => {
    for (const field of ["brand", "name", "tradeName", "street", "postalCode", "city", "country", "email"] as const) {
      expect(LEGAL_ENTITY[field].trim().length, field).toBeGreaterThan(0);
    }
    expect(LEGAL_ENTITY.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
  });

  for (const file of PAGES) {
    it(`${file} takes the provider data from lib/legalEntity and hardcodes none`, () => {
      const src = readPage(file);
      expect(src).toContain("@/lib/legalEntity");
      expect(src).not.toContain(LEGAL_ENTITY.name);
      expect(src).not.toContain(LEGAL_ENTITY.street);
      expect(src).not.toContain(LEGAL_ENTITY.email);
      for (const outdated of OUTDATED_PROVIDER_DATA) expect(src).not.toMatch(outdated);
    });
  }

  for (const locale of LOCALE_KEYS) {
    const t = LOCALES[locale] as Record<string, unknown>;

    describe(`[${locale.toUpperCase()}]`, () => {
      it("AGB names the provider through the shared placeholder", () => {
        expect(getNestedValue(t, "legal.terms.scopeText")).toContain("{{operator}}");
      });

      it("contains no outdated provider name or address", () => {
        const all = JSON.stringify(t);
        for (const outdated of OUTDATED_PROVIDER_DATA) expect(all).not.toMatch(outdated);
      });

      it("privacy policy tells users how to exercise their rights", () => {
        expect(getNestedValue(t, "legal.privacy.rightsContact")).toBeTruthy();
      });
    });
  }
});

// ─── 2. Required GDPR Sections ──────────────────────────────────────────────

describe("Required GDPR Sections (Privacy Policy)", () => {
  /**
   * The Datenschutz page MUST contain these mandatory sections
   * per GDPR / DSGVO requirements.
   */
  const REQUIRED_PRIVACY_KEYS = [
    // Controller (Art. 4 Nr. 7)
    "legal.privacy.controller",
    // Data collection
    "legal.privacy.dataCollection",
    "legal.privacy.dataCollectionText1",
    "legal.privacy.dataCollectionText2",
    // Legal bases (Art. 6)
    "legal.privacy.legalBasis",
    "legal.privacy.legalBasisIntro",
    "legal.privacy.legalBasisLogfiles",
    "legal.privacy.legalBasisRegistration",
    "legal.privacy.legalBasisCookies",
    "legal.privacy.legalBasisNewsletter",
    "legal.privacy.legalBasisContact",
    // Storage duration
    "legal.privacy.storageDuration",
    "legal.privacy.storageDurationIntro",
    "legal.privacy.storageDurationLogfiles",
    "legal.privacy.storageDurationAccount",
    "legal.privacy.storageDurationReviews",
    "legal.privacy.storageDurationNewsletter",
    "legal.privacy.storageDurationSupport",
    // Cookies
    "legal.privacy.cookies",
    "legal.privacy.cookiesText",
    // SSL/TLS
    "legal.privacy.ssl",
    "legal.privacy.sslText",
    // Hosting
    "legal.privacy.hosting",
    "legal.privacy.hostingText",
    // User rights (Art. 15-21, 77)
    "legal.privacy.rights",
    "legal.privacy.rightsIntro",
    "legal.privacy.rightAccess",
    "legal.privacy.rightCorrection",
    "legal.privacy.rightDeletion",
    "legal.privacy.rightRestriction",
    "legal.privacy.rightPortability",
    "legal.privacy.rightObjection",
    "legal.privacy.rightWithdraw",
    "legal.privacy.rightComplaint",
    "legal.privacy.rightComplaintLink",
    "legal.privacy.rightsContact",
    // Processors and services actually in use
    "legal.privacy.overview",
    "legal.privacy.overviewText",
    "legal.privacy.email",
    "legal.privacy.emailText",
    "legal.privacy.socialLogin",
    "legal.privacy.socialLoginText",
    "legal.privacy.ai",
    "legal.privacy.aiText",
    // Art. 21 (4): the right to object is presented separately
    "legal.privacy.objectionTitle",
    "legal.privacy.objectionText",
    // Art. 13 (2) (e), (f)
    "legal.privacy.obligation",
    "legal.privacy.obligationText",
    // Third-party & international transfers
    "legal.privacy.thirdParty",
    "legal.privacy.thirdPartyText",
    "legal.privacy.thirdPartyTmdb",
    "legal.privacy.thirdPartyIgdb",
    "legal.privacy.thirdPartyImdb",
    "legal.privacy.thirdPartyStripe",
    "legal.privacy.thirdPartyNote",
    // Changes
    "legal.privacy.changes",
    "legal.privacy.changesText",
    "legal.privacy.lastUpdated",
  ];

  for (const locale of LOCALE_KEYS) {
    describe(`[${locale.toUpperCase()}] has all required privacy keys`, () => {
      for (const key of REQUIRED_PRIVACY_KEYS) {
        it(`key "${key}" exists and is non-empty`, () => {
          const value = getNestedValue(
            LOCALES[locale] as Record<string, unknown>,
            key
          );
          expect(value, `Missing key "${key}" in ${locale}.json`).toBeDefined();
          expect(
            typeof value === "string" && value.trim().length > 0,
            `Key "${key}" in ${locale}.json is empty`
          ).toBe(true);
        });
      }
    });
  }
});

// ─── 3. Required Impressum Sections ─────────────────────────────────────────

describe("Required Impressum Sections", () => {
  const REQUIRED_IMPRESSUM_KEYS = [
    "legal.impressum.title",
    "legal.impressum.legalInfo",
    "legal.impressum.contact",
    "legal.impressum.responsibility",
    "legal.impressum.disclaimer",
    "legal.impressum.liabilityContent",
    "legal.impressum.liabilityContentText",
    "legal.impressum.liabilityLinks",
    "legal.impressum.liabilityLinksText",
    "legal.impressum.copyright",
    "legal.impressum.copyrightText",
    "legal.impressum.imageCredits",
    "legal.impressum.imageCreditsText",
    "legal.impressum.imageCreditsApi",
  ];

  for (const locale of LOCALE_KEYS) {
    describe(`[${locale.toUpperCase()}]`, () => {
      for (const key of REQUIRED_IMPRESSUM_KEYS) {
        it(`key "${key}" exists and is non-empty`, () => {
          const value = getNestedValue(
            LOCALES[locale] as Record<string, unknown>,
            key
          );
          expect(value, `Missing "${key}" in ${locale}.json`).toBeDefined();
          expect(
            typeof value === "string" && value.trim().length > 0,
            `"${key}" in ${locale}.json is empty`
          ).toBe(true);
        });
      }
    });
  }
});

// ─── 4. Required AGB (Terms) Sections ───────────────────────────────────────

describe("Required Terms (AGB) Sections", () => {
  const REQUIRED_TERMS_KEYS = [
    "legal.terms.title",
    "legal.terms.scope",
    "legal.terms.scopeText",
    "legal.terms.minAge",
    "legal.terms.minAgeText",
    "legal.terms.registration",
    "legal.terms.registrationText1",
    "legal.terms.registrationText2",
    "legal.terms.conduct",
    "legal.terms.conductIntro",
    "legal.terms.content",
    "legal.terms.contentText1",
    "legal.terms.contentText2",
    "legal.terms.contentText3",
    "legal.terms.reviews",
    "legal.terms.reviewsText1",
    "legal.terms.copyright",
    "legal.terms.copyrightText1",
    "legal.terms.copyrightText2",
    "legal.terms.pressAccounts",
    "legal.terms.pressAccountsText1",
    "legal.terms.pressAccountsText2",
    "legal.terms.thirdParty",
    "legal.terms.thirdPartyText1",
    "legal.terms.liability",
    "legal.terms.liabilityText1",
    "legal.terms.liabilityText2",
    "legal.terms.availability",
    "legal.terms.availabilityText",
    "legal.terms.termination",
    "legal.terms.terminationText1",
    "legal.terms.terminationText2",
    "legal.terms.changes",
    "legal.terms.changesText",
    "legal.terms.finalProvisions",
    "legal.terms.finalProvisionsText1",
    "legal.terms.finalProvisionsText2",
    "legal.terms.lastUpdated",
  ];

  for (const locale of LOCALE_KEYS) {
    describe(`[${locale.toUpperCase()}]`, () => {
      for (const key of REQUIRED_TERMS_KEYS) {
        it(`key "${key}" exists and is non-empty`, () => {
          const value = getNestedValue(
            LOCALES[locale] as Record<string, unknown>,
            key
          );
          expect(value, `Missing "${key}" in ${locale}.json`).toBeDefined();
          expect(
            typeof value === "string" && value.trim().length > 0,
            `"${key}" in ${locale}.json is empty`
          ).toBe(true);
        });
      }
    });
  }
});

// ─── 5. Translation Key Completeness ────────────────────────────────────────

describe("Translation Completeness (legal.* keys)", () => {
  /** 
   * Collects ALL legal.* keys from the German locale (source of truth)
   * and ensures every other locale has the same keys.
   */
  let deKeys: string[] = [];

  beforeAll(() => {
    const allDe = collectKeys(de as Record<string, unknown>);
    deKeys = allDe.filter((k) => k.startsWith("legal.") || k.startsWith("dmca."));
  });

  for (const locale of LOCALE_KEYS.filter((l) => l !== "de")) {
    it(`[${locale.toUpperCase()}] has all legal/dmca keys from DE`, () => {
      const missing: string[] = [];
      for (const key of deKeys) {
        const val = getNestedValue(LOCALES[locale] as Record<string, unknown>, key);
        if (val === undefined || (typeof val === "string" && val.trim() === "")) {
          missing.push(key);
        }
      }
      expect(
        missing,
        `Missing or empty keys in ${locale}.json:\n  ${missing.join("\n  ")}`
      ).toEqual([]);
    });
  }
});

// ─── 6. GDPR Content Validation ─────────────────────────────────────────────

describe("Legal content validation", () => {
  it("fonts are self-hosted, not loaded from Google (LG München I, 3 O 17493/20)", () => {
    const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it("no third-party iframe is loaded on every page (footer)", () => {
    const footer = fs.readFileSync(path.join(process.cwd(), "src/components/Footer.tsx"), "utf8");
    expect(footer).not.toMatch(/<iframe/);
  });

  it("AGB contain no invalid consent-by-continued-use clause", () => {
    expect(de.legal.terms.changesText + de.legal.terms.changesText2).not.toMatch(/fortgesetzte Nutzung/i);
  });

  it("AGB liability keeps the non-excludable cases (§ 309 Nr. 7 BGB)", () => {
    expect(de.legal.terms.liabilityText1).toMatch(/Vorsatz/);
    expect(de.legal.terms.liabilityText1).toMatch(/Leben, Körper oder Gesundheit/);
    expect(de.legal.terms.liabilityText1).toMatch(/Produkthaftungsgesetz/);
  });

  it("AGB name the DSA statement of reasons and complaint route", () => {
    expect(de.legal.terms.moderationText2).toContain("Art. 17");
    expect(de.legal.terms.moderationText3).toMatch(/Beschwerde/);
  });
});

describe("GDPR Content Validation", () => {
  it("DE privacy policy references Art. 6 DSGVO (legal bases)", () => {
    const logfiles = de.legal.privacy.legalBasisLogfiles;
    expect(logfiles).toContain("Art. 6");
    expect(logfiles).toContain("DSGVO");
  });

  it("DE privacy policy mentions right to complain (Art. 77)", () => {
    const complaint = de.legal.privacy.rightComplaint;
    expect(complaint).toContain("Art. 77");
  });

  it("DE privacy policy mentions right to withdraw consent (Art. 7)", () => {
    const withdraw = de.legal.privacy.rightWithdraw;
    expect(withdraw).toContain("Art. 7");
  });

  it("DE privacy policy mentions SSL/TLS encryption", () => {
    const ssl = de.legal.privacy.sslText;
    expect(ssl).toMatch(/SSL|TLS/i);
  });

  it("DE privacy policy mentions AVV / Auftragsverarbeitung for hosting", () => {
    const hosting = de.legal.privacy.hostingText;
    expect(hosting).toMatch(/AVV|Auftragsverarbeitung|Art\. 28/);
  });

  it("DE privacy policy mentions all third-party providers", () => {
    const tmdb = de.legal.privacy.thirdPartyTmdb;
    const igdb = de.legal.privacy.thirdPartyIgdb;
    const imdb = de.legal.privacy.thirdPartyImdb;
    const stripe = de.legal.privacy.thirdPartyStripe;

    expect(tmdb).toContain("TMDB");
    expect(igdb).toContain("IGDB");
    expect(imdb).toContain("IMDb");
    expect(stripe).toContain("Stripe");
  });

  it("Third-party entries mention USA data transfer", () => {
    const entries = [
      de.legal.privacy.thirdPartyTmdb,
      de.legal.privacy.thirdPartyIgdb,
      de.legal.privacy.thirdPartyImdb,
      de.legal.privacy.thirdPartyStripe,
    ];
    for (const entry of entries) {
      expect(entry).toContain("USA");
    }
  });
});
