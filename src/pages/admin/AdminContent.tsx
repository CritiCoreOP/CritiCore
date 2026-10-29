import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AuthorPicker, PersonAvatar } from "@/components/article-editor/AuthorPicker";
import { changeArticleAuthor, loadAuthors, type AuthorProfile } from "@/lib/articleAuthor";
import { CheckCircle2 as CheckCircleTwoTone, Trash as DeleteTwoTone, Search as SearchTwoTone, Star as StarTwoTone, EyeOff as VisibilityOffTwoTone, Eye as VisibilityTwoTone } from "lucide-react";

const AdminContent = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Record<string, AuthorProfile>>({});
  const [authorOpen, setAuthorOpen] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (data) {
      setArticles(data);
      setAuthors(await loadAuthors(data.map((a) => a.user_id)));
    }
    // Load press profiles to check trusted status for pending review detection
    const { data: pressData } = await supabase.from("press_profiles").select("user_id, trusted, verified");
    if (pressData) setPressProfiles(pressData);
  }, []);
  const [pressProfiles, setPressProfiles] = useState<any[]>([]);
  useEffect(() => { loadData(); }, [loadData]);

  const logMod = async (targetId: string, action: string) => { await supabase.from("moderation_logs").insert({ admin_id: user!.id, target_type: "article", target_id: targetId, action }); };

  const togglePublish = async (article: any) => { setActionLoading(article.id); const np = !article.published; await supabase.from("articles").update({ published: np }).eq("id", article.id); await logMod(article.id, np ? "publish_article" : "hide_article"); toast.success(np ? t("admin.content.articlePublished") : t("admin.content.articleHidden")); await loadData(); setActionLoading(null); };
  const approveArticle = async (article: any) => { setActionLoading(article.id); await supabase.from("articles").update({ published: true }).eq("id", article.id); await logMod(article.id, "approve_article"); toast.success(t("admin.content.articleApproved")); await loadData(); setActionLoading(null); };
  const toggleFeatured = async (article: any) => { setActionLoading(article.id); await supabase.from("articles").update({ featured: !article.featured }).eq("id", article.id); await logMod(article.id, article.featured ? "unfeature_article" : "feature_article"); toast.success(article.featured ? t("admin.content.articleUnfeatured") : t("admin.content.articleFeatured")); await loadData(); setActionLoading(null); };
  const changeAuthor = async (article: { id: string; user_id: string }, to: string, name: string) => {
    setActionLoading(article.id);
    try {
      await changeArticleAuthor(article.id, article.user_id, to, user!.id);
      toast.success(t("article.author.changed", { name }));
      setAuthorOpen(null);
      await loadData();
    } catch {
      toast.error(t("article.author.error"));
    }
    setActionLoading(null);
  };
  const deleteArticle = async (article: any) => { if (!confirm(t("admin.content.confirmDelete"))) return; setActionLoading(article.id); await supabase.from("articles").delete().eq("id", article.id); await logMod(article.id, "delete_article"); toast.success(t("admin.content.articleDeleted")); await loadData(); setActionLoading(null); };

  // Check if article is "pending review" - draft by a non-trusted, non-admin press user
  const isPendingReview = (a: any) => {
    if (a.published) return false;
    const pp = pressProfiles.find((p: any) => p.user_id === a.user_id);
    // If no press profile or trusted, it's a regular draft not pending review
    if (!pp || pp.trusted) return false;
    // Count how many published articles this user has
    const publishedCount = articles.filter((art: any) => art.user_id === a.user_id && art.published).length;
    return publishedCount < 2;
  };

  const filtered = articles.filter((a) => { if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false; if (statusFilter === "published" && !a.published) return false; if (statusFilter === "draft" && a.published) return false; if (statusFilter === "featured" && !a.featured) return false; if (statusFilter === "pendingReview" && !isPendingReview(a)) return false; return true; });

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">{t("admin.content.title")}</h1><p className="text-muted-foreground text-sm">{t("admin.content.totalArticles", { count: articles.length })}</p></div>
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1"><SearchTwoTone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.content.searchPlaceholder")} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">{t("admin.content.allFilter")}</SelectItem><SelectItem value="published">{t("admin.content.publishedFilter")}</SelectItem><SelectItem value="draft">{t("admin.content.draftsFilter")}</SelectItem><SelectItem value="featured">{t("admin.content.featuredFilter")}</SelectItem><SelectItem value="pendingReview">{t("admin.content.pendingReviewFilter")}</SelectItem>
        </SelectContent></Select>
      </div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>{t("admin.content.titleCol")}</TableHead><TableHead>{t("article.author.label")}</TableHead><TableHead>{t("admin.content.type")}</TableHead><TableHead>{t("admin.content.status")}</TableHead><TableHead>{t("admin.content.date")}</TableHead><TableHead className="text-right">{t("admin.content.actions")}</TableHead>
      </TableRow></TableHeader><TableBody>
        {filtered.map((article) => (
          <TableRow key={article.id}>
            <TableCell className="font-medium text-sm max-w-xs truncate">{article.title}</TableCell>
            <TableCell>
              <Popover open={authorOpen === article.id} onOpenChange={(o) => setAuthorOpen(o ? article.id : null)}>
                <PopoverTrigger asChild>
                  <button type="button" className="flex max-w-[12rem] items-center gap-2 rounded-[8px] px-1.5 py-1 text-left text-sm hover:bg-muted/60" title={t("article.author.change")} aria-label={`${t("article.author.change")}: ${authors[article.user_id]?.name ?? ""}`}>
                    <PersonAvatar userId={article.user_id} name={authors[article.user_id]?.name ?? "?"} src={authors[article.user_id]?.avatar_url ?? null} className="h-6 w-6" />
                    <span className="truncate">{authors[article.user_id]?.name ?? "?"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-3">
                  <p className="mb-2 text-sm font-semibold">{t("article.author.change")}</p>
                  <AuthorPicker value={article.user_id} disabled={actionLoading === article.id} onPick={(m) => changeAuthor(article, m.user_id, m.name)} />
                </PopoverContent>
              </Popover>
            </TableCell>
            <TableCell><Badge variant="secondary" className="capitalize text-xs">{article.article_type}</Badge></TableCell>
            <TableCell><div className="flex gap-1">{article.published ? <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">{t("admin.content.live")}</Badge> : <Badge variant="outline" className="text-xs">{t("admin.content.draft")}</Badge>}{article.featured && <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-xs">{t("admin.content.featured")}</Badge>}{isPendingReview(article) && <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30 text-xs">{t("admin.content.pendingReviewFilter")}</Badge>}</div></TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(article.created_at)}</TableCell>
            <TableCell><div className="flex items-center gap-1 justify-end">
               <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePublish(article)} disabled={actionLoading === article.id} title={article.published ? t("admin.content.articleHidden") : t("admin.content.articlePublished")}>{article.published ? <VisibilityOffTwoTone className="w-4 h-4" /> : <VisibilityTwoTone className="w-4 h-4" />}</Button>
               {isPendingReview(article) && <Button size="sm" variant="default" className="h-8 gap-1" onClick={() => approveArticle(article)} disabled={actionLoading === article.id}><CheckCircleTwoTone className="w-4 h-4" />{t("admin.content.approvePublish")}</Button>}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleFeatured(article)} disabled={actionLoading === article.id}><StarTwoTone className={`w-4 h-4 ${article.featured ? "fill-yellow-400 text-yellow-400" : ""}`} /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteArticle(article)} disabled={actionLoading === article.id}>{actionLoading === article.id ? <M3LoadingIndicator size={16} /> : <DeleteTwoTone className="w-4 h-4" />}</Button>
            </div></TableCell>
          </TableRow>
        ))}
        {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.content.noContent")}</TableCell></TableRow>}
      </TableBody></Table></CardContent></Card>
    </div>
  );
};

export default AdminContent;
