import { useEffect, useState, useRef } from "react";
import { Link } from "@/lib/locale-router";
import { useLocation } from "react-router-dom";
import { stripLocalePrefix } from "@/lib/localeRouting";
import CommunityIcon from "./CommunityIcon";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, Info, ExternalLink } from "lucide-react";

const panelCache: { data: any[] | null } = { data: null };

const ForumRightPanel = () => {
  const location = useLocation();
  const cleanPath = stripLocalePrefix(location.pathname);

  // Hide on community pages (they have their own right sidebar)
  const isCommunityPage = /^\/forum\/c\//.test(cleanPath);
  // Hide on post detail pages
  const isPostPage = /^\/forum\/[^/]+$/.test(cleanPath) && !cleanPath.includes("/c/") && cleanPath !== "/forum" && !cleanPath.endsWith("/new") && !cleanPath.endsWith("/search") && !cleanPath.endsWith("/communities");

  const [trending, setTrending] = useState<any[]>(panelCache.data || []);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current && panelCache.data) return;
    fetched.current = true;
    supabase
      .from("forum_communities")
      .select("id, slug, name, icon, member_count, description, status_emoji")
      .order("member_count", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        const r = data || [];
        panelCache.data = r;
        setTrending(r);
      });
  }, []);

  if (isCommunityPage || isPostPage) return null;

  return (
    <aside className="hidden xl:flex flex-col w-72 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto scrollbar-thin py-4 pr-4 gap-4">
      {/* Trending Communities */}
      {trending.length > 0 && (
        <div className="bg-[hsl(var(--mcc-surface-container))] rounded-[var(--mcc-shape-lg)] border border-border/30 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Trending</h3>
          </div>
          <div className="divide-y divide-border/20">
            {trending.map((c, i) => (
              <Link
                key={c.id}
                to={`/forum/c/${c.slug}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[hsl(var(--mcc-surface-container-high))] transition-colors duration-[var(--mcc-t-fast)]"
              >
                <span className="text-[10px] font-bold text-muted-foreground/40 w-4 text-right">{i + 1}</span>
                <CommunityIcon icon={c.icon} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">c/{c.slug}</p>
                  <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    {c.member_count} Mitglieder
                    {c.status_emoji && <span className="ml-1">{c.status_emoji}</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            to="/forum/communities"
            className="block text-center px-4 py-2.5 text-xs text-primary font-medium hover:bg-[hsl(var(--mcc-surface-container-high))] transition-colors border-t border-border/20"
          >
            Alle Communities →
          </Link>
        </div>
      )}

      {/* Forum Info */}
      <div className="bg-[hsl(var(--mcc-surface-container))] rounded-[var(--mcc-shape-lg)] border border-border/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-muted-foreground/70" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Forum Info</h3>
        </div>
        <p className="text-xs text-muted-foreground/70 leading-relaxed mb-3">
          CritiCore Forums ist der Ort für Diskussionen über Filme, Serien und Games. Tritt Communities bei und teile deine Meinung.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://criticore.cc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            criticore.cc
          </a>
        </div>
      </div>

      {/* Footer links */}
      <div className="px-2 text-[10px] text-muted-foreground/40 space-y-1.5 mt-auto">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <Link to="/impressum" className="hover:text-muted-foreground transition-colors">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-muted-foreground transition-colors">Datenschutz</Link>
          <Link to="/agb" className="hover:text-muted-foreground transition-colors">AGB</Link>
        </div>
        <p>CritiCore Forums © {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
};

export default ForumRightPanel;
