import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ForumPostCard from "./ForumPostCard";
import CommunityIcon from "./CommunityIcon";
import { Search, Inbox, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { escapePostgrestLike } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";

type SearchTab = "all" | "posts" | "communities";

const ForumSearchPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [tab, setTab] = useState<SearchTab>("all");
  const [posts, setPosts] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);

    const searchTerm = `%${escapePostgrestLike(query)}%`;

    // Search posts
    const { data: postsData } = await supabase
      .from("forum_posts")
      .select("*")
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
      .order("upvotes", { ascending: false })
      .limit(30);

    if (postsData) {
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url, is_official").in("user_id", userIds)
        : { data: [] };

      const communityIds = [...new Set(postsData.filter((p) => p.community_id).map((p) => p.community_id))];
      const { data: postComms } = communityIds.length > 0
        ? await supabase.from("forum_communities").select("id, slug, name, icon").in("id", communityIds)
        : { data: [] };

      let votes: any[] = [];
      if (user) {
        const postIds = postsData.map((p) => p.id);
        if (postIds.length > 0) {
          const { data: v } = await supabase.from("forum_votes").select("target_id, vote_type").eq("user_id", user.id).eq("target_type", "post").in("target_id", postIds);
          votes = v || [];
        }
      }

      setPosts(postsData.map((p) => ({
        ...p,
        profile: profiles?.find((pr) => pr.user_id === p.user_id),
        community: postComms?.find((c) => c.id === p.community_id),
        userVote: votes.find((v) => v.target_id === p.id)?.vote_type || null,
      })));
    }

    // Search communities
    const { data: commsData } = await supabase
      .from("forum_communities")
      .select("*")
      .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .order("member_count", { ascending: false })
      .limit(20);

    setCommunities(commsData || []);
    setLoading(false);
  }, [query, user]);

  useEffect(() => { search(); }, [search]);

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">{part}</mark>
        : part
    );
  };

  const tabs: { key: SearchTab; label: string; icon: any; count: number }[] = [
    { key: "all", label: "Alles", icon: Search, count: posts.length + communities.length },
    { key: "posts", label: "Posts", icon: FileText, count: posts.length },
    { key: "communities", label: "Communities", icon: Users, count: communities.length },
  ];

  const showPosts = tab === "all" || tab === "posts";
  const showCommunities = tab === "all" || tab === "communities";

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
      <h1 className="text-lg font-bold text-foreground mb-1">
        Suchergebnisse für "{query}"
      </h1>

      <div className="flex items-center gap-px mb-3 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                tab === t.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span className="text-xs text-muted-foreground">({t.count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse border-b border-border rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {showCommunities && communities.length > 0 && (
            <div className="mb-4">
              {tab === "all" && <h2 className="text-sm font-semibold text-muted-foreground mb-2">Communities</h2>}
              <div className="grid gap-2">
                {communities.map((c) => (
                  <Link
                    key={c.id}
                    to={`/forum/c/${c.slug}`}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-accent/30 transition-colors"
                  >
                    <CommunityIcon icon={c.icon} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">
                        c/{highlightMatch(c.slug, query)}
                      </p>
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {highlightMatch(c.description, query)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{c.member_count} Mitglieder</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {showPosts && posts.length > 0 && (
            <div>
              {tab === "all" && <h2 className="text-sm font-semibold text-muted-foreground mb-2">Posts</h2>}
              <div className="border border-border divide-y divide-border bg-card rounded-lg overflow-hidden">
                {posts.map((post) => (
                  <ForumPostCard
                    key={post.id}
                    post={post}
                    onVote={() => {}}
                    onSave={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && posts.length === 0 && communities.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Inbox className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Keine Ergebnisse für "{query}".</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ForumSearchPage;
