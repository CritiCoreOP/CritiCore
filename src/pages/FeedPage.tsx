import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useActivityFeed, type ActivityItem } from "@/hooks/useActivityFeed";
import { useFriendships, usePendingRequests, useRespondFriendRequest, useFriends } from "@/hooks/useFriendships";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@/lib/locale-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/locale";
import { motion, MotionConfig } from "framer-motion";
import { FileText as ArticleTwoTone, XCircle as CancelTwoTone, CheckCircle2 as CheckCircleTwoTone, Trophy as EmojiEventsTwoTone, MessagesSquare as ForumTwoTone, Users as PeopleAltTwoTone, UserPlus as PersonAddTwoTone, ListVideo as PlaylistPlayTwoTone, Rss as RssFeedTwoTone, Gamepad2 as SportsEsportsTwoTone, Star as StarTwoTone, Eye as VisibilityTwoTone } from "lucide-react";

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  review: <StarTwoTone className="!text-[20px] text-primary" />,
  watched: <VisibilityTwoTone className="!text-[20px] text-primary" />,
  played: <SportsEsportsTwoTone className="!text-[20px] text-primary" />,
  list: <PlaylistPlayTwoTone className="!text-[20px] text-primary" />,
  badge: <EmojiEventsTwoTone className="!text-[20px] text-primary" />,
  post: <ForumTwoTone className="!text-[20px] text-primary" />,
  article: <ArticleTwoTone className="!text-[20px] text-primary" />,
};

interface ProfileInfo {
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

const FeedPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: activities = [], isLoading: feedLoading } = useActivityFeed();
  const pendingRequests = usePendingRequests();
  const respondRequest = useRespondFriendRequest();
  const friendIds = useFriends();

  // Resolve profiles for activity users
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const userIds = [...new Set(activities.map(a => a.user_id))];
  useEffect(() => {
    if (userIds.length === 0) return;
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", userIds);
      if (data) {
        const map: Record<string, ProfileInfo> = {};
        data.forEach(p => { map[p.user_id] = p; });
        setProfiles(map);
      }
    };
    fetchProfiles();
  }, [activities.length]);

  // Resolve pending request profiles
  const [requestProfiles, setRequestProfiles] = useState<Record<string, ProfileInfo>>({});
  useEffect(() => {
    const ids = pendingRequests.map(r => r.requester_id);
    if (ids.length === 0) return;
    supabase.from("profiles").select("user_id, display_name, avatar_url, username").in("user_id", ids)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, ProfileInfo> = {};
          data.forEach(p => { map[p.user_id] = p; });
          setRequestProfiles(map);
        }
      });
  }, [pendingRequests.length]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-xl mx-auto flex min-h-[70dvh] flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-accent-light">
            <RssFeedTwoTone className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">{t("social.feedTitle", "Activity Feed")}</h1>
          <p className="text-muted-foreground mb-8 max-w-[45ch]">{t("social.loginRequired", "Melde dich an, um den Activity Feed zu sehen.")}</p>
          <Button asChild size="lg"><Link to="/auth">{t("nav.login")}</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <main className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-6">
          <RssFeedTwoTone className="!text-[32px] text-primary" />
          <h1 className="text-2xl font-bold">{t("social.feedTitle", "Activity Feed")}</h1>
        </div>

        <Tabs defaultValue="feed">
          <TabsList className="mb-6 bg-secondary/40 rounded-xl p-1 border border-border/50 overflow-x-auto flex-nowrap scrollbar-none justify-start">
            <TabsTrigger value="feed" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <RssFeedTwoTone className="!text-[16px] mr-1.5" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <PersonAddTwoTone className="!text-[16px] mr-1.5" />
              {t("social.requests", "Anfragen")}
              {pendingRequests.length > 0 && (
                <Badge className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-3">
            {feedLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}><CardContent className="py-4"><Skeleton className="h-16 w-full rounded-xl" /></CardContent></Card>
              ))
            ) : activities.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-14 text-center">
                  <PeopleAltTwoTone className="!text-[40px] text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {friendIds.length === 0
                      ? t("social.noFriends", "Füge Freunde hinzu, um ihren Activity Feed zu sehen!")
                      : t("social.noActivity", "Noch keine Aktivitäten von deinen Freunden.")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              activities.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <ActivityCard item={item} profile={profiles[item.user_id]} isOwn={item.user_id === user.id} />
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-3">
            {pendingRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-14 text-center">
                  <PersonAddTwoTone className="!text-[40px] text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("social.noPending", "Keine offenen Anfragen.")}</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map(req => {
                const p = requestProfiles[req.requester_id];
                return (
                  <Card key={req.id} className="hover:border-primary/30 transition-all">
                    <CardContent className="flex flex-wrap items-center gap-3 py-4 sm:flex-nowrap sm:gap-4">
                      <Link to={`/user/${req.requester_id}`}>
                        <Avatar className="h-10 w-10">
                          {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                          <AvatarFallback>{(p?.display_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/user/${req.requester_id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {p?.display_name || p?.username || t("social.unknownUser", "Unbekannt")}
                        </Link>
                        <p className="text-xs text-muted-foreground">{formatDate(req.created_at)}</p>
                      </div>
                      <div className="flex w-full gap-2 sm:w-auto">
                        <Button size="sm" className="flex-1 sm:flex-none" onClick={() => respondRequest.mutate({ friendshipId: req.id, accept: true })}>
                          <CheckCircleTwoTone className="!text-[16px] mr-1" />
                          {t("social.accept", "Annehmen")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => respondRequest.mutate({ friendshipId: req.id, accept: false })}>
                          <CancelTwoTone className="!text-[16px]" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </main>
    </MotionConfig>
  );
};

const ActivityCard = ({ item, profile, isOwn }: { item: ActivityItem; profile?: ProfileInfo; isOwn: boolean }) => {
  const { t } = useTranslation();
  const icon = ACTIVITY_ICONS[item.activity_type] || <RssFeedTwoTone className="!text-[20px] text-muted-foreground" />;

  return (
    <Card className="hover:border-primary/30 transition-all duration-200">
      <CardContent className="py-4 flex items-start gap-4">
        <Link to={`/user/${item.user_id}`} className="shrink-0">
          <Avatar className="h-10 w-10">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback>{(profile?.display_name || "?")[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <Link to={`/user/${item.user_id}`} className="font-medium text-foreground hover:text-primary transition-colors text-sm">
              {isOwn ? t("social.you", "Du") : (profile?.display_name || profile?.username || t("social.unknownUser", "Unbekannt"))}
            </Link>
            <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
          </div>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          {item.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>}
          {item.target_url && (
            <Link to={item.target_url} className="text-xs text-primary hover:underline mt-1 inline-block">
              {t("social.viewDetail", "Details ansehen →")}
            </Link>
          )}
        </div>
        {item.media_poster && (
          <Link to={item.target_url || "#"} className="shrink-0">
            <img src={item.media_poster} alt="" className="w-12 h-[72px] rounded-lg object-cover" loading="lazy" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedPage;
