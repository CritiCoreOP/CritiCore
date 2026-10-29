import { useEffect, useState, useRef, useCallback } from "react";
import CommunityIcon from "./CommunityIcon";
import { FORUM_CATEGORIES } from "./forumCategories";
import { Link, useNavigate } from "@/lib/locale-router";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CreateCommunityDialog from "./CreateCommunityDialog";
import { Home, TrendingUp, PlusCircle, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const sidebarCache: { communities: any[] | null; joined: any[] | null; userId: string | null } = {
  communities: null, joined: null, userId: null,
};

const ForumSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>(
    sidebarCache.userId === user?.id ? (sidebarCache.joined || []) : []
  );
  const [showCreate, setShowCreate] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const joinedFetchedRef = useRef<string | null>(null);

  const navRef = useRef<HTMLElement>(null);
  const [sliderStyle, setSliderStyle] = useState<{ top: number; height: number } | null>(null);

  const updateSlider = useCallback(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector("[data-drawer-active='true']") as HTMLElement | null;
    if (activeEl) {
      const containerRect = navRef.current.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setSliderStyle({
        top: elRect.top - containerRect.top + navRef.current.scrollTop,
        height: elRect.height,
      });
    } else {
      setSliderStyle(null);
    }
  }, []);

  useEffect(() => {
    if (!user) { setJoinedCommunities([]); sidebarCache.joined = null; sidebarCache.userId = null; joinedFetchedRef.current = null; return; }
    if (joinedFetchedRef.current === user.id) return;
    joinedFetchedRef.current = user.id;
    supabase.from("forum_community_members").select("community_id, forum_communities(id, slug, name, icon)").eq("user_id", user.id)
      .then(({ data }) => { const r = (data || []).map((m: any) => m.forum_communities).filter(Boolean); sidebarCache.joined = r; sidebarCache.userId = user.id; setJoinedCommunities(r); });
  }, [user]);

  useEffect(() => {
    requestAnimationFrame(updateSlider);
  }, [location.pathname, searchParams, categoriesOpen, communitiesOpen, updateSlider]);

  const isActive = (path: string) => {
    const loc = location.pathname;
    const afterLocale = loc.replace(/^\/[^/]+/, "");
    return afterLocale === path || afterLocale === path + "/";
  };

  const activeCategory = searchParams.get("category");

  const drawerItemClass = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 mr-2 px-3 py-[7px] text-[13px] rounded-r-[var(--mcc-shape-full)] relative z-[1] transition-all duration-[var(--mcc-t-mid)]",
      active
        ? "text-primary font-semibold"
        : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--mcc-surface-container))]/50"
    );

  const sectionLabel = "flex items-center justify-between w-full px-4 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em] hover:text-muted-foreground transition-colors duration-[var(--mcc-t-fast)]";

  return (
    <>
      <aside
        ref={navRef}
        className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border/30 bg-[hsl(var(--mcc-surface-container-lowest))] h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto relative scrollbar-thin"
      >
        {/* Animated slider indicator */}
        {sliderStyle && (
          <div
            className="absolute left-0 right-2 bg-primary/8 rounded-r-[var(--mcc-shape-full)] pointer-events-none z-0"
            style={{
              top: sliderStyle.top,
              height: sliderStyle.height,
              transition: "top 400ms var(--mcc-ease-spring), height 250ms var(--mcc-ease-out)",
            }}
          />
        )}

        {/* Main nav */}
        <nav className="pt-3 pb-1">
          <Link
            to="/forum"
            data-drawer-active={isActive("/forum") && !activeCategory ? "true" : undefined}
            className={drawerItemClass(isActive("/forum") && !activeCategory)}
          >
            <Home className="w-[17px] h-[17px]" />
            Home
          </Link>

          <Link
            to="/forum?sort=top"
            className={drawerItemClass(false)}
          >
            <TrendingUp className="w-[17px] h-[17px]" />
            Beliebt
          </Link>
        </nav>

        <div className="h-px bg-border/20 mx-3 my-1" />

        {/* Categories */}
        <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
          <CollapsibleTrigger className={sectionLabel}>
            Kategorien
            {categoriesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-0.5">
              {FORUM_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = activeCategory === cat.key;
                return (
                  <Link
                    key={cat.key}
                    to={`/forum?category=${cat.key}`}
                    data-drawer-active={active ? "true" : undefined}
                    className={drawerItemClass(active)}
                  >
                    <Icon className="w-[17px] h-[17px]" />
                    <span>{cat.label}</span>
                  </Link>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="h-px bg-border/20 mx-3 my-1" />

        {/* Joined communities */}
        {user && joinedCommunities.length > 0 && (
          <>
            <Collapsible open={communitiesOpen} onOpenChange={setCommunitiesOpen}>
              <CollapsibleTrigger className={sectionLabel}>
                Deine Communities
                {communitiesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pb-0.5">
                  {joinedCommunities.map((c) => {
                    const active = isActive(`/forum/c/${c.slug}`);
                    return (
                      <Link
                        key={c.id}
                        to={`/forum/c/${c.slug}`}
                        data-drawer-active={active ? "true" : undefined}
                        className={drawerItemClass(active)}
                      >
                        <CommunityIcon icon={c.icon} size="sm" />
                        <span className="truncate">c/{c.slug}</span>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
            <div className="h-px bg-border/20 mx-3 my-1" />
          </>
        )}

        {/* Actions */}
        {user && (
          <div className="px-3 py-2 space-y-1">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[13px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--mcc-surface-container))]/50 rounded-[var(--mcc-shape-md)] transition-all duration-[var(--mcc-t-mid)]"
            >
              <PlusCircle className="w-[17px] h-[17px]" />
              Community erstellen
            </button>
            <button
              onClick={() => navigate("/forum/new")}
              className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[13px] bg-primary/10 text-primary hover:bg-primary/15 rounded-[var(--mcc-shape-md)] font-medium transition-all duration-[var(--mcc-t-mid)]"
            >
              <Pencil className="w-[17px] h-[17px]" />
              Beitrag schreiben
            </button>
          </div>
        )}
      </aside>

      <CreateCommunityDialog open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
};

export default ForumSidebar;
