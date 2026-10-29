import { useState, useRef, useEffect, useCallback } from "react";
import forumsLogo from "@/assets/criticore-forums-logo.png";
import { Link, useNavigate, useLocation } from "@/lib/locale-router";
import { stripLocalePrefix } from "@/lib/localeRouting";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import CommunityIcon from "./CommunityIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, X, User, LogOut, Settings, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

let profileCache: { userId: string; data: any } | null = null;

const ForumNavbar = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(
    profileCache && profileCache.userId === user?.id ? profileCache.data : null
  );
  const fetchedRef = useRef<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cleanPath = stripLocalePrefix(location.pathname);
  const communitySlugMatch = cleanPath.match(/^\/forum\/c\/([^/]+)/);
  const currentCommunitySlug = communitySlugMatch?.[1] || null;
  const [communityContext, setCommunityContext] = useState<{ slug: string; icon: string | null; id: string } | null>(null);

  useEffect(() => {
    if (!currentCommunitySlug) { setCommunityContext(null); return; }
    supabase.from("forum_communities").select("id, slug, icon").eq("slug", currentCommunitySlug).single()
      .then(({ data }) => {
        if (data) setCommunityContext({ slug: data.slug, icon: data.icon, id: data.id });
        else setCommunityContext(null);
      });
  }, [currentCommunitySlug]);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    if (fetchedRef.current === user.id) return;
    fetchedRef.current = user.id;
    if (profileCache?.userId === user.id) { setProfile(profileCache.data); return; }
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { profileCache = { userId: user.id, data }; setProfile(data); });
  }, [user]);

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) { setSearchSuggestions([]); setShowSuggestions(false); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      const term = `%${value}%`;
      if (communityContext) {
        const { data: posts } = await supabase.from("forum_posts").select("id, title").eq("community_id", communityContext.id).ilike("title", term).limit(8);
        const suggestions = (posts || []).map((p) => ({ type: "post" as const, ...p }));
        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } else {
        const [{ data: posts }, { data: comms }] = await Promise.all([
          supabase.from("forum_posts").select("id, title").ilike("title", term).limit(5),
          supabase.from("forum_communities").select("id, slug, name, icon").ilike("name", term).limit(3),
        ]);
        const suggestions: any[] = [];
        (comms || []).forEach((c) => suggestions.push({ type: "community", ...c }));
        (posts || []).forEach((p) => suggestions.push({ type: "post", ...p }));
        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }
    }, 300);
  }, [communityContext]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    navigate(`/forum/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const searchPlaceholder = communityContext
    ? `Suche in c/${communityContext.slug}`
    : "Forum durchsuchen...";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[hsl(var(--mcc-surface-container-lowest))]/95 border-b border-border/30 backdrop-blur-xl backdrop-saturate-150">
      <div className="h-full max-w-[1440px] mx-auto px-4 lg:px-6 flex items-center gap-4">
        {/* Logo */}
        {!searchOpen && (
          <Link to="/forum" className="flex items-center gap-2.5 shrink-0 group">
            <img src={forumsLogo} alt="CritiCore Forums" className="h-[22px] w-auto transition-opacity group-hover:opacity-80" />
          </Link>
        )}

        {/* Desktop search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-auto hidden sm:block relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 z-10" />
            {communityContext && (
              <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-primary/8 border border-primary/15 rounded-full z-10">
                <CommunityIcon icon={communityContext.icon} size="sm" />
                <span className="text-[10px] font-medium text-primary">c/{communityContext.slug}</span>
                <button type="button" onClick={() => setCommunityContext(null)} className="text-primary/50 hover:text-primary ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={searchPlaceholder}
              className={`w-full h-8 bg-[hsl(var(--mcc-surface-container))] hover:bg-[hsl(var(--mcc-surface-container-high))] focus:bg-[hsl(var(--mcc-surface-container-high))] border border-transparent focus:border-primary/30 rounded-[var(--mcc-shape-full)] text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-[var(--mcc-t-mid)] ${
                communityContext ? "pl-[calc(2.5rem+var(--chip-w,0px))]" : "pl-9"
              } pr-3`}
              style={communityContext ? { paddingLeft: `${12 + 32 + (communityContext.slug.length * 6.5) + 48}px` } : undefined}
            />
          </div>
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[hsl(var(--mcc-surface-container-high))] border border-border/40 rounded-[var(--mcc-shape-md)] shadow-xl z-50 overflow-hidden">
              {searchSuggestions.map((s) => (
                <Link
                  key={`${s.type}-${s.id}`}
                  to={s.type === "community" ? `/forum/c/${s.slug}` : `/forum/${s.id}`}
                  className="flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-primary/5 transition-colors duration-[var(--mcc-t-fast)]"
                  onClick={() => setShowSuggestions(false)}
                >
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider w-6 shrink-0">
                    {s.type === "community" ? "c/" : "Post"}
                  </span>
                  <span className="text-foreground truncate">{s.type === "community" ? s.name : s.title}</span>
                </Link>
              ))}
              <button
                onClick={handleSearchSubmit}
                className="w-full flex items-center gap-2 px-4 py-2 text-[11px] text-primary hover:bg-primary/5 transition-colors border-t border-border/20"
              >
                <Search className="w-3 h-3" /> Alle Ergebnisse für „{searchQuery}"
              </button>
            </div>
          )}
        </form>

        {/* Mobile search overlay */}
        {searchOpen && (
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 sm:hidden animate-in fade-in-0 slide-in-from-right-4 duration-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Suche..."
                className="w-full h-8 bg-[hsl(var(--mcc-surface-container))] border border-border/30 rounded-[var(--mcc-shape-full)] text-[13px] pl-9 pr-4 outline-none text-foreground"
                autoFocus
              />
            </div>
            <button onClick={() => setSearchOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Right actions */}
        {!searchOpen && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-2 rounded-[var(--mcc-shape-full)] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--mcc-surface-container))] transition-all duration-[var(--mcc-t-fast)]"
              aria-label="Suche öffnen"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            <Link
              to="/forum/communities"
              className="hidden md:flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--mcc-surface-container))] transition-all duration-[var(--mcc-t-fast)] px-2.5 py-1.5 rounded-[var(--mcc-shape-full)]"
            >
              <Compass className="w-3.5 h-3.5" />
              Entdecken
            </Link>

            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all duration-[var(--mcc-t-fast)] ml-1">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="text-[10px] bg-[hsl(var(--mcc-surface-container))] text-muted-foreground">
                          {(profile?.display_name || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-[var(--mcc-shape-md)]">
                    <DropdownMenuItem className="gap-2 text-[13px] py-1.5" onClick={() => navigate("/profil")}>
                      <User className="w-3.5 h-3.5" /> Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-[13px] py-1.5" onClick={() => navigate("/einstellungen")}>
                      <Settings className="w-3.5 h-3.5" /> Einstellungen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-[13px] py-1.5 text-destructive" onClick={signOut}>
                      <LogOut className="w-3.5 h-3.5" /> Abmelden
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="default" size="sm" className="h-7 text-[11px] rounded-[var(--mcc-shape-full)] px-3.5" onClick={() => navigate("/auth")}>
                Anmelden
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default ForumNavbar;
