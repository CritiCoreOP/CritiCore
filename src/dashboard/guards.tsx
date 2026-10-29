import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import { Link, Navigate, Outlet, useLocation, useLocalePath } from "@/lib/locale-router";
import { stripLocalePrefix } from "@/lib/localeRouting";
import { Button } from "@/components/ui/button";
import { useDashboard } from "./context";

/** Admin pages: without the admin role nothing of them is rendered, whatever the URL */
export function AdminOnly() {
  const { t } = useTranslation();
  const context = useDashboard();
  if (!context.isAdmin) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{t("dash.adminOnly.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("dash.adminOnly.body")}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/dashboard">{t("dash.nav.overview")}</Link>
        </Button>
      </div>
    );
  }
  // The embedded admin pages read nothing from the context; passing it on keeps nested pages able to
  return <Outlet context={context} />;
}

/** The old admin area lives on inside the dashboard; old links and bookmarks keep working */
export function AdminRedirect() {
  const location = useLocation();
  const localePath = useLocalePath();
  const rest = stripLocalePrefix(location.pathname).replace(/^\/admin/, "").replace(/\/$/, "");
  const target = rest === "/top10" ? "/dashboard/social/top10" : `/dashboard/admin${rest}`;
  return <Navigate to={`${localePath(target)}${location.search}${location.hash}`} replace />;
}
