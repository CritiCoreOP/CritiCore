import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@/lib/locale-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { articleCategoryLabel } from "@/lib/article-labels";
import { ARTICLE_STATUSES, updateArticleStatus, type ArticleStatus } from "@/lib/articleStatus";
import { Plus as AddTwoTone, GripVertical as DragIndicatorTwoTone, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BoardArticle {
  id: string;
  title: string;
  category: string | null;
  article_type: string;
  status: ArticleStatus;
  user_id: string;
  updated_at: string;
  author?: string | null;
}

const STATUS_COLORS: Record<ArticleStatus, string> = {
  idea: "border-t-slate-400",
  research: "border-t-amber-400",
  writing: "border-t-blue-400",
  review: "border-t-primary",
  published: "border-t-green-400",
};

const EditorialBoardPage = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [articles, setArticles] = useState<BoardArticle[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ArticleStatus | null>(null);

  // Access check: admins + press
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const admin = !!roles?.some((r) => r.role === "admin");
      const press = !!roles?.some((r) => r.role === "press");
      setIsAdmin(admin);
      setAuthorized(admin || press);
    })();
  }, [user, loading, navigate]);

  const loadArticles = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from("articles")
      .select("id, title, category, article_type, status, user_id, updated_at")
      .order("updated_at", { ascending: false });
    if (!isAdmin) query = query.eq("user_id", user.id);

    const { data } = await query;
    if (!data) return;

    // 2-step author fetch
    const authorIds = [...new Set(data.map((a) => a.user_id))];
    let names: Record<string, string | null> = {};
    if (authorIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", authorIds);
      names = (profiles || []).reduce((acc: Record<string, string | null>, p) => {
        acc[p.user_id] = p.display_name;
        return acc;
      }, {});
    }
    setArticles(
      data.map((a) => ({
        ...(a as BoardArticle),
        status: (a.status as ArticleStatus) || "idea",
        author: names[a.user_id],
      })),
    );
  }, [user, isAdmin]);

  useEffect(() => {
    if (authorized) loadArticles();
  }, [authorized, loadArticles]);

  const onDrop = async (status: ArticleStatus, articleId?: string) => {
    setOverCol(null);
    const id = articleId || dragId;
    if (dragId) setDragId(null);
    if (!id) return;
    
    const current = articles.find((a) => a.id === id);
    if (!current || current.status === status) return;

    // optimistic update
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await updateArticleStatus(id, status);
      toast.success(t("workflow.statusUpdated"));
    } catch {
      toast.error(t("workflow.statusError"));
      loadArticles();
    }
  };

  if (loading || authorized === null) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-24 pb-12 container mx-auto px-4">
          <div className="animate-pulse h-64 bg-secondary rounded-lg" />
        </main>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="pt-24 pb-12 container mx-auto px-4 text-center flex-1">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">{t("article.noAccess")}</h1>
          <p className="text-muted-foreground mb-6">{t("article.noAccessDesc")}</p>
          <Button variant="outline" onClick={() => navigate("/profil")}>{t("article.applyPress")}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {t("workflow.boardTitle")}
              </h1>
              <p className="text-muted-foreground">{t("workflow.boardDesc")}</p>
            </div>
            <Button className="gap-1.5" onClick={() => navigate("/news/schreiben")}>
              <AddTwoTone className="w-4 h-4" />
              {t("workflow.newArticle")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 overflow-x-auto pb-4 snap-x">
            {ARTICLE_STATUSES.map((status) => {
              const items = articles.filter((a) => a.status === status);
              return (
                <section
                  key={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverCol(status);
                  }}
                  onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
                  onDrop={() => onDrop(status)}
                  className={`shrink-0 w-[280px] md:w-auto snap-center rounded-2xl bg-card/40 border border-border/40 p-3 min-h-[400px] transition-colors ${
                    overCol === status ? "bg-primary/10 border-primary/50" : ""
                  }`}
                  aria-labelledby={`col-title-${status}`}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h2 id={`col-title-${status}`} className="text-sm font-semibold text-foreground capitalize">
                      {t(`workflow.status.${status}`)}
                    </h2>
                    <Badge variant="secondary" className="text-[11px]">{items.length}</Badge>
                  </div>

                  <ul className="space-y-2 min-h-[300px]">
                    {items.map((a) => (
                      <li key={a.id}>
                        <div
                          draggable
                          onDragStart={() => setDragId(a.id)}
                          onDragEnd={() => setDragId(null)}
                          className={`group relative rounded-xl bg-background border border-border/50 ${STATUS_COLORS[status]} border-t-2 p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all focus-within:ring-2 focus-within:ring-primary/50 ${
                            dragId === a.id ? "opacity-40" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <DragIndicatorTwoTone className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <button
                                onClick={() => navigate(`/news/schreiben?edit=${a.id}`)}
                                className="text-sm font-medium text-foreground line-clamp-2 text-left hover:text-primary transition-colors focus:outline-none focus:underline"
                                aria-label={`Edit article: ${a.title || t("workflow.untitled")}`}
                              >
                                {a.title || t("workflow.untitled")}
                              </button>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {a.category && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{articleCategoryLabel(t, a.category)}</Badge>
                                )}
                                {isAdmin && a.author && (
                                  <span className="text-[10px] text-muted-foreground truncate">{a.author}</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Keyboard status changer */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                  aria-label={t("workflow.changeStatus")}
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {t("workflow.moveArticle")}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {ARTICLE_STATUSES.map((s) => (
                                  <DropdownMenuItem 
                                    key={s} 
                                    disabled={s === status}
                                    onClick={() => onDrop(s, a.id)}
                                    className="text-xs"
                                  >
                                    {t(`workflow.status.${s}`)}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </li>
                    ))}
                    {items.length === 0 && (
                      <li className="text-xs text-muted-foreground/60 text-center py-8 border border-dashed border-border/30 rounded-xl">
                        {t("workflow.emptyColumn")}
                      </li>
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EditorialBoardPage;
