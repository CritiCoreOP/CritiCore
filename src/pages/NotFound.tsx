import { useLocation, useNavigate, Link } from "@/lib/locale-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Film, Gamepad2, Search, Sparkles, Tv, Compass } from "lucide-react";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const QUICK_LINKS = [
  { to: "/filme", key: "nav.movies", icon: Film },
  { to: "/serien", key: "nav.series", icon: Tv },
  { to: "/games", key: "nav.games", icon: Gamepad2 },
  { to: "/anime", key: "nav.anime", icon: Sparkles },
  { to: "/entdecken", key: "nav.explore", icon: Compass },
] as const;

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = t("meta.notFound.title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.notFound.description"));
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", t("meta.notFound.title"));
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", t("meta.notFound.description"));
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname, t]);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/suche?q=${encodeURIComponent(q)}`);
  };

  return (
    // Same background as every other page (bg-muted made the 404 a lighter grey slab)
    <div className="min-h-screen bg-background">
      <main className="container mx-auto flex min-h-[75dvh] max-w-2xl flex-col justify-center px-4 pt-24 pb-16">
        <p className="font-display text-6xl font-bold tracking-tight text-muted-foreground/40 sm:text-7xl" aria-hidden="true">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("notFound.message")}
        </h1>
        <p className="mt-3 max-w-[55ch] text-muted-foreground">{t("notFound.hint")}</p>

        <form onSubmit={search} role="search" className="mt-8 flex gap-2">
          <label htmlFor="notfound-search" className="sr-only">
            {t("search.placeholder")}
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="notfound-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="h-11 pl-9"
            />
          </div>
          <Button type="submit" className="h-11 px-5">
            {t("notFound.search")}
          </Button>
        </form>

        <nav aria-label={t("notFound.quickLinks")} className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {QUICK_LINKS.map(({ to, key, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/"
          className="mt-8 inline-flex w-fit items-center text-sm font-medium text-accent-light underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("notFound.backHome")}
        </Link>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
