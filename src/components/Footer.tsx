import { Link } from "@/lib/locale-router";
import { useTranslation } from "react-i18next";
import { Heart, Leaf } from "lucide-react";
import { iwdFullLogo as criticoreLogo } from "@/hooks/useIwdLogo";
import { SOCIAL_LINKS } from "@/lib/socials";

const linkClass =
  "inline-flex min-h-8 items-center text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground md:min-h-0";

const LinkColumn = ({ title, links }: { title: string; links: { to: string; label: string }[] }) => (
  <div>
    <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
    <ul className="space-y-1 md:space-y-2.5">
      {links.map((l) => (
        <li key={l.to}>
          <Link to={l.to} className={linkClass}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer
      data-testid="site-footer"
      className="border-t border-border/40 bg-gradient-to-b from-card/60 to-background"
    >
      <div className="container mx-auto px-4 pt-14 pb-8 md:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-8 lg:grid-cols-12">
          {/* Brand */}
          <div className="col-span-2 space-y-4 md:col-span-4 lg:col-span-3">
            <Link to="/" className="inline-block rounded-md" aria-label={t("nav.logoLabel")}>
              <img
                src={criticoreLogo}
                alt=""
                width={98}
                height={32}
                className="h-8 w-auto opacity-90 transition-opacity hover:opacity-100"
              />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{t("footer.tagline")}</p>
            <ul className="flex items-center gap-2 pt-1">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-secondary hover:text-foreground"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d={social.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <LinkColumn
              title={t("footer.categories")}
              links={[
                { to: "/games", label: t("nav.games") },
                { to: "/filme", label: t("nav.movies") },
                { to: "/serien", label: t("nav.series") },
                { to: "/anime", label: t("nav.anime") },
                { to: "/news", label: t("nav.news") },
              ]}
            />
          </div>

          <div className="lg:col-span-2">
            <LinkColumn
              title={t("footer.community")}
              links={[
                { to: "/ueber-uns", label: t("footer.about") },
                { to: "/jobs", label: t("footer.jobs") },
                { to: "/entdecken", label: t("nav.explore") },
                { to: "/developers", label: "API" },
                { to: "/status", label: t("status.title", "API-Status") },
              ]}
            />
          </div>

          <div className="lg:col-span-2">
            <LinkColumn
              title={t("footer.legal")}
              links={[
                { to: "/impressum", label: t("footer.impressum") },
                { to: "/datenschutz", label: t("footer.privacy") },
                { to: "/agb", label: t("footer.terms") },
                { to: "/transparenz", label: t("footer.transparency") },
                { to: "/dmca", label: t("footer.dmca") },
                { to: "/support", label: t("footer.support") },
              ]}
            />
          </div>

          {/* Donate: own heading, so it no longer shares the "Support" label with the support link */}
          <div className="lg:col-span-3">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t("donate.title")}</h2>
            <Link
              to="/spenden"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter] duration-150 hover:brightness-110"
            >
              <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
              {t("donate.donateButton")}
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-border/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{t("footer.rights")}</p>
          {/* A plain link instead of Stripe's badge iframe, which contacted climate.stripe.com (and sent
              the visitor's IP to Stripe) on every page view */}
          <a
            href="https://stripe.com/climate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 py-2 -my-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Leaf className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t("footer.climate")}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
