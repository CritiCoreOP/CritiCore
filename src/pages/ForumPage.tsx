import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Link, useNavigate } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useForumVote } from "@/hooks/useForumVote";
import ForumPostCard from "@/components/forum/ForumPostCard";
import { getCategoryByKey, FORUM_CATEGORIES } from "@/components/forum/forumCategories";
import { Clock, TrendingUp, Flame, Sparkles, Inbox, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setSeo } from "@/lib/seo";

type SortMode = "hot" | "new" | "top" | "rising";

const SORT_TABS: { key: SortMode; label: string; icon: any }[] = [
  { key: "new", label: "Neu", icon: Clock },
  { key: "top", label: "Top", icon: TrendingUp },
  { key: "hot", label: "Hot", icon: Flame },
  { key: "rising", label: "Steigend", icon: Sparkles },
];

const PAGE_SIZE = 20;
const LOAD_MORE_SIZE = 10;

const ForumPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vote } = useForumVote();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = (searchParams.get("sort") as SortMode) || "hot";
  const category = searchParams.get("category") || null;
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeo({
      title: "Forum — CritiCore",
      description: "Diskutiere über Filme, Serien und Games in den CritiCore Forums. Tritt Communities bei und teile deine Meinung.",
      url: "/forum",
    });
  }, []);

  const buildQuery = useCallback((from: number, to: number) => {
    let query = supabase.from("forum_posts").select("*");
    if (category) query = query.eq("category", category);
    switch (sort) {
      case "new": query = query.order("pinned", { ascending: false }).order("created_at", { ascending: false }); break;
      case "top": query = query.order("pinned", { ascending: false }).order("upvotes", { ascending: false }); break;
      case "rising": query = query.order("pinned", { ascending: false }).order("created_at", { ascending: false }).order("upvotes", { ascending: false }); break;
      default: query = query.order("pinned", { ascending: false }).order("upvotes", { ascending: false }).order("created_at", { ascending: false }); break;
    }
    return query.range(from, to);
  }, [sort, category]);

  const enrichPosts = useCallback(async (postsData: any[]) => {
    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name, avatar_url, is_official").in("user_id", userIds)
      : { data: [] };
    const communityIds = [...new Set(postsData.filter(p => p.community_id).map(p => p.community_id))];
    const { data: postComms } = communityIds.length > 0
      ? await supabase.from("forum_communities").select("id, slug, name, icon, status_icon_url, status_emoji").in("id", communityIds)
      : { data: [] };
    const flairIds = [...new Set(postsData.filter(p => p.flair_id).map(p => p.flair_id))];
    const { data: flairs } = flairIds.length > 0
      ? await supabase.from("forum_flairs").select("id, name, color, bg_color, emoji, icon_url").in("id", flairIds)
      : { data: [] };
    let votes: any[] = [];
    if (user) {
      const postIds = postsData.map((p) => p.id);
      if (postIds.length > 0) {
        const { data: v } = await supabase.from("forum_votes").select("target_id, vote_type").eq("user_id", user.id).eq("target_type", "post").in("target_id", postIds);
        votes = v || [];
      }
    }
    return postsData.map((p) => ({
      ...p,
      profile: profiles?.find((pr) => pr.user_id === p.user_id),
      community: postComms?.find((c) => c.id === p.community_id),
      flair: flairs?.find((f: any) => f.id === p.flair_id) || null,
      userVote: votes.find((v) => v.target_id === p.id)?.vote_type || null,
    }));
  }, [user]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    const { data: postsData } = await buildQuery(0, PAGE_SIZE - 1);
    if (!postsData) { setLoading(false); setPosts([]); return; }
    setHasMore(postsData.length >= PAGE_SIZE);
    const enriched = await enrichPosts(postsData);
    setPosts(enriched);
    setLoading(false);
  }, [buildQuery, enrichPosts]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  useEffect(() => {
    if (!observerRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loadingMore || !hasMore) return;
        setLoadingMore(true);
        const from = posts.length;
        const to = from + LOAD_MORE_SIZE - 1;
        const { data: newData } = await buildQuery(from, to);
        if (!newData || newData.length === 0) { setHasMore(false); setLoadingMore(false); return; }
        const existingIds = new Set(posts.map(p => p.id));
        const uniqueNew = newData.filter(p => !existingIds.has(p.id));
        if (uniqueNew.length === 0) { setHasMore(false); setLoadingMore(false); return; }
        setHasMore(newData.length >= LOAD_MORE_SIZE);
        const enriched = await enrichPosts(uniqueNew);
        setPosts((prev) => [...prev, ...enriched]);
        setLoadingMore(false);
      },
      { rootMargin: "200px" }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, posts.length, buildQuery, enrichPosts]);

  const handleVote = async (post: any, voteType: "up" | "down") => {
    const result = await vote(post.id, "post", voteType);
    if (result) {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== post.id) return p;
          let upvotes = p.upvotes;
          let downvotes = p.downvotes;
          if (p.userVote === "up") upvotes = Math.max(0, upvotes - 1);
          if (p.userVote === "down") downvotes = Math.max(0, downvotes - 1);
          if (result.vote_type === "up") upvotes += 1;
          if (result.vote_type === "down") downvotes += 1;
          return { ...p, upvotes, downvotes, userVote: result.vote_type };
        })
      );
    }
  };

  const handleSave = async (post: any) => {
    if (!user) { toast.error("Bitte anmelden."); return; }
    await supabase.from("user_saves").upsert({ user_id: user.id, target_type: "forum_post", target_id: post.id });
    toast.success("Gespeichert!");
  };

  const handleShare = (post: any) => {
    const url = `${window.location.origin}/forum/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link kopiert!");
    }
  };

  const setSort = (s: SortMode) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", s);
    setSearchParams(params);
  };

  const activeCat = category ? getCategoryByKey(category) : null;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-5">
      {/* Active category chip */}
      {activeCat && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[hsl(var(--mcc-surface-container))] border border-border/30 rounded-[var(--mcc-shape-md)] text-sm">
          <activeCat.icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground">{activeCat.label}</span>
          <button
            onClick={() => { const p = new URLSearchParams(searchParams); p.delete("category"); setSearchParams(p); }}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sort tabs — pill style */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-[hsl(var(--mcc-surface-container))] rounded-[var(--mcc-shape-full)] w-fit">
        {SORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = sort === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium rounded-[var(--mcc-shape-full)] transition-all duration-[var(--mcc-t-mid)] whitespace-nowrap",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--mcc-surface-container-high))]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-px">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[hsl(var(--mcc-surface-container))] animate-pulse rounded-[var(--mcc-shape-sm)]" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">Noch keine Posts{activeCat ? ` in ${activeCat.label}` : ""}.</p>
          <p className="text-xs mt-1.5 text-muted-foreground/60">Tritt einer Community bei und starte die Diskussion.</p>
        </div>
      ) : (
        <div className="border border-border/30 divide-y divide-border/30 bg-[hsl(var(--mcc-surface-container-lowest))] rounded-[var(--mcc-shape-md)] overflow-hidden shadow-sm">
          {posts.map((post) => (
            <ForumPostCard key={post.id} post={post} onVote={handleVote} onSave={handleSave} onShare={handleShare} />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && !loading && (
        <div ref={observerRef} className="py-4">
          {loadingMore && (
            <div className="space-y-px">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-[hsl(var(--mcc-surface-container))] animate-pulse rounded-[var(--mcc-shape-sm)]" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ForumPage;
