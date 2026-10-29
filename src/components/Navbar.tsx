import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "@/lib/locale-router";
import { stripLocalePrefix, canonicalizePath, getLangFromLocale, getLocaleFromPath, getCurrentLocale } from "@/lib/localeRouting";
import { useTranslation } from "react-i18next";
import { iwdFullLogo as criticoreFull, iwdItiLogo as criticoreIti, isFullLogoGif } from "@/hooks/useIwdLogo";

import { useAuth } from "@/hooks/useAuth";
import { useGlobalSearch } from "@/hooks/useMedia";
import { tmdbImage, rawgImageResize } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import SearchOverlay from "@/components/SearchOverlay";
import { cn } from "@/lib/utils";
import { PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { SECTIONS, useLayoutPrefs } from "@/lib/layoutPrefs";
import { useAccountActions, useSavedAccounts } from "@/hooks/useSavedAccounts";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { ShieldCheck as AdminPanelSettingsTwoTone, X as CloseTwoTone, Trash2 as DeleteForeverTwoTone, Mail as DraftsTwoTone, FilePen as EditNoteTwoTone, ChevronDown as ExpandMoreTwoTone, ExternalLink as ExternalLinkTwoTone, HelpCircle as HelpOutlineTwoTone, Tv as LiveTvTwoTone, LogOut as LogoutTwoTone, Film as MovieTwoTone, Newspaper as NewspaperTwoTone, Bell as NotificationsTwoTone, Palette as PaletteTwoTone, User as PersonTwoTone, Camera as PhotoCameraTwoTone, BarChart2 as PollTwoTone, Rss as RssFeedTwoTone, Search as SearchTwoTone, Settings as SettingsTwoTone, Share2, Shield as ShieldTwoTone, Gamepad2 as SportsEsportsTwoTone, UserPlus, Kanban as ViewKanbanTwoTone, LayoutDashboard as DashboardTwoTone } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface NavLink {
  href: string;
  label: string;
}

/* ⌘ on Apple keyboards, Ctrl/Strg everywhere else */
const IS_APPLE = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/* Below xl the open search field lies over the links: hide them instead of letting them peek out beside it */
const hideWhileSearching =
  "transition-[opacity,visibility] duration-150 max-xl:group-data-[search-open]/bar:invisible max-xl:group-data-[search-open]/bar:opacity-0";

/* ─── NavLinks — Material CC pill indicator ─────────────────────────────────── */

const NavLinks = ({ links, pathname, className }: { links: NavLink[]; pathname: string; className?: string }) => {
  const navRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [hasActive, setHasActive] = useState(false);
  const hasMeasuredOnce = useRef(false);

  const measure = useCallback((): { left: number; width: number } | null => {
    const container = navRef.current;
    if (!container) return null;
    const active = container.querySelector<HTMLAnchorElement>("[aria-current='page']");
    if (!active) return null;
    const cr = container.getBoundingClientRect();
    const lr = active.getBoundingClientRect();
    return { left: lr.left - cr.left, width: lr.width };
  }, []);

  useEffect(() => {
    // Double-rAF ensures layout is stable after route change
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const m = measure();
        if (!m) {
          setHasActive(false);
          return;
        }
        setHasActive(true);
        setIndicator(m);
        hasMeasuredOnce.current = true;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, measure]);

  /* The first measurement can run before Inter has loaded (or before a language switch re-renders
     the labels): the links get wider afterwards and the pill would sit too short until the next route */
  useEffect(() => {
    const container = navRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const m = measure();
      if (m) setIndicator(m);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <nav
      ref={navRef}
      className={cn("hidden md:flex items-center gap-0.5 relative", className)}
    >
      {/* Pill indicator — Material CC spring ease, always mounted */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0.5 bg-primary/30 border border-primary/50 pointer-events-none"
        style={{
          left: indicator.left,
          width: indicator.width,
          borderRadius: "var(--mcc-shape-full)",
          opacity: hasActive ? 1 : 0,
          transition: hasMeasuredOnce.current
            ? "left var(--mcc-t-mid) var(--mcc-ease-std), width var(--mcc-t-mid) var(--mcc-ease-std), opacity var(--mcc-t-fast) var(--mcc-ease-std)"
            : "opacity var(--mcc-t-fast) var(--mcc-ease-std)",
        }}
      />

      {links.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            to={link.href}
            aria-current={isActive ? "page" : undefined}
            // Active text stays foreground: text-primary on the tinted pill only reached ~2.3:1 in the default theme
            className={`
              relative z-10 whitespace-nowrap px-3 py-1.5 text-sm font-medium
              transition-colors
              ${isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
            style={{ transitionDuration: "var(--mcc-t-fast)" }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};

/* ─── Navbar ────────────────────────────────────────────────────────────────── */

const SCROLL_MAX = 300;

const Navbar = () => {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Scroll progress lives in a CSS variable on the nav, not in React state: re-rendering the whole
  // navbar on every frame of the first 300px of scrolling made pages stutter at the top
  const navRef = useRef<HTMLElement>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { nav: navOrder } = useLayoutPrefs();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const otherAccounts = useSavedAccounts(user?.id);
  const { switchTo, addAccount } = useAccountActions();
  const [isPress, setIsPress] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { data: searchResults, isLoading: searchLoading } = useGlobalSearch(
    searchExpanded ? searchQuery : ""
  );
  const gifRef = useRef<HTMLImageElement>(null);
  const frozenRef = useRef(false);

  /* Freeze event GIF after single play */
  useEffect(() => {
    if (!isFullLogoGif || frozenRef.current) return;
    const timer = setTimeout(() => {
      const img = gifRef.current;
      if (!img || frozenRef.current) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 200;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          frozenRef.current = true;
          img.src = canvas.toDataURL();
        }
      } catch {}
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  /* Enter (or the link under the quick results) opens the full results page */
  const openSearchPage = () => {
    const term = searchQuery.trim();
    if (term.length < 2) return;
    navigate(`/suche?q=${encodeURIComponent(term)}`);
    setSearchExpanded(false);
    setSearchQuery("");
  };

  /* The bar is display:none on phones, tablets and in dock mode. Ctrl+K still has to open
     something there, so it falls back to the fullscreen overlay */
  const [overlaySearchOpen, setOverlaySearchOpen] = useState(false);
  const isBarVisible = () => !!navRef.current && navRef.current.getClientRects().length > 0;

  const openSearch = () => {
    if (!isBarVisible()) {
      setSearchExpanded(false);
      setSearchQuery("");
      setOverlaySearchOpen(true);
      return;
    }
    setSearchExpanded(true);
    // Already open (Ctrl+K again): just pull focus back. Freshly opened: the effect below focuses
    searchInputRef.current?.focus();
  };

  /* Closing with Escape or the X hands focus back to the trigger. That has to wait for the
     re-render: until then the trigger is still visibility:hidden and refuses focus */
  const restoreFocusRef = useRef(false);
  const closeSearch = (restoreFocus = false) => {
    restoreFocusRef.current = restoreFocus;
    setSearchExpanded(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (searchExpanded) {
      searchInputRef.current?.focus();
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      searchTriggerRef.current?.focus();
    }
  }, [searchExpanded]);

  /* Fetch user metadata */
  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      setDisplayName(null);
      setIsPress(false);
      setIsAdmin(false);
      return;
    }
    const loadAvatar = () =>
      supabase
        .from("profiles")
        .select("avatar_url, display_name, username")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setAvatarUrl(data?.avatar_url ?? null);
          setDisplayName(data?.display_name || data?.username || null);
        });
    loadAvatar();
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["press", "admin"])
      .then(({ data }) => {
        setIsAdmin(!!data?.some((r) => r.role === "admin"));
        setIsPress(!!data?.some((r) => r.role === "press" || r.role === "admin"));
      });
    // e.g. the avatar picked during onboarding
    window.addEventListener(PROFILE_UPDATED_EVENT, loadAvatar);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, loadAvatar);
  }, [user]);

  // Home first, then the sections in the order from the settings (news first by default)
  const navLinks: NavLink[] = [
    { href: "/", label: t("nav.home", "Home") },
    ...navOrder.map((key) => ({ href: SECTIONS[key].href, label: t(SECTIONS[key].labelKey) })),
  ];

  /* Close search on click outside */
  useEffect(() => {
    if (!searchExpanded) return;
    const handler = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchExpanded(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [searchExpanded]);

  /* Close search on route change */
  useEffect(() => {
    setSearchExpanded(false);
    setSearchQuery("");
  }, [location.pathname]);

  /* Cmd/Ctrl + K opens search (Escape closes it). The article editor binds Ctrl+K to "insert link"
     and prevents the default, so that one is left alone */
  const openSearchRef = useRef(openSearch);
  openSearchRef.current = openSearch;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearchRef.current();
      } else if (e.key === "Escape") {
        setSearchExpanded(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  /* ── Scroll tracking ── */
  const scrollRAF = useRef(0);
  const getProgress = useCallback(
    () => Math.min(1, Math.max(0, window.scrollY / SCROLL_MAX)),
    []
  );

  useEffect(() => {
    let last = -1;
    const apply = () => {
      scrollRAF.current = 0;
      const p = Math.round(getProgress() * 100) / 100;
      if (p === last) return; // past 300px nothing changes, and nothing is written
      last = p;
      navRef.current?.style.setProperty("--nav-p", String(p));
    };
    const onScroll = () => {
      if (!scrollRAF.current) scrollRAF.current = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRAF.current) cancelAnimationFrame(scrollRAF.current);
    };
  }, [getProgress, location.pathname]);

  return (
    <>
    {/* Hidden together with the bar: an empty header stayed a banner landmark next to the phone top bar's */}
    <header className="nav-navbar-only">
      <nav
        ref={navRef}
        aria-label={t("nav.pageNavLabel")}
        data-testid="main-navbar"
        className="nav-navbar-only fixed top-0 left-0 right-0 z-50"
        style={{
          // --nav-p: 0 at the top, 1 after 300px. The blur radius stays fixed: animating it
          // made the GPU recompute a growing blur on every scroll frame. (The background colour
          // comes from index.css with !important.)
          backdropFilter: "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: "blur(20px) saturate(1.2)",
          borderBottom: "1px solid hsl(var(--border) / calc(var(--nav-p, 0) * 0.12))",
          boxShadow: "0 calc(var(--nav-p, 0) * 8px) calc(var(--nav-p, 0) * 24px) calc(var(--nav-p, 0) * -8px) hsl(0 0% 0% / 0.25)",
        }}
      >
        {/* px-4 like the page containers, so the logo lines up with the content below.
            data-search-open: below xl the open search field needs the room of the links */}
        <div
          data-search-open={searchExpanded || undefined}
          className="group/bar container mx-auto flex h-14 min-w-0 items-center justify-between gap-3 px-4"
        >
          {/* ─ Left: Logo + Nav ─ */}
          <div className="flex min-w-0 items-center gap-3 xl:gap-6">
            {/* Logo with scroll crossfade + Pride hover reveal */}
            <Link
              to="/"
              aria-label={t("nav.logoLabel")}
              className="relative block h-10 w-[112px] shrink-0 xl:w-[150px]"
            >
              <img
                ref={isFullLogoGif ? gifRef : undefined}
                src={criticoreFull}
                alt=""
                aria-hidden="true"
                width={150} height={40} className="absolute inset-0 w-full h-full object-contain object-left"
                style={{
                  // Full logo fades out over the first half of --nav-p
                  opacity: "clamp(0, calc(1 - var(--nav-p, 0) * 2), 1)",
                }}
              />
              <img
                src={criticoreIti}
                alt=""
                aria-hidden="true"
                width={150} height={40} className="absolute inset-0 w-full h-full object-contain object-left"
                style={{
                  // Short logo comes in between 0.4 and 0.7 of --nav-p
                  opacity: "clamp(0, calc((var(--nav-p, 0) - 0.4) / 0.3), 1)",
                }}
              />

            </Link>


            {/* Vertical divider */}
            <div
              className="hidden md:block w-px h-5 bg-border/40"
              aria-hidden="true"
            />

            <NavLinks
              links={navLinks}
              className={hideWhileSearching}
              pathname={(() => {
                const locale = getLocaleFromPath(location.pathname) || getCurrentLocale();
                const lang = getLangFromLocale(locale) || "de";
                const stripped = stripLocalePrefix(location.pathname);
                return canonicalizePath(stripped, lang);
              })()}
            />

            {/* Press Tools: label only from 2xl, "Herramientas de prensa" pushed the bar past one line at xl */}
            {isPress && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("nav.pressTools", "Presse-Tools")}
                    title={t("nav.pressTools", "Presse-Tools")}
                    className={cn(
                      "hidden md:inline-flex h-9 gap-1 px-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground 2xl:gap-1.5 2xl:px-3",
                      hideWhileSearching,
                    )}
                    style={{
                      borderRadius: "var(--mcc-shape-full)",
                      transition: "all var(--mcc-t-fast) var(--mcc-ease-std)",
                    }}
                  >
                    <NewspaperTwoTone />
                    <span className="hidden 2xl:inline">{t("nav.pressTools", "Presse-Tools")}</span>
                    <ExpandMoreTwoTone className="opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-52"
                  style={{ borderRadius: "var(--mcc-shape-md)" }}
                >
                  <DropdownMenuItem
                    onClick={() => navigate("/redaktion")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <DashboardTwoTone className="size-4" />
                    {t("redaktion.dash.title")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/news/schreiben")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <EditNoteTwoTone className="size-4" />
                    {t("nav.writeArticle", "Artikel schreiben")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/news/einreichen")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <PhotoCameraTwoTone className="size-4" />
                    {t("workflow.submitTitle", "Story einreichen")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/news/board")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <ViewKanbanTwoTone className="size-4" />
                    {t("workflow.boardTitle", "Redaktions-Board")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/news/entwuerfe")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <DraftsTwoTone className="size-4" />
                    {t("nav.myDrafts", "Meine Entwürfe")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/umfragen/erstellen")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <PollTwoTone className="size-4" />
                    {t("nav.createPoll", "Umfrage erstellen")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/dashboard")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <DashboardTwoTone className="size-4" />
                    {t("dash.menuLink", "Social & Admin Dashboard")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/social-creator")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <Share2 className="size-4" />
                    {t("socialCreator.title", "Social Pack Creator")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard/admin")}
                        className="gap-2.5 cursor-pointer"
                        style={{ borderRadius: "var(--mcc-shape-sm)" }}
                      >
                        <AdminPanelSettingsTwoTone className="size-4" />
                        {t("nav.adminDashboard", "Admin Dashboard")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* ─ Right: Search + Auth ─ */}
          <div className="flex min-w-0 shrink-0 items-center gap-2">

            {/* Search: icon button up to lg, a labelled field with the shortcut from xl on.
                The open field lies on top of the trigger, so opening it never moves the bar */}
            <div ref={searchContainerRef} className="relative flex items-center">
              <button
                ref={searchTriggerRef}
                type="button"
                onClick={openSearch}
                // Same word as the visible label from xl on, so voice control ("click Search") matches
                aria-label={t("nav.searchShort")}
                aria-expanded={searchExpanded}
                aria-keyshortcuts="Control+K Meta+K"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground",
                  "xl:w-60 xl:justify-start xl:gap-2.5 xl:border xl:border-border/60 xl:bg-secondary/40 xl:pl-3 xl:pr-1.5",
                  searchExpanded && "invisible",
                )}
              >
                <SearchTwoTone className="size-[18px] shrink-0" aria-hidden="true" />
                <span aria-hidden="true" className="hidden min-w-0 flex-1 truncate text-left text-[13px] xl:block">
                  {t("nav.searchShort")}
                </span>
                <kbd
                  aria-hidden="true"
                  className="hidden h-6 shrink-0 items-center rounded-full border border-border/60 px-2 font-sans text-[11px] font-medium text-muted-foreground xl:inline-flex"
                >
                  {IS_APPLE ? "⌘ K" : `${t("nav.ctrlKey")} K`}
                </kbd>
              </button>

              {searchExpanded && (
                <div
                  className="absolute right-0 top-0 z-10 flex h-9 w-[22rem] origin-right items-center rounded-full border border-border/60 bg-secondary shadow-lg shadow-black/20 animate-in fade-in-0 zoom-in-95 duration-150 focus-within:border-primary/60 motion-reduce:animate-none xl:w-60"
                >
                  <SearchTwoTone className="ml-3 size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") closeSearch(true);
                      if (e.key === "Enter") openSearchPage();
                    }}
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder={t("search.placeholder")}
                    aria-label={t("search.placeholder")}
                    className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                    // The pill shows focus; some themes add an input:focus box-shadow that would draw a box inside it
                    style={{ boxShadow: "none" }}
                  />
                  <button
                    type="button"
                    aria-label={t("common.close")}
                    onClick={() => closeSearch(true)}
                    className="mr-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/40 hover:text-foreground"
                  >
                    <CloseTwoTone className="size-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Search results dropdown */}
              {searchExpanded && searchQuery.length >= 2 && (
                <div
                  className="absolute top-full right-0 z-50 mt-2 max-h-[min(65vh,620px)] w-[min(400px,calc(100vw-24px))] overflow-y-auto border border-border/50 bg-popover/95 shadow-xl backdrop-blur-xl animate-scale-in"
                  style={{ borderRadius: "var(--mcc-shape-lg)" }}
                >
                  <div className="p-3 space-y-3">
                    {searchLoading && (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        {t("search.searching")}
                      </p>
                    )}

                    {searchResults?.movies && searchResults.movies.length > 0 && (
                      <SearchSection
                        icon={<MovieTwoTone className="size-3.5" />}
                        label={t("search.movies")}
                        items={searchResults.movies.slice(0, 4)}
                        getImage={(m) => tmdbImage(m.poster_path)}
                        getLabel={(m) => m.title || ""}
                        onSelect={(m) => {
                          navigate(`/filme/${m.id}`);
                          setSearchExpanded(false);
                          setSearchQuery("");
                        }}
                      />
                    )}

                    {searchResults?.series && searchResults.series.length > 0 && (
                      <SearchSection
                        icon={<LiveTvTwoTone className="size-3.5" />}
                        label={t("search.series")}
                        items={searchResults.series.slice(0, 4)}
                        getImage={(s) => tmdbImage(s.poster_path)}
                        getLabel={(s) => s.name || s.title || ""}
                        onSelect={(s) => {
                          navigate(`/serien/${s.id}`);
                          setSearchExpanded(false);
                          setSearchQuery("");
                        }}
                      />
                    )}

                    {searchResults?.games && searchResults.games.length > 0 && (
                      <SearchSection
                        icon={<SportsEsportsTwoTone className="size-3.5" />}
                        label={t("search.games")}
                        items={searchResults.games.slice(0, 4)}
                        getImage={(g) => rawgImageResize(g.background_image, 200)}
                        getLabel={(g) => g.name || ""}
                        onSelect={(g) => {
                          navigate(`/games/${g.id}`);
                          setSearchExpanded(false);
                          setSearchQuery("");
                        }}
                      />
                    )}

                    {!searchLoading &&
                      searchResults &&
                      !searchResults.movies?.length &&
                      !searchResults.series?.length &&
                      !searchResults.games?.length && (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          {t("search.noResults")}
                        </p>
                      )}
                  </div>
                  {/* The dropdown shows four per kind; everything else (and anime, articles) is on the results page */}
                  <button
                    type="button"
                    onClick={openSearchPage}
                    className="sticky bottom-0 flex w-full items-center justify-between gap-3 border-t border-border/50 bg-popover px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <span className="min-w-0 truncate">{t("search.showAll")}</span>
                    <kbd className="shrink-0 rounded border border-border/60 px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground" aria-hidden="true">
                      Enter
                    </kbd>
                  </button>
                </div>
              )}
            </div>


            {/* Notification Bell */}
            {user && (
              <div className="hidden md:flex">
                <NotificationBell />
              </div>
            )}

            {/* Auth */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("nav.accountMenu")}
                    className="hidden md:inline-flex h-9 w-9"
                    style={{ borderRadius: "var(--mcc-shape-full)" }}
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-border/60">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                      <AvatarFallback className="text-xs bg-primary/15 text-primary">
                        {(displayName || user.email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64"
                  style={{ borderRadius: "var(--mcc-shape-md)" }}
                >
                  {/* Who is signed in: with several accounts on one device this has to be obvious */}
                  <DropdownMenuLabel className="flex items-center gap-2.5 py-2 font-normal">
                    <Avatar className="h-9 w-9">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                      <AvatarFallback className="text-xs bg-primary/15 text-primary">
                        {(displayName || user.email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{displayName || t("nav.profile")}</span>
                      {user.email && <span className="block truncate text-xs text-muted-foreground">{user.email}</span>}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/profil")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <PersonTwoTone className="size-4" />
                    {t("nav.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/feed")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <RssFeedTwoTone className="size-4" />
                    {t("nav.feed", "Activity Feed")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/einstellungen")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <SettingsTwoTone className="size-4" />
                    {t("profile.settingsTab", "Einstellungen")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/einstellungen?tab=appearance")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <PaletteTwoTone className="size-4" />
                    {t("nav.appearance", "Erscheinungsbild")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/meine-daten")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <ShieldTwoTone className="size-4" />
                    {t("nav.privacy", "Datenschutz & Privatsphäre")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => window.open("https://subs.criticore.cc", "_blank", "noopener,noreferrer")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <ExternalLinkTwoTone className="size-4" />
                    <span className="flex items-center gap-1.5">
                      SUBS
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground leading-none"
                        style={{ borderRadius: "var(--mcc-shape-full)" }}
                      >
                        NEW!
                      </span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/support")}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <HelpOutlineTwoTone className="size-4" />
                    {t("nav.help", "Hilfe")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {otherAccounts.length > 0 && (
                    <DropdownMenuLabel className="pb-1 text-xs font-medium text-muted-foreground">
                      {t("account.switchTo")}
                    </DropdownMenuLabel>
                  )}
                  {otherAccounts.map((account) => (
                    <DropdownMenuItem
                      key={account.userId}
                      onClick={() => switchTo(account)}
                      className="gap-2.5 cursor-pointer"
                      style={{ borderRadius: "var(--mcc-shape-sm)" }}
                    >
                      <Avatar className="h-7 w-7">
                        {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt="" />}
                        <AvatarFallback className="text-[11px] bg-secondary text-secondary-foreground">
                          {account.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{account.name}</span>
                        {account.email && account.email !== account.name && (
                          <span className="block truncate text-xs text-muted-foreground">{account.email}</span>
                        )}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={addAccount}
                    className="gap-2.5 cursor-pointer"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <UserPlus className="size-4" />
                    {t("account.add")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="gap-2.5 cursor-pointer text-destructive focus:text-destructive"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <LogoutTwoTone className="size-4" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="gap-2.5 cursor-pointer text-destructive focus:text-destructive"
                    style={{ borderRadius: "var(--mcc-shape-sm)" }}
                  >
                    <DeleteForeverTwoTone className="size-4" />
                    {t("nav.deleteAccount", "Konto löschen")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground [&_svg]:size-[18px]"
                  style={{ borderRadius: "var(--mcc-shape-full)" }}
                  onClick={() => navigate("/einstellungen")}
                  aria-label={t("profile.settingsTab", "Einstellungen")}
                  title={t("profile.settingsTab", "Einstellungen")}
                >
                  <SettingsTwoTone />
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="h-9 px-4 text-[13px] font-semibold active:scale-[0.98]"
                  style={{ borderRadius: "var(--mcc-shape-full)" }}
                >
                  <Link to="/auth">{t("nav.login")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
    {overlaySearchOpen && <SearchOverlay onClose={() => setOverlaySearchOpen(false)} />}
    {deleteOpen && <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />}
    </>
  );
};

/* ─── Search Section Helper ─────────────────────────────────────────────────── */

function SearchSection<T extends { id: number }>({
  icon,
  label,
  items,
  getImage,
  getLabel,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  items: T[];
  getImage: (item: T) => string | null | undefined;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex items-center gap-2.5 w-full px-2 py-1.5 hover:bg-secondary/50 text-left group"
            style={{
              borderRadius: "var(--mcc-shape-sm)",
              transition: "background-color var(--mcc-t-fast)",
            }}
          >
            <div
              className="w-7 h-10 overflow-hidden bg-secondary shrink-0"
              style={{ borderRadius: "var(--mcc-shape-xs)" }}
            >
              {getImage(item) && (
                <img
                  src={getImage(item)!}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <span
              className="text-sm text-foreground group-hover:text-primary line-clamp-1"
              style={{ transition: "color var(--mcc-t-fast)" }}
            >
              {getLabel(item)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Navbar;
