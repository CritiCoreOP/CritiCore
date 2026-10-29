import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { useEffect, type ReactNode } from "react";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { LEGAL_ADDRESS_LINES, LEGAL_ENTITY, SUPERVISORY_AUTHORITY } from "@/lib/legalEntity";

const linkClass = "text-primary hover:underline";

const DatenschutzPage = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setSeo({
      title: t("meta.privacy.title"),
      description: t("meta.privacy.description"),
      url: "/datenschutz",
    });
    return () => cleanupSeo();
  }, [t]);

  const k = (key: string) => t(`legal.privacy.${key}`);
  const list = (keys: string[]) => (
    <ul className="list-disc pl-6 space-y-2">
      {keys.map((key) => (
        <li key={key}>{k(key)}</li>
      ))}
    </ul>
  );

  // Numbered automatically, so inserting a section cannot leave the numbering out of step
  const sections: { title: string; body: ReactNode }[] = [
    {
      title: k("controller"),
      body: (
        <p>
          {LEGAL_ADDRESS_LINES.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
          {t("legal.impressum.phone")}: {LEGAL_ENTITY.phone}<br />
          {t("legal.impressum.email")}: <a href={`mailto:${LEGAL_ENTITY.email}`} className={linkClass}>{LEGAL_ENTITY.email}</a>
        </p>
      ),
    },
    { title: k("overview"), body: <p>{k("overviewText")}</p> },
    {
      title: k("dataCollection"),
      body: (
        <>
          <p>{k("dataCollectionText1")}</p>
          <p>{k("dataCollectionText2")}</p>
          <p>{k("dataCollectionText3")}</p>
          <p>{k("dataCollectionText4")}</p>
          <p>{k("dataCollectionText5")}</p>
          <p>{k("dataCollectionText6")}</p>
        </>
      ),
    },
    {
      title: k("legalBasis"),
      body: (
        <>
          <p>{k("legalBasisIntro")}</p>
          {list([
            "legalBasisLogfiles",
            "legalBasisRegistration",
            "legalBasisCookies",
            "legalBasisNewsletter",
            "legalBasisContact",
            "legalBasisModeration",
            "legalBasisDonations",
            "legalBasisAi",
          ])}
        </>
      ),
    },
    {
      title: k("storageDuration"),
      body: (
        <>
          <p>{k("storageDurationIntro")}</p>
          {list([
            "storageDurationLogfiles",
            "storageDurationAccount",
            "storageDurationReviews",
            "storageDurationNewsletter",
            "storageDurationSupport",
            "storageDurationModeration",
            "storageDurationDonations",
          ])}
        </>
      ),
    },
    { title: k("cookies"), body: <p>{k("cookiesText")}</p> },
    { title: k("ssl"), body: <p>{k("sslText")}</p> },
    { title: k("hosting"), body: <p>{k("hostingText")}</p> },
    { title: k("email"), body: <p>{k("emailText")}</p> },
    { title: k("socialLogin"), body: <p>{k("socialLoginText")}</p> },
    { title: k("ai"), body: <p>{k("aiText")}</p> },
    {
      title: k("thirdParty"),
      body: (
        <>
          <p>{k("thirdPartyText")}</p>
          {list(["thirdPartyTmdb", "thirdPartyIgdb", "thirdPartyAnilist", "thirdPartyYoutube", "thirdPartyStripe", "thirdPartyImdb"])}
          <p className="mt-2">{k("thirdPartyNote")}</p>
        </>
      ),
    },
    {
      title: k("rights"),
      body: (
        <>
          <p>{k("rightsIntro")}</p>
          <ul className="list-disc pl-6 space-y-1">
            {["rightAccess", "rightCorrection", "rightDeletion", "rightRestriction", "rightPortability", "rightObjection", "rightWithdraw"].map((key) => (
              <li key={key}>{k(key)}</li>
            ))}
            <li>
              {t("legal.privacy.rightComplaint", { authority: SUPERVISORY_AUTHORITY.name, address: SUPERVISORY_AUTHORITY.address })}{" "}
              <a href={SUPERVISORY_AUTHORITY.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} break-all`}>
                {SUPERVISORY_AUTHORITY.url.replace("https://", "")}
              </a>
              . {k("rightComplaintOther")}{" "}
              <a href={k("rightComplaintLink")} target="_blank" rel="noopener noreferrer" className={`${linkClass} break-all`}>
                {k("rightComplaintLink")}
              </a>
            </li>
          </ul>
          {/* Art. 21 (4) GDPR: the right to object must be shown clearly and separately */}
          <div className="mt-4 rounded-xl border border-border/60 bg-card/50 p-4">
            <h3 className="font-semibold text-foreground mt-0 mb-1">{k("objectionTitle")}</h3>
            <p className="m-0">{k("objectionText")}</p>
          </div>
          <p className="mt-4">
            {k("rightsContact")} <a href={`mailto:${LEGAL_ENTITY.email}`} className={linkClass}>{LEGAL_ENTITY.email}</a>
          </p>
        </>
      ),
    },
    { title: k("obligation"), body: <p>{k("obligationText")}</p> },
    { title: k("changes"), body: <p>{k("changesText")}</p> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8 break-words hyphens-auto">{t("legal.privacy.title")}</h1>

          <div className="prose prose-invert max-w-none space-y-6 text-foreground/80">
            {!i18n.language.startsWith("de") && <p className="text-sm text-muted-foreground">{t("legal.germanPrevails")}</p>}

            {sections.map((section, i) => (
              <section key={i}>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  {i + 1}. {section.title}
                </h2>
                {section.body}
              </section>
            ))}

            <p className="text-sm text-muted-foreground mt-8">{k("lastUpdated")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DatenschutzPage;
