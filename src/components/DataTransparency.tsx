import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileText as ArticleTwoTone, Ban as BlockTwoTone, Bookmark as BookmarkTwoTone, Trash2 as DeleteSweepTwoTone, MessagesSquare as ForumTwoTone, History as HistoryTwoTone, Vote as HowToVoteTwoTone, Info as InfoTwoTone, Bell as NotificationsTwoTone, User as PersonTwoTone, Shield as SecurityTwoTone, AlertTriangle as WarningAmberTwoTone, MessageSquare as ReviewsTwoTone, Database as StorageTwoTone } from "lucide-react";

interface DataSummary {
  profile: { display_name: string | null; username: string | null; bio: string | null; avatar_url: string | null; created_at: string } | null;
  reviewCount: number;
  saveCount: number;
  commentCount: number;
  forumPostCount: number;
  forumCommentCount: number;
  articleCount: number;
  pollVoteCount: number;
  usernameHistoryCount: number;
  warningCount: number;
  newsletterSubscribed: boolean;
  watchlistCount: number;
  releaseSubCount: number;
}

interface Props {
  userId: string;
}

/** Why we store each category – keys for i18n */
const DATA_REASON_KEYS: Record<string, string> = {
  profile: "transparency.reason.profile",
  reviews: "transparency.reason.reviews",
  saves: "transparency.reason.saves",
  forum: "transparency.reason.forum",
  articles: "transparency.reason.articles",
  polls: "transparency.reason.polls",
  usernameHistory: "transparency.reason.usernameHistory",
  subscriptions: "transparency.reason.subscriptions",
};

/** Which categories can be opted out (with data deletion) */
const OPTOUT_CATEGORIES = ["reviews", "saves", "forum", "polls", "subscriptions"] as const;
type OptOutKey = (typeof OPTOUT_CATEGORIES)[number];

