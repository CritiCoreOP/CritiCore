import { Link, useLocation, useNavigate } from "@/lib/locale-router";
import { stripLocalePrefix, canonicalizePath, getLangFromLocale, getLocaleFromPath, getCurrentLocale } from "@/lib/localeRouting";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAccountActions, useSavedAccounts } from "@/hooks/useSavedAccounts";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { X as CloseIcon, Trash2, Compass, HelpCircle, Tv, LogIn, LogOut, Menu as MenuIcon, Clapperboard, Newspaper, Palette, User, Settings, Shield, Gamepad2, UserPlus, KanbanSquare, Pencil, Send, Sparkles, type LucideIcon } from "lucide-react";
import { SECTIONS, useLayoutPrefs, type SectionKey } from "@/lib/layoutPrefs";

/* ── Types ───────────────────────────────────────────────── */

interface DockItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuItem {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
  type?: "separator" | "header";
}

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  news: Newspaper,
  games: Gamepad2,
  filme: Clapperboard,
  serien: Tv,
  anime: Sparkles,
  entdecken: Compass,
};

/* ── Component ───────────────────────────────────────────── */

const MobileDock = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const otherAccounts = useSavedAccounts(user?.id);
  // Which sections sit in the dock (and in which order) is a setting; the rest goes into the sheet
  const { dock, nav } = useLayoutPrefs();
  const { switchTo, addAccount } = useAccountActions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; username: string | null } | null>(null);
  const currentLocale = getLocaleFromPath(location.pathname) || getCurrentLocale();
  const currentLang = getLangFromLocale(currentLocale) || "de";
  const canonicalPath = canonicalizePath(stripLocalePrefix(location.pathname), currentLang);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase
      .from("profiles")
      .select("display_name, avatar_url, username")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const editorialPaths = ["/redaktion", "/news/schreiben", "/news/board", "/news/einreichen", "/news/entwuerfe"];
  const isEditorialContext = editorialPaths.some((p) => canonicalPath === p || canonicalPath.startsWith(p + "/"));

  // Uniform icons: 22px, and absoluteStrokeWidth keeps every stroke at exactly 1.75px whatever the size.
  // Gamepad2 is a flat glyph (20x14 of 24), so it gets 2px more to carry the same weight as the square ones.
  const ICON = { size: 22, strokeWidth: 1.75, absoluteStrokeWidth: true, className: "dock-svg" } as const;
  const dockIcon = (key: SectionKey) => {
    const Icon = SECTION_ICONS[key];
    return <Icon {...ICON} size={key === "games" ? 24 : 22} />;
  };

  const dockItems: DockItem[] = isEditorialContext
    ? [
        { href: "/redaktion", label: t("redaktion.dock.hub", "Redaktion"), icon: <Newspaper {...ICON} /> },
        { href: "/news/board", label: t("redaktion.quick.board", "Board"), icon: <KanbanSquare {...ICON} /> },
        { href: "/news/schreiben", label: t("redaktion.quick.write", "Schreiben"), icon: <Pencil {...ICON} /> },
        { href: "/news/einreichen", label: t("redaktion.quick.submit", "Einreichen"), icon: <Send {...ICON} /> },
      ]
    : dock.map((key) => ({ href: SECTIONS[key].href, label: t(SECTIONS[key].labelKey), icon: dockIcon(key) }));

  // At most four sections plus the menu fit 320px without squeezing; the others live in the sheet (navbar order)
  const sectionLinks: MenuItem[] = [
    ...nav
      .filter((key) => !dock.includes(key))
      .map((key): MenuItem => {
        const Icon = SECTION_ICONS[key];
        return { href: SECTIONS[key].href, label: t(SECTIONS[key].labelKey), icon: <Icon className="h-5 w-5" /> };
      }),
    { type: "separator", label: "", icon: null },
  ];

  const accountItems: MenuItem[] = user
    ? [
        { href: "/profil", label: t("nav.profile"), icon: <User className="h-5 w-5" /> },
        { href: "/einstellungen", label: t("profile.settingsTab", "Settings"), icon: <Settings className="h-5 w-5" /> },
        { href: "/einstellungen?tab=appearance", label: t("nav.appearance", "Appearance"), icon: <Palette className="h-5 w-5" /> },
        { href: "/meine-daten", label: t("nav.privacy", "Privacy & Data"), icon: <Shield className="h-5 w-5" /> },
        { href: "/support", label: t("nav.help", "Help"), icon: <HelpCircle className="h-5 w-5" /> },
        { type: "separator", label: "", icon: null },
        // Saved accounts switch in place; adding one keeps this account signed in
        ...otherAccounts.map((account): MenuItem => ({
          label: account.name,
          icon: (
            <Avatar className="h-7 w-7">
              {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt="" />}
              <AvatarFallback className="text-[11px] bg-secondary text-secondary-foreground">{account.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          ),
          onClick: () => switchTo(account),
        })),
        { label: t("account.add"), icon: <UserPlus className="h-5 w-5" />, onClick: addAccount },
        { label: t("nav.logout"), icon: <LogOut className="h-5 w-5" />, destructive: true, onClick: () => signOut() },
        { label: t("nav.deleteAccount", "Delete account"), icon: <Trash2 className="h-5 w-5" />, destructive: true, onClick: () => setDeleteOpen(true) },
      ]
    : [
        { href: "/auth", label: t("nav.login"), icon: <LogIn className="h-5 w-5" /> },
      ];

  const menuItems: MenuItem[] = [...sectionLinks, ...accountItems];

  // A menu link counts for its sub-pages too (/news/<slug> belongs to News)
  const matchesMenuLink = (href: string) => {
    const path = href.split("?")[0];
    return canonicalPath === path || canonicalPath.startsWith(path + "/");
  };

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const close = useCallback(() => setMenuOpen(false), []);

  const initials = (profile?.display_name || user?.email || "U").slice(0, 2).toUpperCase();

  // ── Sliding active indicator ───────────────────────────
  // All columns are equally wide, so the indicator only needs its column index:
  // translateX(n * 100%) of a one-column-wide element. No measuring, no resize listeners.
  const columns = dockItems.length + (isEditorialContext ? 0 : 1);
  const itemIndex = dockItems.findIndex((it) => canonicalPath === it.href || canonicalPath.startsWith(it.href + "/"));
  // Pages reached through the sheet (Anime, Explore, profile …) mark the menu column
  const menuRouteActive = !isEditorialContext && itemIndex < 0 && menuItems.some((it) => it.href && matchesMenuLink(it.href));
  const activeIndex = menuRouteActive ? columns - 1 : itemIndex;
  // Pages without a dock entry (e.g. home) fade the indicator out in place instead of sliding it to column 0
  const lastActiveRef = useRef(Math.max(activeIndex, 0));
  useEffect(() => {
    if (activeIndex >= 0) lastActiveRef.current = activeIndex;
  }, [activeIndex]);
  const indicatorIndex = activeIndex >= 0 ? activeIndex : lastActiveRef.current;

  return (
    <>
      {/* ── Bottom Sheet Menu ────────────────────────────── */}
      {menuOpen && (
        <>
          <div
            onClick={close}
            className="fixed inset-0 z-[60]"
            style={{
              backgroundColor: "hsl(0 0% 0% / 0.6)",
              animation: "dock-backdrop-in 0.28s ease both",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.more", "Menü")}
            className="fixed inset-x-0 bottom-0 z-[61] bg-card"
            style={{
              animation: "dock-sheet-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
              maxHeight: "85vh",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTop: "1px solid hsl(0 0% 100% / 0.06)",
              boxShadow: "0 -20px 60px -12px hsl(0 0% 0% / 0.6)",
              paddingBottom: "max(env(safe-area-inset-bottom, 16px), 20px)",
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {user && profile && (
              <div className="flex items-center gap-3 px-5 pb-4 pt-1">
                <Avatar className="h-11 w-11 ring-2 ring-primary/30">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-foreground truncate">{profile.display_name || t("nav.profile")}</p>
                  {profile.username && (
                    <p className="text-[13px] text-muted-foreground truncate">@{profile.username}</p>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-y-auto px-3 space-y-0.5 pb-3" style={{ maxHeight: "calc(85vh - 220px)" }}>

              {menuItems.map((item, idx) => {
                if (item.type === "separator") {
                  return (
                    <div key={`sep-${idx}`} className="my-2 mx-2 h-px bg-white/[0.06]" />
                  );
                }

                const isActive = item.href ? matchesMenuLink(item.href) : false;

                const content = (
                  <>
                    <span className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                      item.destructive ? "bg-destructive/10 text-destructive" : isActive ? "bg-primary/15 text-primary" : "bg-white/[0.04] text-foreground/80"
                    }`}>
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  </>
                );

                const cls = `flex items-center gap-3 w-full text-left px-2 py-2 rounded-2xl text-[15px] font-medium transition-colors ${
                  item.destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground/90 hover:bg-white/[0.04] active:bg-white/[0.06]"
                }`;

                if (item.href) {
                  return (
                    <Link key={`${item.href}-${idx}`} to={item.href} className={cls} onClick={close} aria-current={isActive ? "page" : undefined}>
                      {content}
                    </Link>
                  );
                }
                return (
                  <button key={`btn-${idx}`} type="button" onClick={() => { close(); item.onClick?.(); }} className={cls}>
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Floating Pill Dock ──────────────────────────────── */}
      <nav
        aria-label={t("nav.mainNavLabel")}
        data-testid="mobile-dock"
        className="nav-dock-only fixed bottom-0 left-0 right-0 z-50 flex justify-center px-2 min-[360px]:px-3 pointer-events-none"
        style={{
          paddingBottom: "var(--dock-offset)",
          background: "transparent",
          border: 0,
          boxShadow: "none",
          maskImage: "none",
          WebkitMaskImage: "none",
        }}
      >
        <div
          className="dock-glass dock-row pointer-events-auto relative flex h-16"
          style={{ width: "min(100%, 440px)" }}
        >
          {/* One indicator for the whole row: it slides to the active column instead of each item lighting up */}
          <span
            aria-hidden="true"
            className="dock-indicator"
            style={{
              width: `calc((100% - 2 * var(--dock-pad)) / ${columns})`,
              transform: `translateX(${indicatorIndex * 100}%)`,
              opacity: activeIndex >= 0 ? 1 : 0,
            }}
          >
            <span className="dock-indicator-pill" />
          </span>

          {dockItems.map((item, i) => {
            const isActive = i === itemIndex;
            return (
              <Link
                key={item.href}
                to={item.href}
                data-dock-item
                aria-current={isActive ? "page" : undefined}
                className={`dock-item tap-highlight-none ${isActive ? "is-active" : ""}`}
              >
                <span className="dock-icon" aria-hidden="true">{item.icon}</span>
                <span className="dock-label">{item.label}</span>
              </Link>
            );
          })}

          {!isEditorialContext && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`dock-item tap-highlight-none ${menuOpen || menuRouteActive ? "is-active" : ""}`}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
            >
              <span className="dock-icon" aria-hidden="true">
                {menuOpen ? <CloseIcon {...ICON} /> : <MenuIcon {...ICON} />}
              </span>
              <span className="dock-label">{t("nav.more", "Menü")}</span>
            </button>
          )}
        </div>


      </nav>
      {deleteOpen && <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />}
    </>
  );
};

export default MobileDock;
