import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Database, Newspaper, Users } from "lucide-react";
import Footer from "@/components/Footer";
import JoinSection from "@/components/about/JoinSection";
import MagneticLink from "@/components/about/MagneticLink";
import PosterRing from "@/components/about/PosterRing";
import Reveal from "@/components/about/Reveal";
import ScoreDial from "@/components/about/ScoreDial";
import TeamSection from "@/components/about/TeamSection";
import ValuesBento from "@/components/about/ValuesBento";
import WorldsDeck from "@/components/about/WorldsDeck";
import { useMediaPool } from "@/components/about/useMediaPool";
import { Link } from "@/lib/locale-router";
import { cleanupSeo, setSeo } from "@/lib/seo";

const ease = [0.16, 1, 0.3, 1] as const;

function Hero({ pool }: { pool: ReturnType<typeof useMediaPool> }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease } };

  return (
    <section aria-labelledby="about-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10%] top-[10%] -z-10 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.16),transparent)]"
      />
      <div className="container mx-auto grid max-w-7xl items-center gap-2 px-4 pb-16 pt-24 lg:min-h-[80dvh] lg:grid-cols-12 lg:gap-4 lg:pb-12">
        <div className="lg:col-span-6">
          <motion.p {...enter(0)} className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t("aboutPage.hero.eyebrow")}
          </motion.p>
          <motion.h1
            {...enter(0.08)}
            id="about-title"
            className="mt-5 font-display text-[2.6rem] font-bold leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-[3.2rem] xl:text-[3.6rem]"
          >
            <span className="block">{t("aboutPage.hero.titleA")}</span>
            <span className="block text-muted-foreground">{t("aboutPage.hero.titleB")}</span>
          </motion.h1>
          <motion.p {...enter(0.16)} className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted-foreground">
            {t("aboutPage.hero.text")}
          </motion.p>
          <motion.div {...enter(0.24)} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <MagneticLink to="/entdecken">
              {t("aboutPage.hero.explore")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </MagneticLink>
            <Link
              to="/transparenz"
              className="inline-flex h-12 items-center whitespace-nowrap text-base font-semibold text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground"
            >
              {t("aboutPage.hero.howWeWork")}
            </Link>
          </motion.div>
        </div>
        <motion.div
          className="-mx-4 lg:col-span-6 lg:mx-0"
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.2, ease }}
        >
          <PosterRing items={pool.mixed} loading={pool.isLoading} />
        </motion.div>
      </div>
    </section>
  );
}

function RatingsSection() {
  const { t } = useTranslation();
  const sources = [
    { icon: Users, title: t("aboutPage.ratings.community"), text: t("transparencyPage.ratings.community") },
    { icon: Newspaper, title: t("aboutPage.ratings.press"), text: t("transparencyPage.ratings.critics") },
    { icon: Database, title: t("aboutPage.ratings.external"), text: t("transparencyPage.ratings.external") },
  ];
  return (
    <section aria-labelledby="about-ratings-title" className="border-y border-border/40 bg-card/30">
      <div className="container mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 md:py-32 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <ScoreDial />
        </Reveal>
        <div className="lg:col-span-7">
          <Reveal>
            <h2 id="about-ratings-title" className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t("transparencyPage.ratings.title")}
            </h2>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">{t("aboutPage.ratings.text")}</p>
          </Reveal>
          <ul className="mt-10 space-y-8">
            {sources.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={0.08 * i} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
                    <p className="mt-1.5 max-w-[60ch] leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const AboutPage = () => {
  const { t } = useTranslation();
  const pool = useMediaPool();

  useEffect(() => {
    setSeo({
      title: t("meta.about.title"),
      description: t("meta.about.description"),
      url: "/ueber-uns",
      jsonLd: {
        "@type": "AboutPage",
        name: t("meta.about.title"),
        description: t("meta.about.description"),
        mainEntity: {
          "@type": "Organization",
          name: "CritiCore",
          url: "https://criticore.cc",
          parentOrganization: { "@type": "Organization", name: "TGN News Network" },
          sameAs: [
            "https://x.com/CritiCoretgn",
            "https://bsky.app/profile/criticore.cc",
            "https://www.instagram.com/criticoretgn/",
            "https://www.tiktok.com/@criticoretgn/",
          ],
        },
      },
    });
    return () => cleanupSeo();
  }, [t]);

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <main>
        <Hero pool={pool} />
        <RatingsSection />
        <ValuesBento />
        <WorldsDeck byWorld={pool.byWorld} loading={pool.isLoading} />
        <TeamSection />
        <JoinSection />
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
