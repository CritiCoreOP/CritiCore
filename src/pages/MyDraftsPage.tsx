import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { Calendar as CalendarTodayTwoTone, Trash as DeleteTwoTone, Pencil as EditTwoTone, Pencil as CreateTwoTone } from "lucide-react";

const categoryKeys: Record<string, string> = {
  games: "news.games",
  movies: "news.movies",
  series: "news.series",
  general: "news.general",
};

const typeKeys: Record<string, string> = {
  news: "news.typeNews",
  review: "news.typeReview",
  opinion: "news.typeOpinion",
};

const MyDraftsPage = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Tables<"articles">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) loadDrafts();
  }, [user]);

  const loadDrafts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("user_id", user!.id)
      .eq("published", false)
      .order("updated_at", { ascending: false });
    setDrafts(data || []);
    setLoading(false);
  };

  const deleteDraft = async (id: string) => {
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    toast.success(t("drafts.deleted", "Entwurf gelöscht"));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-24 pb-12 container mx-auto px-4">
          <div className="animate-pulse h-64 bg-secondary rounded-lg" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-display text-3xl font-bold text-foreground">
              {t("drafts.title", "Meine Entwürfe")}
            </h1>
            <Button asChild size="sm" className="gap-2">
              <Link to="/news/schreiben">
                <CreateTwoTone className="w-4 h-4" />
                {t("drafts.newArticle", "Neuer Artikel")}
              </Link>
            </Button>
          </div>
          <p className="text-muted-foreground mb-8">
            {t("drafts.subtitle", "Hier findest du alle deine unveröffentlichten Artikel.")}
          </p>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-secondary rounded-lg animate-pulse" />
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 md:p-12 text-center">
              <p className="text-muted-foreground text-lg">
                {t("drafts.noDrafts", "Du hast noch keine Entwürfe.")}
              </p>
              <Button asChild variant="outline" className="gap-2 mt-4">
                <Link to="/news/schreiben">
                  <CreateTwoTone className="w-4 h-4" />
                  {t("drafts.startWriting", "Artikel schreiben")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <Card key={draft.id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-1.5">
                          {draft.category && (
                            <Badge variant="secondary" className="text-xs">
                              {t(categoryKeys[draft.category] || "news.general")}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {t(typeKeys[draft.article_type] || "news.typeNews")}
                          </Badge>
                        </div>
                        <CardTitle className="text-base truncate">
                          {draft.title || t("drafts.untitled", "Ohne Titel")}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label={t("common.edit")} title={t("common.edit")}>
                          <Link to={`/news/schreiben?edit=${draft.id}`}>
                            <EditTwoTone className="w-4 h-4" />
                          </Link>
                        </Button>
                        {/* One click used to delete the draft for good, right next to the edit button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive"
                              aria-label={t("common.delete")}
                              title={t("common.delete")}
                            >
                              <DeleteTwoTone className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("drafts.deleteConfirmTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("drafts.deleteConfirmText", { title: draft.title || t("drafts.untitled") })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDraft(draft.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarTodayTwoTone className="w-3 h-3" />
                        {formatDate(draft.updated_at)}
                      </span>
                      {draft.excerpt && (
                        <span className="truncate">{draft.excerpt}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyDraftsPage;
