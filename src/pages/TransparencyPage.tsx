import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Database, Flag, HandCoins, Newspaper, Scale, Server, Star, Users } from "lucide-react";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditorialTeam } from "@/hooks/useEditorialTeam";
import { Link } from "@/lib/locale-router";
import { LEGAL_ENTITY } from "@/lib/legalEntity";
import { formatDate } from "@/lib/locale";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { staffRoleLabels } from "@/lib/staffRoles";

// Date of the last content change on this page; update it with the texts
const UPDATED = "2026-10-08";

const SECTIONS = [
  { id: "team", icon: Users },
  { id: "ratings", icon: Star },
  { id: "money", icon: HandCoins },
  { id: "ai", icon: Bot },
  { id: "sources", icon: Database },
  { id: "press", icon: Newspaper },
  { id: "moderation", icon: Flag },
  { id: "tech", icon: Server },
] as const;

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

function Section({ id, icon: Icon, title, children }: { id: string; icon: typeof Users; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-border/50 pt-10 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="flex items-center gap-2.5 font-display text-2xl font-bold text-foreground">
        <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-4 max-w-[65ch] space-y-4 text-base leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function EditorialTeam() {
  const { t } = useTranslation();
  const { data: team, isLoading } = useEditorialTeam();

  if (isLoading) return <Skeleton className="h-20 w-full max-w-md rounded-2xl" />;
  if (!team?.length) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {team.map((member) => {
        const name = member.display_name || member.username || "?";
        return (
          <li key={member.user_id}>
            <Link
              to={`/user/${member.user_id}`}
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card"
            >
              <Avatar className="h-12 w-12">
                {member.avatar_url && <AvatarImage src={member.avatar_url} alt="" />}
                <AvatarFallback className="bg-primary/15 text-primary">{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{name}</span>
                <span className="block text-sm text-accent-light">{staffRoleLabels(member.staff_roles, t).join(", ")}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const TransparencyPage = () => {
  const { t } = useTranslation();

  useEffect(() => {
    setSeo({ title: t("meta.transparency.title"), description: t("meta.transparency.description"), url: "/transparenz" });
    return () => cleanupSeo();
  }, [t]);

  const list = (keys: string[]) => (
    <ul className="space-y-3">
      {keys.map((key) => (
        <li key={key} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/70">
          {t(key)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-6xl px-4">
          <header className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">{t("transparencyPage.title")}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("transparencyPage.intro")}</p>
            <p className="mt-3 text-sm text-muted-foreground">{t("transparencyPage.updated", { date: formatDate(UPDATED, { day: "numeric", month: "long", year: "numeric" }) })}</p>
          </header>

          <div className="mt-12 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)]">
            {/* Section index: sticky beside the text on wide screens, a plain list above it on phones */}
            <nav aria-label={t("transparencyPage.nav")} className="lg:sticky lg:top-24 lg:self-start">
              <p className="mb-3 text-sm font-semibold text-foreground">{t("transparencyPage.nav")}</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3 lg:grid-cols-1">
                {SECTIONS.map(({ id }) => (
                  <li key={id}>
                    <a href={`#${id}`} className="block py-1 text-muted-foreground transition-colors hover:text-foreground">
                      {t(`transparencyPage.${id}.title`)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="min-w-0 space-y-10">
              <Section id="team" icon={Users} title={t("transparencyPage.team.title")}>
                <p>{t("transparencyPage.team.text", { name: LEGAL_ENTITY.name, tradeName: LEGAL_ENTITY.tradeName })}</p>
                <EditorialTeam />
                <p><Link to="/impressum" className={linkClass}>{t("transparencyPage.links.impressum")}</Link></p>
              </Section>

              <Section id="ratings" icon={Star} title={t("transparencyPage.ratings.title")}>
                {list(["transparencyPage.ratings.community", "transparencyPage.ratings.critics", "transparencyPage.ratings.external"])}
              </Section>

              <Section id="money" icon={HandCoins} title={t("transparencyPage.money.title")}>
                {list(["transparencyPage.money.noAds", "transparencyPage.money.donations", "transparencyPage.money.copies"])}
                <p><Link to="/spenden" className={linkClass}>{t("transparencyPage.links.donate")}</Link></p>
              </Section>

              <Section id="ai" icon={Bot} title={t("transparencyPage.ai.title")}>
                <p>{t("transparencyPage.ai.intro")}</p>
                {list(["transparencyPage.ai.translation", "transparencyPage.ai.tags", "transparencyPage.ai.tools"])}
                <p>{t("transparencyPage.ai.provider")}</p>
              </Section>

              <Section id="sources" icon={Database} title={t("transparencyPage.sources.title")}>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  {(["tmdb", "igdb", "anilist", "justwatch", "omdb"] as const).map((source) => (
                    <div key={source} className="contents">
                      <dt className="font-semibold text-foreground">{t(`transparencyPage.sources.${source}.name`)}</dt>
                      <dd className="-mt-3 text-foreground/85 sm:mt-0">{t(`transparencyPage.sources.${source}.text`)}</dd>
                    </div>
                  ))}
                </dl>
                <p>{t("transparencyPage.sources.fixes")}</p>
                {/* TMDB's terms ask for this sentence verbatim */}
                <p className="text-sm text-muted-foreground" lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
              </Section>

              <Section id="press" icon={Newspaper} title={t("transparencyPage.press.title")}>
                <p>{t("transparencyPage.press.text")}</p>
                <p><Link to="/presse" className={linkClass}>{t("transparencyPage.links.press")}</Link></p>
              </Section>

              <Section id="moderation" icon={Flag} title={t("transparencyPage.moderation.title")}>
                <p>{t("transparencyPage.moderation.text")}</p>
                <p className="flex flex-wrap gap-x-5 gap-y-2">
                  <Link to="/agb" className={linkClass}>{t("transparencyPage.links.terms")}</Link>
                  <Link to="/impressum" className={linkClass}>{t("transparencyPage.links.dsa")}</Link>
                </p>
              </Section>

              <Section id="tech" icon={Server} title={t("transparencyPage.tech.title")}>
                <p>{t("transparencyPage.tech.text")}</p>
                <p className="flex flex-wrap gap-x-5 gap-y-2">
                  <Link to="/status" className={linkClass}>{t("transparencyPage.links.status")}</Link>
                  <Link to="/developers" className={linkClass}>{t("transparencyPage.links.api")}</Link>
                  <Link to="/datenschutz" className={linkClass}>{t("transparencyPage.links.privacy")}</Link>
                </p>
              </Section>

              <aside className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/40 p-5">
                <Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-foreground/85">
                  {t("transparencyPage.contact")}{" "}
                  <a href={`mailto:${LEGAL_ENTITY.email}`} className={linkClass}>{LEGAL_ENTITY.email}</a>
                </p>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TransparencyPage;
