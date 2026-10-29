import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { getCurrentLocale } from "@/lib/localeRouting";

const MEDIA_TYPE_ROUTES: Record<string, string> = {
  m: "/filme",
  s: "/serien",
  g: "/games",
  a: "/news",
};

/**
 * Redirects short links like /m/TH-1159831 → /{locale}/filme/1159831
 * For articles: /a/OU-our-thoughts → looks up article by slug prefix in DB
 */
const ShortLinkRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const type = location.pathname.split("/")[1]; // "m", "s", "g", or "a"

    if (!type || !code) {
      navigate("/", { replace: true });
      return;
    }

    const basePath = MEDIA_TYPE_ROUTES[type];
    if (!basePath) {
      navigate("/", { replace: true });
      return;
    }

    const locale = getCurrentLocale();

    if (type === "a") {
      // Article short links: "OU-our-thoughts" → extract slug prefix after first dash
      const dashIdx = code.indexOf("-");
      if (dashIdx < 0) { navigate("/", { replace: true }); return; }
      const slugPrefix = code.slice(dashIdx + 1);
      if (!slugPrefix) { navigate("/", { replace: true }); return; }

      // Look up the full slug from the database
      supabase
        .from("articles")
        .select("slug")
        .ilike("slug", `${slugPrefix}%`)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.slug) {
            navigate(`/${locale}${basePath}/${data.slug}`, { replace: true });
          } else {
            navigate(`/${locale}${basePath}`, { replace: true });
          }
        });
    } else {
      // Media short links: "TH-1159831" → extract numeric ID
      const match = code.match(/^[A-Za-z]{2}-(\d+)$/);
      if (!match) { navigate("/", { replace: true }); return; }
      navigate(`/${locale}${basePath}/${match[1]}`, { replace: true });
    }
  }, [code, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-16">
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <M3LoadingIndicator size={64} label="Weiterleitung…" />
        </div>
      </main>
    </div>
  );
};

export default ShortLinkRedirect;
