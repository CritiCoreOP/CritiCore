import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, MotionConfig } from "framer-motion";
import Footer from "@/components/Footer";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { Check, AlertTriangle, ArrowRight, Mail } from "lucide-react";

const NewsletterConfirmPage = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    const confirm = async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-newsletter?token=${encodeURIComponent(token)}`;
      try {
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const json = await res.json();
        setStatus(json.success ? "success" : "error");
      } catch {
        setStatus("error");
      }
    };
    confirm();
  }, [token]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Masthead */}
          <div className="border-b border-border/60 pb-6 mb-16">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-none">
                  {t("newsletter.mastheadTitle", "NEWSLETTER")}
                </h1>
                <span className="text-5xl md:text-6xl font-bold text-primary leading-none">.</span>
              </div>
              <span className="hidden md:inline text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t("newsletter.mastheadKicker", "Bestätigung")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-px bg-border/40 border border-border/40">
            {/* Status panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-8 bg-background p-10 md:p-16 min-h-[420px] flex flex-col justify-center"
            >
              {status === "loading" && (
                <div className="flex flex-col items-start gap-6">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {t("newsletter.verifying", "Verifiziere Token")}
                  </span>
                  <M3LoadingIndicator />
                </div>
              )}

              {status === "success" && (
                <div className="flex flex-col items-start gap-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.24em] text-primary">
                      {t("newsletter.confirmed", "Bestätigt")}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.05]">
                    {t("newsletter.confirmSuccess")}
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                    {t("newsletter.confirmSuccessDesc")}
                  </p>
                  <Link
                    to="/"
                    className="group inline-flex items-center gap-2 text-sm font-medium text-foreground border-b border-foreground/40 hover:border-primary hover:text-primary pb-1 transition-colors"
                  >
                    {t("common.backHome", "Zur Startseite")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-start gap-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.24em] text-destructive">
                      {t("newsletter.failed", "Fehlgeschlagen")}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.05]">
                    {t("newsletter.confirmError")}
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                    {t("newsletter.confirmErrorDesc")}
                  </p>
                  <Link
                    to="/"
                    className="group inline-flex items-center gap-2 text-sm font-medium text-foreground border-b border-foreground/40 hover:border-primary hover:text-primary pb-1 transition-colors"
                  >
                    {t("common.backHome", "Zur Startseite")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Sidebar */}
            <aside className="md:col-span-4 bg-background p-10 flex flex-col justify-between gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {t("newsletter.aboutKicker", "Der Newsletter")}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground leading-tight mb-3">
                  {t("newsletter.aboutTitle", "Kuratiert. Redaktionell. Wöchentlich.")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "newsletter.aboutBody",
                    "Die wichtigsten Reviews, Neuerscheinungen und Kolumnen der Woche — direkt in dein Postfach.",
                  )}
                </p>
              </div>

              <ol className="space-y-3 text-sm">
                {[
                  t("newsletter.step1", "E-Mail bestätigen"),
                  t("newsletter.step2", "Erste Ausgabe erhalten"),
                  t("newsletter.step3", "Jederzeit abbestellen"),
                ].map((step, i) => (
                  <li key={i} className="flex items-baseline gap-3 border-t border-border/50 pt-3 first:border-0 first:pt-0">
                    <span className="text-xs font-mono text-primary tabular-nums">0{i + 1}</span>
                    <span className="text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </MotionConfig>
  );
};

export default NewsletterConfirmPage;
