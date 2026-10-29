import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { LEGAL_ENTITY, LEGAL_ENTITY_LINE } from "@/lib/legalEntity";

interface Section {
  title: string;
  content: string[];
  list?: string[];
  after?: string[];
}

const AGBPage = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setSeo({
      title: t("meta.terms.title"),
      description: t("meta.terms.description"),
      url: "/agb",
    });
    return () => cleanupSeo();
  }, [t]);

  // Provider and contact come from one place (lib/legalEntity), shared with Impressum and Datenschutz
  const vars = { operator: LEGAL_ENTITY_LINE, email: LEGAL_ENTITY.email };
  const p = (key: string) => t(`legal.terms.${key}`, vars);

  const sections: Section[] = [
    { title: p("scope"), content: [p("scopeText"), p("scopeText2")] },
    { title: p("minAge"), content: [p("minAgeText")] },
    { title: p("registration"), content: [p("registrationText1"), p("registrationText2"), p("registrationText3")] },
    { title: p("services"), content: [p("servicesText1"), p("servicesText2")] },
    {
      title: p("conduct"),
      content: [p("conductIntro")],
      list: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => p(`conductRule${n}`)),
      after: [p("conductConsequences")],
    },
    { title: p("moderation"), content: [p("moderationText1"), p("moderationText2"), p("moderationText3"), p("moderationText4")] },
    { title: p("content"), content: [p("contentText1"), p("contentText2"), p("contentText3")] },
    {
      title: p("reviews"),
      content: [p("reviewsText1"), p("reviewsText2")],
      list: [p("reviewsRule1"), p("reviewsRule2"), p("reviewsRule3")],
    },
    { title: p("copyright"), content: [p("copyrightText1"), p("copyrightText2")] },
    { title: p("pressAccounts"), content: [p("pressAccountsText1"), p("pressAccountsText2")] },
    { title: p("donations"), content: [p("donationsText")] },
    { title: p("thirdParty"), content: [p("thirdPartyText1"), p("thirdPartyText2")] },
    { title: p("liability"), content: [p("liabilityText1"), p("liabilityText2"), p("liabilityText3")] },
    { title: p("availability"), content: [p("availabilityText")] },
    { title: p("termination"), content: [p("terminationText1"), p("terminationText2")] },
    { title: p("changes"), content: [p("changesText"), p("changesText2")] },
    { title: p("finalProvisions"), content: [p("finalProvisionsText1"), p("finalProvisionsText2"), p("finalProvisionsText3")] },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8 break-words hyphens-auto">{t("legal.terms.title")}</h1>

          <div className="prose prose-invert max-w-none space-y-6 text-foreground/80">
            {!i18n.language.startsWith("de") && <p className="text-sm text-muted-foreground">{t("legal.germanPrevails")}</p>}

            {sections.map((section, i) => (
              <section key={i}>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  § {i + 1} {section.title}
                </h2>
                {section.content.map((text, j) => (
                  <p key={j}>{text}</p>
                ))}
                {section.list && (
                  <ul className="list-disc pl-6 space-y-1">
                    {section.list.map((item, k) => (
                      <li key={k}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.after?.map((text, j) => (
                  <p key={`a${j}`}>{text}</p>
                ))}
              </section>
            ))}

            <p className="text-sm text-muted-foreground mt-8">{t("legal.terms.lastUpdated")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AGBPage;
