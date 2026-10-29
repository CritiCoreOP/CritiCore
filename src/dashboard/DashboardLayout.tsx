import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Home, LayoutDashboard, Loader2, LogOut, Menu, MessageSquareText, Search, Share2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "@/lib/locale-router";
import { stripLocalePrefix } from "@/lib/localeRouting";
import { iwdItiLogo as criticoreLogo } from "@/hooks/useIwdLogo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import CommandPalette from "./CommandPalette";
import { useDashboardAccess, useQueues } from "./data";
import { queueCounts, type QueueCounts } from "./inbox";
import { rememberPath } from "./local";
import { activeItem, visibleGroups, visibleItems, type NavItem } from "./nav";
import { focusRing } from "./ui";

export interface DashboardContext {
  isAdmin: boolean;
  isPress: boolean;
  userId: string;
  counts: QueueCounts;
  openPalette: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function Badge({ count, label }: { count: number; label: string }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-primary/15 px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-primary" aria-label={label}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Sidebar({ isAdmin, counts, path, onNavigate }: { isAdmin: boolean; counts: QueueCounts; path: string; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const active = activeItem(visibleItems(isAdmin), path);
  return (
    <nav aria-label={t("dash.navLabel")} className="flex flex-col gap-5">
      {visibleGroups(isAdmin).map((group) => (
        <div key={group.id} className="grid gap-0.5">
          <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{t(...group.label)}</p>
          {group.items.map((item: NavItem) => {
            const current = active?.id === item.id;
            const count = item.badge ? counts[item.badge] : 0;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end
                onClick={onNavigate}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm transition-colors",
                  focusRing,
                  current ? "bg-primary/12 font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", current && "text-primary")} aria-hidden="true" />
                <span className="truncate">{t(...item.label)}</span>
                {item.standalone ? (
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-60" aria-label={t("dash.fullscreen")} />
                ) : (
                  <Badge count={count} label={t("dash.openItems", { count })} />
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  const { t } = useTranslation();
  return (
    <Link to="/dashboard" className={cn("flex items-center gap-3 rounded-[10px]", focusRing)}>
      <img src={criticoreLogo} alt="" className="h-8 w-8" />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-foreground">CritiCore</span>
        <span className="block text-xs text-muted-foreground">{t("dash.brand")}</span>
      </span>
    </Link>
  );
}

/** Dashboard v2.0: one frame for the social team and admins; the admin groups exist only for admins */
export default function DashboardLayout() {
  const { t } = useTranslation();
  const access = useDashboardAccess();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = stripLocalePrefix(location.pathname).replace(/\/$/, "") || "/";
  const queues = useQueues(access.isAdmin);
  const counts = useMemo(() => queueCounts(queues.data ?? []), [queues.data]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const current = activeItem(visibleItems(access.isAdmin), path);

  useEffect(() => {
    if (!access.loading && !access.user) navigate("/auth");
  }, [access.loading, access.user, navigate]);

  useEffect(() => {
    if (path.startsWith("/dashboard/")) rememberPath(path);
  }, [path]);

  // Open items in the tab title, so a pinned tab says when something waits
  useEffect(() => {
    const page = current ? t(...current.label) : "Dashboard";
    document.title = `${counts.all ? `(${counts.all}) ` : ""}${page} | CritiCore Dashboard`;
  }, [current, counts.all, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (access.loading || (!access.user && !access.error)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background" role="status" aria-label={t("dash.loading")}>
        <Loader2 className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  if (!access.canUse) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{t("dash.noAccess.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("dash.noAccess.body")}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">{t("dash.toSite")}</Link>
          </Button>
        </div>
      </main>
    );
  }

  const context: DashboardContext = { isAdmin: access.isAdmin, isPress: access.isPress, userId: access.user!.id, counts, openPalette: () => setPaletteOpen(true) };

  // Phones: the four places used most, the rest in the menu
  const tabs = [
    { id: "overview", path: "/dashboard", label: t("dash.nav.overview"), icon: LayoutDashboard, count: 0 },
    { id: "social", path: "/dashboard/social", label: t("dash.tabs.social"), icon: Share2, count: 0 },
    { id: "posts", path: "/dashboard/social/posts", label: t("dash.tabs.posts"), icon: MessageSquareText, count: 0 },
    ...(access.isAdmin ? [{ id: "adminHome", path: "/dashboard/admin", label: t("dash.tabs.admin"), icon: ShieldCheck, count: counts.all }] : []),
  ];

  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col gap-6 overflow-y-auto border-r border-border/50 bg-card/30 px-3 py-5 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <Sidebar isAdmin={access.isAdmin} counts={counts} path={path} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/50 bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <Brand />
          </div>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              "ml-auto flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:w-72 lg:ml-0",
              focusRing,
            )}
            aria-label={t("dash.palette.open")}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("dash.palette.open")}</span>
            <kbd className="ml-auto hidden rounded border border-border/70 px-1.5 text-[11px] font-medium sm:inline">{isMac ? "⌘K" : "Strg K"}</kbd>
          </button>
          <div className="flex items-center gap-1 lg:ml-auto">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Link to="/">
                <Home className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">{t("dash.toSite")}</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="hidden text-muted-foreground lg:inline-flex" onClick={() => void signOut().then(() => navigate("/"))} aria-label={t("dash.signOut")} title={t("dash.signOut")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          <Outlet context={context} />
        </main>
      </div>

      {/* Phones and tablets: tabs within thumb reach */}
      <nav aria-label={t("dash.tabsLabel")} className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-flow-col auto-cols-fr">
          {tabs.map((tab) => {
            const on = current?.id === tab.id || (tab.id === "adminHome" && path.startsWith("/dashboard/admin"));
            return (
              <li key={tab.id}>
                <NavLink
                  to={tab.path}
                  end
                  aria-current={on ? "page" : undefined}
                  className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium", focusRing, on ? "text-primary" : "text-muted-foreground")}
                >
                  <tab.icon className="h-5 w-5" aria-hidden="true" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="absolute right-[calc(50%-1.4rem)] top-1.5 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground" aria-label={t("dash.openItems", { count: tab.count })}>
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMenuOpen(true)} className={cn("flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground", focusRing)}>
              <Menu className="h-5 w-5" aria-hidden="true" />
              {t("dash.tabs.more")}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[18rem] overflow-y-auto px-3">
          <SheetTitle className="sr-only">{t("dash.navLabel")}</SheetTitle>
          <SheetDescription className="sr-only">{t("dash.menuDescription")}</SheetDescription>
          <div className="mb-5 px-2 pt-1">
            <Brand />
          </div>
          <Sidebar isAdmin={access.isAdmin} counts={counts} path={path} onNavigate={() => setMenuOpen(false)} />
          <Button variant="ghost" className="mt-6 w-full justify-start gap-2.5 px-3 text-muted-foreground" onClick={() => void signOut().then(() => navigate("/"))}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t("dash.signOut")}
          </Button>
        </SheetContent>
      </Sheet>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} isAdmin={access.isAdmin} />
    </div>
  );
}
