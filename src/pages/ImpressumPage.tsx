import Footer from "@/components/Footer";
import { useTranslation, Trans } from "react-i18next";
import { useEffect } from "react";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { LEGAL_ADDRESS_LINES, LEGAL_ENTITY, RESPONSIBLE_PERSON_LINES } from "@/lib/legalEntity";

const linkClass = "text-primary hover:underline";

const Address = ({ lines = LEGAL_ADDRESS_LINES }: { lines?: readonly string[] }) => (
  <p>
    {lines.map((line, i) => (
      <span key={line}>
        {i > 0 && <br />}
        {line}
      </span>
    ))}
  </p>
);

const ImpressumPage = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setSeo({
      title: t("meta.impressum.title"),
      description: t("meta.impressum.description"),
      url: "/impressum",
    });
    return () => cleanupSeo();
  }, [t]);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8 break-words hyphens-auto">{t("legal.impressum.title")}</h1>

          <div className="prose prose-invert max-w-none space-y-6 text-foreground/80">
            {!i18n.language.startsWith("de") && <p className="text-sm text-muted-foreground">{t("legal.germanPrevails")}</p>}

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("legal.impressum.legalInfo")}</h2>
              <Address />
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("legal.impressum.contact")}</h2>
              <p>
                {t("legal.impressum.phone")}: <a href={`tel:${LEGAL_ENTITY.phone.replace(/\s/g, "")}`} className={linkClass}>{LEGAL_ENTITY.phone}</a><br />
                {t("legal.impressum.email")}: <a href={`mailto:${LEGAL_ENTITY.email}`} className={linkClass}>{LEGAL_ENTITY.email}</a>
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("legal.impressum.dsaContact")}</h2>
              <p>{t("legal.impressum.dsaContactText", { email: LEGAL_ENTITY.email })}</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("legal.impressum.responsibility")}</h2>
              <Address lines={RESPONSIBLE_PERSON_LINES} />
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("legal.impressum.disputes")}</h2>
              <p>{t("legal.impressum.disputesText")}</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("legal.impressum.disclaimer")}</h2>
              <h3 className="font-semibold text-foreground mt-4 mb-1">{t("legal.impressum.liabilityContent")}</h3>
              <p>{t("legal.impressum.liabilityContentText")}</p>
              <h3 className="font-semibold text-foreground mt-4 mb-1">{t("legal.impressum.liabilityLinks")}</h3>
              <p>{t("legal.impressum.liabilityLinksText")}</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("legal.impressum.copyright")}</h2>
              <p>{t("legal.impressum.copyrightText")}</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("legal.impressum.imageCredits")}</h2>
              <p>{t("legal.impressum.imageCreditsText")}</p>
              <p className="mt-2">
                <Trans
                  i18nKey="legal.impressum.imageCreditsApi"
                  components={{
                    tmdb: <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className={linkClass} />,
                    igdb: <a href="https://www.igdb.com/" target="_blank" rel="noopener noreferrer" className={linkClass} />,
                    anilist: <a href="https://anilist.co/" target="_blank" rel="noopener noreferrer" className={linkClass} />,
                  }}
                />
              </p>
              {/* Required by the TMDB API terms */}
              <p className="mt-2">{t("legal.impressum.tmdbNotice")}</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ImpressumPage;
