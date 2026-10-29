import { Link, useLocation } from "@/lib/locale-router";
import { stripLocalePrefix, canonicalizePath, getLangFromLocale, getLocaleFromPath, getCurrentLocale } from "@/lib/localeRouting";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import SearchOverlay from "@/components/SearchOverlay";

import { iwdItiLogo as criticoreIti } from "@/hooks/useIwdLogo";
import { Home as HomeTwoTone, Search as SearchTwoTone, Newspaper } from "lucide-react";

const MobileTopBar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const currentLocale = getLocaleFromPath(location.pathname) || getCurrentLocale();
  const currentLang = getLangFromLocale(currentLocale) || "de";
  const canonicalPath = canonicalizePath(stripLocalePrefix(location.pathname), currentLang);
  const editorialPaths = ["/redaktion", "/news/schreiben", "/news/board", "/news/einreichen", "/news/entwuerfe"];
  const isEditorialContext = editorialPaths.some((p) => canonicalPath === p || canonicalPath.startsWith(p + "/"));

  return (
    <>
      <header
        className="nav-dock-only mobile-topbar-hide fixed top-0 left-0 right-0 z-[55] flex items-center justify-between px-4 h-13"
        style={{
          height: "calc(3.25rem + 12px + env(safe-area-inset-top, 0px))",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        {isEditorialContext ? (
          <>
            <div className="flex items-center gap-2 text-foreground/90">
              <Newspaper className="h-[18px] w-[18px] text-primary" />
              <span className="text-[13px] font-semibold tracking-wide uppercase">
                {t("redaktion.appTitle", "Redaktion")}
              </span>
            </div>
            <span className="w-10 h-10" aria-hidden />
          </>
        ) : (
          <>
            {/* Home button (44x44 touch target) */}
            <Link
              to="/"
              className="flex items-center justify-center w-11 h-11 -ml-2 rounded-full text-foreground/80 hover:text-foreground active:bg-white/[0.06] transition-colors"
              aria-label={t("nav.home", "Startseite")}
            >
              <HomeTwoTone className="h-[20px] w-[20px]" />
            </Link>

            {/* Center: Logo */}
            <Link to="/" className="absolute left-1/2 flex h-11 -translate-x-1/2 items-center px-2" aria-hidden="true" tabIndex={-1}>
              <img
                src={criticoreIti}
                alt=""
                width={24} height={24} className="h-6 object-contain"
              />
            </Link>

            {/* Search button (44x44 touch target) */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="glass-icon-button flex items-center justify-center w-10 h-10 rounded-full tap-highlight-none"
              style={{ marginRight: 0 }}
              aria-label={t("nav.search")}
            >
              <SearchTwoTone className="h-[20px] w-[20px]" strokeWidth={2} />
            </button>
          </>
        )}
      </header>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
};

export default MobileTopBar;
