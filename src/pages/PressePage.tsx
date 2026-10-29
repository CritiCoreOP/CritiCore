import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/locale-router";
import { FileText as ArticleTwoTone, CheckCircle2 as CheckCircleTwoTone, ClipboardCheck as FactCheckTwoTone, Gavel as GavelTwoTone, Users as GroupsTwoTone, Info as InfoTwoTone, Newspaper as NewspaperTwoTone, AlertTriangle as WarningAmberTwoTone } from "lucide-react";
const PressePage = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t("pressPage.title")} – CritiCore`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("pressPage.metaDesc"));
  }, [t]);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <NewspaperTwoTone className="w-4 h-4" />
              {t("pressPage.badge")}
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
              {t("pressPage.title")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("pressPage.subtitle")}
            </p>
          </div>

          {/* Two-Article Principle — prominent card */}
          <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 md:p-8 mb-10">
            <div className="flex items-start gap-3 mb-4">
              <FactCheckTwoTone className="w-7 h-7 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {t("pressPage.twoArticle.title")}
                </h2>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {t("pressPage.twoArticle.badge")}
                </Badge>
              </div>
            </div>
            <p className="text-foreground/80 mb-4 leading-relaxed">
              {t("pressPage.twoArticle.intro")}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <ArticleTwoTone className="w-5 h-5 text-primary" />
                  {t("pressPage.twoArticle.step1Title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("pressPage.twoArticle.step1Desc")}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <CheckCircleTwoTone className="w-5 h-5 text-primary" />
                  {t("pressPage.twoArticle.step2Title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("pressPage.twoArticle.step2Desc")}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 italic">
              {t("pressPage.twoArticle.note")}
            </p>
          </section>

          {/* Press Rules */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <GavelTwoTone className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">
                {t("pressPage.rules.title")}
              </h2>
            </div>

            <div className="space-y-4">
              {([1, 2, 3, 4, 5, 6] as const).map((n) => (
                <div
                  key={n}
                  className="rounded-xl border border-border/40 bg-card p-4 flex items-start gap-3"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {n}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">
                      {t(`pressPage.rules.rule${n}Title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`pressPage.rules.rule${n}Desc`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Consequences */}
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 mb-10">
            <div className="flex items-start gap-3">
              <WarningAmberTwoTone className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  {t("pressPage.consequences.title")}
                </h2>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  {t("pressPage.consequences.text")}
                </p>
              </div>
            </div>
          </section>

          {/* Who can apply */}
          <section className="rounded-2xl border border-border/40 bg-card p-6 mb-10">
            <div className="flex items-start gap-3 mb-4">
              <GroupsTwoTone className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <h2 className="font-display text-xl font-bold text-foreground">
                {t("pressPage.whoCanApply.title")}
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-foreground/80">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex items-start gap-2">
                  <CheckCircleTwoTone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {t(`pressPage.whoCanApply.item${n}`)}
                </li>
              ))}
            </ul>
          </section>

          {/* Info & CTA */}
          <section className="text-center rounded-2xl border border-border/40 bg-secondary/30 p-8">
            <InfoTwoTone className="w-8 h-8 text-primary mx-auto mb-3" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              {t("pressPage.cta.title")}
            </h2>
            <p className="text-muted-foreground text-sm mb-5 max-w-lg mx-auto">
              {t("pressPage.cta.text")}
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {t("pressPage.cta.button")}
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PressePage;
