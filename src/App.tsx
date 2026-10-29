import { useEffect, lazy, Suspense } from "react";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { rememberSignedInAccounts } from "@/lib/accounts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { getCurrentLocale, getLocaleFromPath, getLangFromLocale, getAllRouteVariants } from "@/lib/localeRouting";
import { changeLanguage } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";

// Lazy load non-critical chrome components to reduce initial bundle
const GlassGlowProvider = lazy(() => import("./components/GlassGlowProvider"));
const LiquidGLProvider = lazy(() => import("./components/effects/LiquidGLProvider"));
const MobileDock = lazy(() => import("./components/MobileDock"));
const MobileTopBar = lazy(() => import("./components/MobileTopBar"));
const StatusBanner = lazy(() => import("./components/StatusBanner"));
const RetroObjects = lazy(() => import("./components/RetroObjects"));
const OnboardingWizard = lazy(() => import("./components/onboarding/OnboardingWizard"));

const BanScreen = lazy(() => import("./components/BanScreen"));
import { useBanCheck } from "./hooks/useBanCheck";
import Navbar from "./components/Navbar";
import RouteEffects from "./components/RouteEffects";

// Eagerly loaded (critical path)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const AuthPage = lazy(() => import("./pages/AuthPage"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const MoviesPage = lazy(() => import("./pages/MoviesPage"));
const SeriesPage = lazy(() => import("./pages/SeriesPage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const ArticlesPage = lazy(() => import("./pages/ArticlesPage"));
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const CommunityModToolsPage = lazy(() => import("./pages/CommunityModToolsPage"));
const WriteArticlePage = lazy(() => import("./pages/WriteArticlePage"));
const MyDraftsPage = lazy(() => import("./pages/MyDraftsPage"));
const EditorialBoardPage = lazy(() => import("./pages/EditorialBoardPage"));
const SubmitStoryPage = lazy(() => import("./pages/SubmitStoryPage"));
const PressDashboardPage = lazy(() => import("./pages/PressDashboardPage"));
const ArticleDetailPage = lazy(() => import("./pages/ArticleDetailPage"));
const MovieDetailPage = lazy(() => import("./pages/MovieDetailPage"));
const SeriesDetailPage = lazy(() => import("./pages/SeriesDetailPage"));
const SeasonDetailPage = lazy(() => import("./pages/SeasonDetailPage"));
const GameDetailPage = lazy(() => import("./pages/GameDetailPage"));
const CastCrewPage = lazy(() => import("./pages/CastCrewPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const BioPage = lazy(() => import("./pages/BioPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePageV2"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const AnimePage = lazy(() => import("./pages/AnimePage"));
const AnimeDetailPage = lazy(() => import("./pages/AnimeDetailPage"));
const ImpressumPage = lazy(() => import("./pages/ImpressumPage"));
const DatenschutzPage = lazy(() => import("./pages/DatenschutzPage"));
const AGBPage = lazy(() => import("./pages/AGBPage"));
const DMCAPage = lazy(() => import("./pages/DMCAPage"));
const TransparencyPage = lazy(() => import("./pages/TransparencyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const DonatePage = lazy(() => import("./pages/DonatePage"));
const DeveloperPage = lazy(() => import("./pages/DeveloperPage"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const MetadataGalleryPage = lazy(() => import("./pages/MetadataGalleryPage"));
const MyDataPage = lazy(() => import("./pages/MyDataPage"));
const TicketStatusPage = lazy(() => import("./pages/TicketStatusPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const PrideListPage = lazy(() => import("./pages/PrideListPage"));

const RedaimWorkspacePage = lazy(() => import("./pages/RedaimWorkspacePage"));
const RedaimInvitePage = lazy(() => import("./pages/RedaimInvitePage"));
const ShortLinkRedirect = lazy(() => import("./pages/ShortLinkRedirect"));
const PollsListPage = lazy(() => import("./pages/PollsListPage"));
const PollPage = lazy(() => import("./pages/PollPage"));
const CreatePollPage = lazy(() => import("./pages/CreatePollPage"));
const LoadingTestPage = lazy(() => import("./pages/LoadingTestPage"));
const OnboardingDemoPage = lazy(() => import("./pages/OnboardingDemoPage"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"));
const PressePage = lazy(() => import("./pages/PressePage"));
const DesignSystemPage = lazy(() => import("./pages/DesignSystemPage"));
const NewsletterConfirmPage = lazy(() => import("./pages/NewsletterConfirmPage"));
const NewsletterUnsubscribePage = lazy(() => import("./pages/NewsletterUnsubscribePage"));
const ListDetailPage = lazy(() => import("./pages/ListDetailPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const FeedPage = lazy(() => import("./pages/FeedPage"));
const UmamusumeBeginningEraPage = lazy(() => import("./pages/UmamusumeBeginningEraPage"));
const SocialPackCreatorPage = lazy(() => import("./pages/SocialPackCreatorPage"));

const AchievementPopup = lazy(() => import("./components/AchievementPopup"));

// Dashboard v2.0: social team and admins; the admin tool pages live inside it
const DashboardLayout = lazy(() => import("./dashboard/DashboardLayout"));
const DashboardOverview = lazy(() => import("./dashboard/pages/OverviewPage"));
const DashboardSocial = lazy(() => import("./dashboard/pages/SocialHomePage"));
const DashboardPosts = lazy(() => import("./dashboard/pages/PostGeneratorPage"));
const DashboardRadar = lazy(() => import("./dashboard/pages/ReleaseRadarPage"));
const DashboardAdminHome = lazy(() => import("./dashboard/pages/AdminHomePage"));
const AdminOnly = lazy(() => import("./dashboard/guards").then((m) => ({ default: m.AdminOnly })));
const AdminRedirect = lazy(() => import("./dashboard/guards").then((m) => ({ default: m.AdminRedirect })));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPress = lazy(() => import("./pages/admin/AdminPress"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminStats = lazy(() => import("./pages/admin/AdminStats"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminDmca = lazy(() => import("./pages/admin/AdminDmca"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminImages = lazy(() => import("./pages/admin/AdminImages"));
const AdminRoadmap = lazy(() => import("./pages/admin/AdminRoadmap"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminTopTen = lazy(() => import("./pages/admin/AdminTopTen"));
const AdminJobs = lazy(() => import("./pages/admin/AdminJobs"));

// Saved accounts for the account switcher stay current with every login and token refresh
rememberSignedInAccounts();

// A 404 or 400 comes back the same on every attempt. React Query retried each failed query three
// times on top of the three attempts in invokeEdgeWithRetry, up to 12 function calls per query.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Without this every remount and every return to the tab asked Supabase again (each request is a billed log line)
      staleTime: 60_000,
      retry: (failureCount, error) => {
        const e = error as { status?: number; context?: { status?: number } } | null;
        const status = e?.status ?? e?.context?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});


/** Checks if we're on the forum subdomain */
const isForumSubdomain = () => window.location.hostname === "forums.criticore.cc";

/** Syncs URL locale with i18n and renders child routes */
const LocaleLayout = () => {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const locale = getLocaleFromPath(location.pathname);
  const lang = locale ? getLangFromLocale(locale) : null;
  const banState = useBanCheck();

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      changeLanguage(lang);
    }
  }, [lang, i18n.language]);

  if (!locale || !lang) {
    const target = getCurrentLocale();
    return <Navigate to={`/${target}${location.pathname}${location.search}${location.hash}`} replace />;
  }

  // Forum removed: on forums.criticore.cc, send everyone to the main home page
  if (isForumSubdomain()) {
    return <Navigate to={`/${locale}`} replace />;
  }

  if (banState.banned) {
    return <Suspense fallback={null}><BanScreen reason={banState.reason} type={banState.type || "account"} /></Suspense>;
  }

  // Determine if Navbar should be shown (hide for admin, rw, forum, auth, onboarding)
  const pathAfterLocaleMain = location.pathname.replace(/^\/[^/]+/, "");
  const hideNavbar =
    pathAfterLocaleMain.startsWith("/admin") ||
    pathAfterLocaleMain.startsWith("/dashboard") ||
    pathAfterLocaleMain.startsWith("/rw") ||
    pathAfterLocaleMain.startsWith("/forum") ||
    pathAfterLocaleMain.startsWith("/social-creator") ||
    pathAfterLocaleMain === "/auth" ||
    pathAfterLocaleMain.startsWith("/auth") ||
    pathAfterLocaleMain.startsWith("/onboarding") ||
    // Link in bio: people come from an app's browser for one story, a site menu is in the way
    pathAfterLocaleMain === "/bio";
  // The dashboard and the full-screen creator bring their own bars on phones
  const hideDock = pathAfterLocaleMain.startsWith("/dashboard") || pathAfterLocaleMain.startsWith("/admin") || pathAfterLocaleMain.startsWith("/social-creator") || pathAfterLocaleMain === "/bio";

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t("common.skipToContent", "Zum Inhalt springen")}
      </a>
      {!hideNavbar && <Navbar />}
      {!hideNavbar && (
        <Suspense fallback={null}>
          <StatusBanner />
        </Suspense>
      )}
      {!hideDock && (
        <Suspense fallback={null}>
          <MobileTopBar />
          <MobileDock />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <AchievementPopup />
      </Suspense>
      {/* has-dock: ends with the dock's height (index.css), so nothing scrolls under it */}
      <div id="main-content" tabIndex={-1} className={hideDock ? "app-page-content" : "app-page-content has-dock"}>
        <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background" role="status" aria-live="polite"><M3LoadingIndicator size={80} /><p className="text-sm text-muted-foreground animate-fade-in">{t("common.loading")}</p></div>}>
          <Outlet />
        </Suspense>
      </div>
    </>
  );
};

/** The wizard (and framer-motion with it) only loads for signed-in visitors; nobody else can need it */
const OnboardingGate = () => {
  const { user } = useAuth();
  return user ? <Suspense fallback={null}><OnboardingWizard /></Suspense> : null;
};

/** Redirects non-locale-prefixed paths to the current locale */
const LocaleRedirect = () => {
  const location = useLocation();
  const locale = getCurrentLocale();
  return <Navigate to={`/${locale}${location.pathname}${location.search}${location.hash}`} replace />;
};

/**
 * TMDB pages only for numeric ids. Crawlers hit /movies/null thousands of times a week, and every
 * hit started TMDB calls, an AI enrichment and review queries before showing the error page.
 */
const TmdbIdGuard = ({ children }: { children: React.ReactNode }) => {
  const { id } = useParams();
  return id && /^\d+$/.test(id) ? <>{children}</> : <NotFound />;
};

/** Helper: creates Route elements for all translated variants of a path */
const lr = (canonical: string, element: React.ReactNode) => {
  // Split path into segments e.g. "serien/:id/staffel/:season" → ["serien", ":id", "staffel", ":season"]
  const segments = canonical.split("/");
  // Find translatable segments (those without ":" prefix)
  const translatableIndices = segments.map((s, i) => (!s.startsWith(":") ? i : -1)).filter(i => i >= 0);

  if (translatableIndices.length === 0) {
    return <Route key={canonical} path={canonical} element={element} />;
  }

  // Get all variant combinations
  const variantArrays = translatableIndices.map(i => getAllRouteVariants(segments[i]));

  // Generate all path combinations
  const paths = new Set<string>();
  const generateCombinations = (idx: number, current: string[]) => {
    if (idx === translatableIndices.length) {
      paths.add(current.join("/"));
      return;
    }
    for (const variant of variantArrays[idx]) {
      const next = [...current];
      next[translatableIndices[idx]] = variant;
      generateCombinations(idx + 1, next);
    }
  };
  generateCombinations(0, [...segments]);

  return Array.from(paths).map(p => (
    <Route key={p} path={p} element={element} />
  ));
};

const appRoutes = (
  <>
    <Route index element={<Index />} />
    {lr("auth", <AuthPage />)}
    {/* Former Redaim SSO return address; old links land on the normal login */}
    {lr("auth/callback", <Navigate to=".." relative="path" replace />)}
    {lr("profil", <ProfilePage />)}
    {lr("user/:userId", <PublicProfilePage />)}
    {lr("bio", <BioPage />)}
    {lr("einstellungen", <SettingsPage />)}
    {lr("games", <GamesPage />)}
    {lr("games/:id", <GameDetailPage />)}
    {lr("filme", <MoviesPage />)}
    {lr("filme/:id", <TmdbIdGuard><MovieDetailPage /></TmdbIdGuard>)}
    {lr("serien", <SeriesPage />)}
    {lr("serien/:id", <TmdbIdGuard><SeriesDetailPage /></TmdbIdGuard>)}
    {lr("serien/:id/staffel/:season", <TmdbIdGuard><SeasonDetailPage /></TmdbIdGuard>)}
    {lr("cast/:id", <TmdbIdGuard><CastCrewPage /></TmdbIdGuard>)}
    {lr("entdecken", <ExplorePage />)}
    {lr("suche", <SearchPage />)}
    {lr("anime", <AnimePage />)}
    {lr("anime/:id", <AnimeDetailPage />)}
    {lr("news", <NewsPage />)}
    {lr("news/schreiben", <WriteArticlePage />)}
    {lr("news/entwuerfe", <MyDraftsPage />)}
    {lr("news/board", <EditorialBoardPage />)}
    {lr("news/einreichen", <SubmitStoryPage />)}
    {lr("redaktion", <PressDashboardPage />)}
    {lr("news/:slug", <ArticleDetailPage />)}
    {lr("artikel", <ArticlesPage />)}
    {lr("artikel/:slug", <ArticlePage />)}
    {lr("forum", <Navigate to="/" replace />)}
    {lr("forum/*", <Navigate to="/" replace />)}
    {lr("impressum", <ImpressumPage />)}
    {lr("datenschutz", <DatenschutzPage />)}
    {lr("agb", <AGBPage />)}
    {lr("dmca", <DMCAPage />)}
    {lr("transparenz", <TransparencyPage />)}
    {lr("ueber-uns", <AboutPage />)}
    {lr("support", <SupportPage />)}
    {lr("spenden", <DonatePage />)}
    {lr("developers", <DeveloperPage />)}
    {lr("status", <StatusPage />)}
    {lr("metadata-galerie", <MetadataGalleryPage />)}
    {lr("meine-daten", <MyDataPage />)}
    {lr("ticket/:id", <TicketStatusPage />)}
    {lr("ticket", <TicketStatusPage />)}
    {lr("invite/:token", <AcceptInvitePage />)}

    {lr("listen/:listId", <ListDetailPage />)}
    <Route path="lists/Pride26" element={<PrideListPage />} />
    <Route path="listen/Pride26" element={<PrideListPage />} />
    {lr("benachrichtigungen", <NotificationsPage />)}
    {lr("feed", <FeedPage />)}

    {lr("umfragen", <PollsListPage />)}
    {lr("umfragen/erstellen", <CreatePollPage />)}
    {lr("umfragen/:id", <PollPage />)}
    
    {lr("rw", <RedaimWorkspacePage />)}
    {lr("rw/invite/:token", <RedaimInvitePage />)}
    {lr("rw/:workspaceId", <RedaimWorkspacePage />)}
    {lr("rw/:workspaceId/:pageId", <RedaimWorkspacePage />)}

    {lr("loading-test", <LoadingTestPage />)}
    {lr("onboarding-demo", <OnboardingDemoPage />)}
    {lr("roadmap", <RoadmapPage />)}
    {lr("jobs", <JobsPage />)}
    {lr("jobs/:slug", <JobDetailPage />)}
    {lr("presse", <PressePage />)}
    {lr("social-creator", <SocialPackCreatorPage />)}
    {lr("design-system", <DesignSystemPage />)}
    {lr("newsletter/confirm", <NewsletterConfirmPage />)}
    {lr("newsletter/abmelden", <NewsletterUnsubscribePage />)}

    {/* Special movie campaign pages */}
    <Route path="filme/umamusume-beginning-of-a-new-era" element={<UmamusumeBeginningEraPage />} />
    <Route path="movies/umamusume-beginning-of-a-new-era" element={<UmamusumeBeginningEraPage />} />
    <Route path="films/umamusume-beginning-of-a-new-era" element={<UmamusumeBeginningEraPage />} />
    <Route path="peliculas/umamusume-beginning-of-a-new-era" element={<UmamusumeBeginningEraPage />} />
    

    {/* Dashboard v2.0: overview and social for the team, the admin area only for admins */}
    <Route path="dashboard" element={<DashboardLayout />}>
      <Route index element={<DashboardOverview />} />
      <Route path="social" element={<DashboardSocial />} />
      <Route path="social/posts" element={<DashboardPosts />} />
      <Route path="social/radar" element={<DashboardRadar />} />
      <Route path="social/top10" element={<AdminTopTen />} />
      <Route path="admin" element={<AdminOnly />}>
        <Route index element={<DashboardAdminHome />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="press" element={<AdminPress />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="comments" element={<AdminComments />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="stats" element={<AdminStats />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="dmca" element={<AdminDmca />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="images" element={<AdminImages />} />
        <Route path="roadmap" element={<AdminRoadmap />} />
        <Route path="newsletter" element={<AdminNewsletter />} />
        <Route path="jobs" element={<AdminJobs />} />
      </Route>
    </Route>
    {/* The old admin area: links and bookmarks lead into the dashboard */}
    <Route path="admin/*" element={<AdminRedirect />} />

    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </>
);

const AppContent = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.lang = lang;

    const localeMap: Record<string, string> = {
      de: "de_DE", en: "en_US", fr: "fr_FR", es: "es_ES", th: "th_TH",
    };
    // Same texts as the home page (meta.home in the locale files), so there is one place to change them
    const title = i18n.t("meta.home.title");
    const desc = i18n.t("meta.home.description");

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", localeMap[lang] || "de_DE");
    document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", desc);
  }, [i18n.language]);

  return (
    <TooltipProvider>
      
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteEffects />
        <OnboardingGate />
        <Routes>
          {/* Short link redirects (no locale prefix needed) */}
          <Route path="/m/:code" element={<Suspense fallback={null}><ShortLinkRedirect /></Suspense>} />
          <Route path="/s/:code" element={<Suspense fallback={null}><ShortLinkRedirect /></Suspense>} />
          <Route path="/g/:code" element={<Suspense fallback={null}><ShortLinkRedirect /></Suspense>} />
          <Route path="/a/:code" element={<Suspense fallback={null}><ShortLinkRedirect /></Suspense>} />

          {/* OAuth 2.1 consent screen for the MCP server (no locale prefix) */}
          <Route path="/oauth/consent" element={<Suspense fallback={null}><OAuthConsent /></Suspense>} />


          {/* All routes nested under /:locale */}
          <Route path="/:locale" element={<LocaleLayout />}>
            {appRoutes}
          </Route>

          {/* Redirect any non-locale path to locale-prefixed version */}
          <Route path="*" element={<LocaleRedirect />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <Suspense fallback={null}>
        <GlassGlowProvider />
        <LiquidGLProvider />
        <RetroObjects />
      </Suspense>
      <AppContent />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