const DataTransparency = ({ userId }: Props) => {
  const { t } = useTranslation();
  const [data, setData] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [fullOptOutOpen, setFullOptOutOpen] = useState(false);
  const [fullOptOutLoading, setFullOptOutLoading] = useState(false);
  const [fullOptOutActive, setFullOptOutActive] = useState(() => localStorage.getItem(`cc_full_optout_${userId}`) === "true");

  const loadData = async () => {
    setLoading(true);
    const [
      profileRes, reviewRes, saveRes, commentRes,
      forumPostRes, forumCommentRes, articleRes,
      pollVoteRes, historyRes, warningRes,
      newsletterRes, watchlistRes, releaseSubRes,
    ] = await Promise.all([
      supabase.from("profiles").select("display_name, username, bio, avatar_url, created_at").eq("user_id", userId).maybeSingle(),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("user_saves").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("forum_comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("poll_votes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("username_history").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("user_warnings").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("newsletter_subscribers").select("subscribed").eq("user_id", userId).maybeSingle(),
      supabase.from("user_watchlist").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("release_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    setData({
      profile: profileRes.data,
      reviewCount: reviewRes.count ?? 0,
      saveCount: saveRes.count ?? 0,
      commentCount: commentRes.count ?? 0,
      forumPostCount: forumPostRes.count ?? 0,
      forumCommentCount: forumCommentRes.count ?? 0,
      articleCount: articleRes.count ?? 0,
      pollVoteCount: pollVoteRes.count ?? 0,
      usernameHistoryCount: historyRes.count ?? 0,
      warningCount: warningRes.count ?? 0,
      newsletterSubscribed: newsletterRes.data?.subscribed ?? false,
      watchlistCount: watchlistRes.count ?? 0,
      releaseSubCount: releaseSubRes.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [userId]);

  const handleOptOut = async (key: OptOutKey) => {
    setDeleting(key);
    try {
      switch (key) {
        case "reviews":
          await supabase.from("reviews").delete().eq("user_id", userId);
          break;
        case "saves":
          await Promise.all([
            supabase.from("user_saves").delete().eq("user_id", userId),
            supabase.from("user_watchlist").delete().eq("user_id", userId),
          ]);
          break;
        case "forum":
          await Promise.all([
            supabase.from("forum_comments").delete().eq("user_id", userId),
            supabase.from("forum_posts").delete().eq("user_id", userId),
          ]);
          break;
        case "polls":
          await supabase.from("poll_votes").delete().eq("user_id", userId);
          break;
        case "subscriptions":
          await Promise.all([
            supabase.from("newsletter_subscribers").delete().eq("user_id", userId),
            supabase.from("release_subscriptions").delete().eq("user_id", userId),
          ]);
          break;
      }
      toast.success(t("transparency.optOutSuccess", "Daten wurden gelöscht"));
      await loadData();
    } catch {
      toast.error(t("transparency.optOutError", "Fehler beim Löschen"));
    } finally {
      setDeleting(null);
    }
  };

  const handleFullOptOut = async () => {
    setFullOptOutLoading(true);
    try {
      await Promise.all([
        supabase.from("reviews").delete().eq("user_id", userId),
        supabase.from("user_saves").delete().eq("user_id", userId),
        supabase.from("user_watchlist").delete().eq("user_id", userId),
        supabase.from("forum_comments").delete().eq("user_id", userId),
        supabase.from("forum_posts").delete().eq("user_id", userId),
        supabase.from("poll_votes").delete().eq("user_id", userId),
        supabase.from("newsletter_subscribers").delete().eq("user_id", userId),
        supabase.from("release_subscriptions").delete().eq("user_id", userId),
      ]);
      localStorage.setItem(`cc_full_optout_${userId}`, "true");
      setFullOptOutActive(true);
      toast.success(t("transparency.fullOptOutSuccess", "Alle optionalen Daten wurden gelöscht"));
      await loadData();
    } catch {
      toast.error(t("transparency.optOutError", "Fehler beim Löschen"));
    } finally {
      setFullOptOutLoading(false);
      setFullOptOutOpen(false);
    }
  };

  const handleReactivateCollection = () => {
    localStorage.removeItem(`cc_full_optout_${userId}`);
    setFullOptOutActive(false);
    toast.success(t("transparency.reactivated", "Datensammlung wurde reaktiviert"));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-24 bg-secondary rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const categories: {
    key: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    reason: string;
    count?: number;
    details?: { label: string; value: string }[];
    canOptOut: boolean;
  }[] = [
    {
      key: "profile",
      icon: <PersonTwoTone className="!text-[18px] text-primary" />,
      title: t("transparency.cat.profile.title", "Profildaten"),
      description: t("transparency.cat.profile.desc", "Name, Benutzername, Bio, Profilbild"),
      reason: t(DATA_REASON_KEYS.profile),
      canOptOut: false,
      details: [
        { label: t("transparency.cat.profile.displayName", "Anzeigename"), value: data.profile?.display_name || "–" },
        { label: t("transparency.cat.profile.username", "Benutzername"), value: data.profile?.username ? `@${data.profile.username}` : "–" },
        { label: t("transparency.cat.profile.bio", "Bio"), value: data.profile?.bio ? `✓ ${t("transparency.set", "Gesetzt")}` : "–" },
        { label: t("transparency.cat.profile.avatar", "Profilbild"), value: data.profile?.avatar_url ? `✓ ${t("transparency.uploaded", "Hochgeladen")}` : "–" },
      ],
    },
    {
      key: "reviews",
      icon: <ReviewsTwoTone className="!text-[18px] text-primary" />,
      title: t("transparency.cat.reviews.title", "Reviews"),
      description: t("transparency.cat.reviews.desc", "Deine abgegebenen Bewertungen"),
      reason: t(DATA_REASON_KEYS.reviews),
      count: data.reviewCount,
      canOptOut: true,
    },
    {
      key: "saves",
      icon: <BookmarkTwoTone className="!text-[18px] text-primary" />,
      title: t("transparency.cat.saves.title", "Gespeicherte Inhalte"),
      description: t("transparency.cat.saves.desc", "Gemerkte Filme, Serien & Spiele"),
      reason: t(DATA_REASON_KEYS.saves),
      count: data.saveCount + data.watchlistCount,
      canOptOut: true,
    },
    {
      key: "forum",
      icon: <ForumTwoTone className="!text-[18px] text-primary" />,
      title: t("transparency.cat.forum.title", "Forum-Aktivität"),
      description: t("transparency.cat.forum.desc", "Beiträge und Kommentare im Forum"),
      reason: t(DATA_REASON_KEYS.forum),
      count: data.forumPostCount + data.forumCommentCount,
      canOptOut: true,
      details: [
        { label: t("transparency.cat.forum.posts", "Beiträge"), value: String(data.forumPostCount) },
        { label: t("transparency.cat.forum.comments", "Kommentare"), value: String(data.forumCommentCount) },
      ],
    },
    {
      key: "articles",
      icon: <ArticleTwoTone className="!text-[18px] text-primary" />,
      title: t("transparency.cat.articles.title", "Artikel"),
      description: t("transparency.cat.articles.desc", "Veröffentlichte und Entwurfs-Artikel"),
      reason: t(DATA_REASON_KEYS.articles),
      count: data.articleCount,
      canOptOut: false,
    },
    {
      key: "polls",
      icon: <HowToVoteTwoTone className="!text-[18px] text-primary" />,
      title: t("transparency.cat.polls.title", "Umfrage-Stimmen"),
      description: t("transparency.cat.polls.desc", "Deine abgegebenen Stimmen in Umfragen"),
      reason: t(DATA_REASON_KEYS.polls),
      count: data.pollVoteCount,
      canOptOut: true,
    },
    {
      key: "usernameHistory",
      icon: <HistoryTwoTone className="!text-[18px] text-primary" />,
      title: t("transparency.cat.usernameHistory.title", "Benutzernamen-Verlauf"),
      description: t("transparency.cat.usernameHistory.desc", "Frühere Benutzernamen"),
      reason: t(DATA_REASON_KEYS.usernameHistory),
      count: data.usernameHistoryCount,
      canOptOut: false,
    },
    {
      key: "subscriptions",
      icon: <NotificationsTwoTone className="!text-[18px] text-primary" />,
      title: t("transparency.cat.subscriptions.title", "Abonnements"),
      description: t("transparency.cat.subscriptions.desc", "Newsletter & Release-Benachrichtigungen"),
      reason: t(DATA_REASON_KEYS.subscriptions),
      canOptOut: true,
      details: [
        { label: t("transparency.cat.subscriptions.newsletter", "Newsletter"), value: data.newsletterSubscribed ? `✓ ${t("transparency.subscribed", "Abonniert")}` : t("transparency.notSubscribed", "Nicht abonniert") },
        { label: t("transparency.cat.subscriptions.releaseAlerts", "Release-Alerts"), value: String(data.releaseSubCount) },
      ],
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle as="h1" className="flex items-center gap-2 text-base">
          <SecurityTwoTone className="!text-[20px] text-primary" />
          {t("transparency.title", "Deine Daten")}
        </CardTitle>
        <CardDescription>
          {t("transparency.desc", "Vollständige Übersicht aller Daten, die wir über dich speichern. Wir sammeln keine Tracking- oder Analysedaten.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* No tracking banner */}
        <div className="rounded-lg border border-border/50 bg-emerald-500/5 dark:bg-emerald-500/10 p-3 mb-4 flex items-start gap-2.5">
          <StorageTwoTone className="!text-[18px] text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-300">
              {t("transparency.noTracking", "Kein Tracking, keine Analyse")}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t("transparency.noTrackingDesc", "Wir verwenden keine Cookies, kein Google Analytics und keine Tracking-Pixel. Deine Daten werden ausschließlich für die Funktionalität der Plattform gespeichert.")}
            </p>
          </div>
        </div>

        {/* Full opt-out switch */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <BlockTwoTone className="!text-[18px] text-destructive mt-0.5 shrink-0" />
              <div>
                <p id="full-opt-out-label" className="text-sm font-medium text-red-400">
                  {t("transparency.fullOptOut", "Gesamte Datensammlung deaktivieren")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("transparency.fullOptOutDesc", "Löscht alle optionalen Daten (Reviews, gespeicherte Inhalte, Forum, Umfragen, Abonnements). Profil, Artikel und Benutzernamen-Verlauf bleiben erhalten.")}
                </p>
              </div>
            </div>
            <Switch
              aria-labelledby="full-opt-out-label"
              checked={fullOptOutActive}
              onCheckedChange={(checked) => {
                if (checked) {
                  setFullOptOutOpen(true);
                } else {
                  handleReactivateCollection();
                }
              }}
              disabled={fullOptOutLoading}
            />
          </div>

          {fullOptOutActive && (
            <p className="text-xs text-destructive/80 ml-7 mt-1">
              {t("transparency.fullOptOutActiveHint", "Datensammlung ist deaktiviert. Einzelne Kategorien können nicht bearbeitet werden, solange dieser Modus aktiv ist.")}
            </p>
          )}

          <AlertDialog open={fullOptOutOpen} onOpenChange={setFullOptOutOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("transparency.fullOptOutConfirmTitle", "Alle optionalen Daten löschen?")}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    {t("transparency.fullOptOutConfirmDesc", "Folgende Daten werden unwiderruflich gelöscht: Reviews, gespeicherte Inhalte, Watchlist, Forum-Beiträge & Kommentare, Umfrage-Stimmen, Newsletter und Release-Benachrichtigungen.")}
                  </span>
                  <span className="block font-medium text-amber-600 dark:text-amber-400">
                    {t("transparency.fullOptOutConfirmWarning", "Alle zugehörigen Funktionen stehen dir danach nicht mehr zur Verfügung, bis du neue Daten erstellst. Dieser Vorgang kann nicht rückgängig gemacht werden.")}
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={fullOptOutLoading}>
                  {t("transparency.cancel", "Abbrechen")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleFullOptOut}
                  disabled={fullOptOutLoading}
                >
                  {fullOptOutLoading
                    ? t("transparency.deleting", "Wird gelöscht...")
                    : t("transparency.confirmDeleteAll", "Alles löschen")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Accordion type="multiple" className={`space-y-1 ${fullOptOutActive ? "opacity-50 pointer-events-none" : ""}`}>
          {categories.map((cat) => {
            const hasData = (cat.count ?? 0) > 0 || (cat.details && cat.details.some(d => d.value !== "–" && d.value !== "0" && d.value !== "Nicht abonniert"));
            return (
              <AccordionItem key={cat.key} value={cat.key} className="border-border/50">
                <AccordionTrigger as="h2" className="hover:no-underline py-3 px-2">
                  <div className="flex items-center gap-3 text-left">
                    {cat.icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{cat.title}</span>
                        {cat.count !== undefined && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            {cat.count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3">
                  {/* Why we store this */}
                  <div className="ml-8 mb-3 flex items-start gap-2 p-2 rounded bg-secondary/40 border border-border/30">
                    <InfoTwoTone className="!text-[14px] text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("transparency.whyStore", "Warum speichern wir das?")}</span>{" "}
                      {cat.reason}
                    </p>
                  </div>

                  {/* Data details */}
                  {cat.details ? (
                    <div className="space-y-1.5 ml-8">
                      {cat.details.map((d, j) => (
                        <div key={j} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{d.label}</span>
                          <span className="font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-8">
                      {cat.count === 0
                        ? t("transparency.noData", "Keine Daten vorhanden")
                        : t("transparency.entriesStored", "{{count}} Einträge gespeichert", { count: cat.count })}
                    </p>
                  )}

                  {/* Opt-out button */}
                  {cat.canOptOut && hasData && (
                    <div className="ml-8 mt-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 text-xs"
                            disabled={deleting === cat.key}
                          >
                            <DeleteSweepTwoTone className="!text-[16px]" />
                            {t("transparency.optOut", "Daten löschen & Opt-Out")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("transparency.optOutConfirmTitle", cat.title + " - Daten wirklich loeschen?")}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <span className="block">
                                {t("transparency.optOutConfirmDesc", "Alle deine Daten in dieser Kategorie werden unwiderruflich geloescht.")}
                              </span>
                              <span className="block font-medium text-amber-600 dark:text-amber-400">
                                {t("transparency.optOutConfirmWarning", "Die zugehoerige Funktion steht dir danach nicht mehr zur Verfuegung, bis du neue Daten erstellst.")}
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("transparency.cancel", "Abbrechen")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleOptOut(cat.key as OptOutKey)}
                            >
                              {t("transparency.confirmDelete", "Endgültig löschen")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default DataTransparency;
