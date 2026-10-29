import { useEffect, useState, useCallback } from "react";
import { Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CommunityIcon from "@/components/forum/CommunityIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, TrendingUp, Sparkles, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "official" | "trending" | "new";

const FILTERS: { key: FilterMode; label: string; icon: any }[] = [
  { key: "all", label: "Alle", icon: Users },
  { key: "official", label: "Offiziell", icon: Shield },
  { key: "trending", label: "Trending", icon: TrendingUp },
  { key: "new", label: "Neu", icon: Sparkles },
];

const ForumCommunitiesPage = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("forum_communities").select("*");

    if (filter === "official") query = query.eq("is_official", true);
    if (filter === "trending") query = query.order("post_count", { ascending: false });
    else if (filter === "new") query = query.order("created_at", { ascending: false });
    else query = query.order("member_count", { ascending: false });

    query = query.limit(50);
    const { data } = await query;
    setCommunities(data || []);

    if (user) {
      const { data: members } = await supabase
        .from("forum_community_members")
        .select("community_id")
        .eq("user_id", user.id);
      setJoinedIds(new Set((members || []).map((m) => m.community_id)));
    }

    setLoading(false);
  }, [filter, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleJoin = async (communityId: string, currentCount: number) => {
    if (!user) { toast.error("Bitte anmelden."); return; }
    setJoiningId(communityId);
    const isJoined = joinedIds.has(communityId);

    if (isJoined) {
      await supabase.from("forum_community_members").delete().eq("community_id", communityId).eq("user_id", user.id);
      await supabase.from("forum_communities").update({ member_count: Math.max(0, currentCount - 1) }).eq("id", communityId);
      setJoinedIds((prev) => { const next = new Set(prev); next.delete(communityId); return next; });
      setCommunities((prev) => prev.map((c) => c.id === communityId ? { ...c, member_count: Math.max(0, c.member_count - 1) } : c));
    } else {
      await supabase.from("forum_community_members").insert({ community_id: communityId, user_id: user.id, role: "member" });
      await supabase.from("forum_communities").update({ member_count: currentCount + 1 }).eq("id", communityId);
      setJoinedIds((prev) => new Set(prev).add(communityId));
      setCommunities((prev) => prev.map((c) => c.id === communityId ? { ...c, member_count: c.member_count + 1 } : c));
    }
    setJoiningId(null);
  };

  const filtered = search.trim()
    ? communities.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(search.toLowerCase())
      )
    : communities;

  useEffect(() => {
    document.title = "Communities — CritiCore Forums";
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4">
      <h1 className="text-xl font-bold text-foreground mb-4">Communities entdecken</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Communities suchen..."
            className="pl-9 bg-muted border-0"
          />
        </div>
        <div className="flex items-center gap-px border-b border-border sm:border-b-0">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap border-b-2 sm:border-b-0 sm:rounded-lg",
                  filter === f.key
                    ? "border-foreground text-foreground sm:bg-muted"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg border border-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Keine Communities gefunden.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => {
            const isJoined = joinedIds.has(c.id);
            return (
              <div
                key={c.id}
                className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
              >
                {/* Banner */}
                <div
                  className="h-16 w-full"
                  style={{
                    background: c.banner_url
                      ? `url(${c.banner_url}) center/cover no-repeat`
                      : "hsl(var(--muted))",
                  }}
                />
                <div className="px-4 pb-4 -mt-5">
                  <div className="flex items-end gap-3 mb-2">
                    <div className="w-10 h-10 bg-card border-2 border-border rounded-lg flex items-center justify-center overflow-hidden">
                      <CommunityIcon icon={c.icon} size="md" />
                    </div>
                    <div className="flex-1 min-w-0 pt-5">
                      <Link to={`/forum/c/${c.slug}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                        c/{c.slug}
                      </Link>
                    </div>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{c.member_count} Mitglieder · {c.post_count} Posts</span>
                    {user && (
                      <Button
                        variant={isJoined ? "outline" : "default"}
                        size="sm"
                        className="text-xs h-7 px-3"
                        disabled={joiningId === c.id}
                        onClick={() => handleJoin(c.id, c.member_count)}
                      >
                        {isJoined ? "Beigetreten" : "Beitreten"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ForumCommunitiesPage;
