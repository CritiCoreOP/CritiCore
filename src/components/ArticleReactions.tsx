import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Heart as FavoriteBorderTwoTone, Heart as FavoriteTwoTone } from "lucide-react";

interface ArticleReactionsProps {
  articleId: string;
}

const REACTIONS = [
  { type: "like", icon: "❤️", activeIcon: "❤️" },
  { type: "insightful", icon: "💡", activeIcon: "💡" },
  { type: "funny", icon: "😄", activeIcon: "😄" },
];

const ArticleReactions = ({ articleId }: ArticleReactionsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());

  useEffect(() => { loadReactions(); }, [articleId, user]);

  const loadReactions = async () => {
    const { data } = await supabase
      .from("article_reactions")
      .select("reaction_type, user_id")
      .eq("article_id", articleId);

    if (data) {
      const newCounts: Record<string, number> = {};
      const myReactions = new Set<string>();
      for (const r of data) {
        newCounts[r.reaction_type] = (newCounts[r.reaction_type] || 0) + 1;
        if (user && r.user_id === user.id) myReactions.add(r.reaction_type);
      }
      setCounts(newCounts);
      setUserReactions(myReactions);
    }
  };

  const toggleReaction = async (type: string) => {
    if (!user) return;
    const had = userReactions.has(type);

    // Optimistic update
    setUserReactions(prev => {
      const next = new Set(prev);
      if (had) next.delete(type); else next.add(type);
      return next;
    });
    setCounts(prev => ({ ...prev, [type]: (prev[type] || 0) + (had ? -1 : 1) }));

    if (had) {
      await supabase.from("article_reactions").delete()
        .eq("article_id", articleId).eq("user_id", user.id).eq("reaction_type", type);
    } else {
      await supabase.from("article_reactions").insert({
        article_id: articleId, user_id: user.id, reaction_type: type,
      });
    }
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {REACTIONS.map(r => {
        const active = userReactions.has(r.type);
        const count = counts[r.type] || 0;
        return (
          <button
            key={r.type}
            onClick={() => toggleReaction(r.type)}
            disabled={!user}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200 border",
              active
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card/50 border-border/50 text-muted-foreground hover:border-primary/20 hover:text-foreground",
              !user && "opacity-60 cursor-default"
            )}
          >
            <span className="text-base">{r.icon}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ArticleReactions;
