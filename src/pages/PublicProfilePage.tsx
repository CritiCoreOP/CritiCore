import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, FileText, Hourglass, ListVideo, Pencil, Share2, UserMinus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useLocalePath, useSearchParams } from "@/lib/locale-router";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import FollowButton from "@/components/FollowButton";
import BadgeShowcase from "@/components/BadgeShowcase";
import ProfileIdentity from "@/components/profile/ProfileIdentity";
import ReviewList, { type ProfileReview } from "@/components/profile/ReviewList";
import { ListCard } from "@/components/profile/ListCards";
import { EmptyBlock, ProfileTab, ProfileTabList, ScoreDistribution, StatGrid } from "@/components/profile/ProfileParts";
import { formatNumber, formatScore } from "@/components/profile/shared";
import { shareLink } from "@/lib/shareLink";
import { usePublicLists } from "@/hooks/useCustomLists";
import { useFriendshipStatus, useRemoveFriend, useRespondFriendRequest, useSendFriendRequest } from "@/hooks/useFriendships";
import { useAuth } from "@/hooks/useAuth";
import { articleCategoryLabel, articleTypeLabel, isOpinion } from "@/lib/article-labels";
import OpinionLabel from "@/components/OpinionLabel";
import { formatDate } from "@/lib/locale";
import { staffRoleLabels } from "@/lib/staffRoles";
import { averageScore, scoreBuckets } from "@/lib/profileStats";

interface PublicProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_official: boolean;
  created_at: string;
  post_karma?: number;
  comment_karma?: number;
  staff_roles?: string[];
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  article_type: string;
  category: string | null;
  created_at: string;
}

interface UsernameHistory {
  id: string;
  old_username: string;
  changed_at: string;
}

const TABS = ["reviews", "articles", "lists", "badges"] as const;
type PublicTab = (typeof TABS)[number];

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const localePath = useLocalePath();
  const [params, setParams] = useSearchParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [history, setHistory] = useState<UsernameHistory[]>([]);
  const [press, setPress] = useState<{ verified: boolean; logo: string | null }>({ verified: false, logo: null });
  const [loading, setLoading] = useState(true);
  const { data: publicLists = [] } = usePublicLists(userId);

  const tabParam = params.get("tab");
  const tab: PublicTab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as PublicTab) : "reviews";
  const setTab = (next: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === "reviews") p.delete("tab");
        else p.set("tab", next);
        return p;
      },
      { replace: true },
    );

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [profileRes, reviewsRes, articlesRes, historyRes, pressRes] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name, username, avatar_url, bio, is_official, created_at, post_karma, comment_karma, staff_roles").eq("user_id", userId).maybeSingle(),
          supabase
            .from("reviews")
            .select("id, media_id, media_type, score, title, content, created_at, is_critic_review, season_number, episode_number")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase.from("articles").select("id, title, slug, excerpt, article_type, category, created_at").eq("user_id", userId).eq("published", true).order("created_at", { ascending: false }),
          supabase.from("username_history").select("id, old_username, changed_at").eq("user_id", userId).order("changed_at", { ascending: false }),
          supabase.from("press_profiles").select("verified, press_logo").eq("user_id", userId).eq("verified", true).maybeSingle(),
        ]);
        if (!alive) return;
        setProfile((profileRes.data as unknown as PublicProfile) ?? null);
        setReviews((reviewsRes.data ?? []) as ProfileReview[]);
        setArticles(articlesRes.data ?? []);
        setHistory((historyRes.data ?? []) as UsernameHistory[]);
        const pressRow = pressRes.data as { press_logo: string | null } | null;
        setPress(pressRow ? { verified: true, logo: pressRow.press_logo || null } : { verified: false, logo: null });
      } catch (error) {
        console.error("Error loading public profile:", error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (profile) document.title = `${profile.display_name || profile.username || t("publicProfile.anonymous")} – CritiCore`;
  }, [profile, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pb-20 pt-24">
          <div className="container mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14" aria-hidden="true">
            <div className="flex items-center gap-4 lg:flex-col lg:items-start">
              <div className="h-20 w-20 animate-pulse rounded-full bg-muted/60 motion-reduce:animate-none sm:h-24 sm:w-24 lg:h-36 lg:w-36" />
              <div className="h-7 w-44 animate-pulse rounded bg-muted/60 motion-reduce:animate-none" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="h-28 animate-pulse rounded-[16px] bg-muted/40 motion-reduce:animate-none" />
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-[12px] bg-muted/40 motion-reduce:animate-none" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pb-20 pt-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="mb-2 text-2xl font-bold">{t("publicProfile.notFound")}</h1>
            <p className="text-muted-foreground">{t("publicProfile.notFoundDesc")}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || t("publicProfile.anonymous");
  const isSelf = user?.id === profile.user_id;
  const avg = averageScore(reviews);
  const showDistribution = reviews.length >= 3 && avg !== null;

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 pt-24">
        <div className="container mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
          <ProfileIdentity
            profile={profile}
            displayName={displayName}
            press={press}
            staffRoles={staffRoleLabels(profile.staff_roles, t)}
            pastUsernames={history}
            actions={
              <>
                {isSelf ? (
                  <Button asChild className="gap-2">
                    <Link to="/profil">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      {t("profile.editProfile")}
                    </Link>
                  </Button>
                ) : (
                  <>
                    <FollowButton targetId={profile.user_id} targetType="user" targetName={displayName} targetImage={profile.avatar_url} showCount />
                    <FriendRequestButton targetUserId={profile.user_id} />
                  </>
                )}
                <Button
                  variant="outline"
                  size={isSelf ? "icon" : "sm"}
                  className={isSelf ? undefined : "h-9 w-9 p-0"}
                  onClick={() => shareLink(`${window.location.origin}${localePath(`/user/${profile.user_id}`)}`, displayName, t("share.copied"))}
                  aria-label={t("profile.shareProfile")}
                  title={t("profile.shareProfile")}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            }
          />

          <div className="flex min-w-0 flex-col gap-10">
            <section aria-label={t("profile.overview")} className={showDistribution ? "grid gap-4 md:grid-cols-2" : undefined}>
              <StatGrid
                columns={showDistribution ? 2 : 4}
                stats={[
                  { label: t("profile.reviews"), value: formatNumber(reviews.length) },
                  { label: t("profile.average"), value: avg === null ? "–" : formatScore(avg) },
                  { label: t("publicProfile.articles"), value: formatNumber(articles.length) },
                  { label: t("lists.listsTab"), value: formatNumber(publicLists.length) },
                ]}
              />
              {showDistribution && <ScoreDistribution buckets={scoreBuckets(reviews)} average={avg} total={reviews.length} />}
            </section>

            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <ProfileTabList label={t("profile.contentLabel")}>
                <ProfileTab value="reviews" label={t("profile.reviews")} count={reviews.length} />
                <ProfileTab value="articles" label={t("publicProfile.articles")} count={articles.length} />
                <ProfileTab value="lists" label={t("lists.listsTab")} count={publicLists.length} />
                <ProfileTab value="badges" label={t("badges.tab")} />
              </ProfileTabList>

              <TabsContent value="reviews" className="mt-6">
                <ReviewList reviews={reviews} emptyText={t("publicProfile.noReviews")} />
              </TabsContent>

              <TabsContent value="articles" className="mt-6">
                {articles.length === 0 ? (
                  <EmptyBlock icon={<FileText className="h-8 w-8" />} title={t("publicProfile.noArticles")} />
                ) : (
                  <ul className="-mx-3 flex flex-col">
                    {articles.map((a) => (
                      <li key={a.id}>
                        <Link to={`/news/${a.slug}`} className="group block rounded-[12px] p-3 transition-colors hover:bg-muted/40">
                          <p className="font-semibold text-foreground transition-colors group-hover:text-primary">{a.title}</p>
                          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                            {isOpinion(a.article_type) ? <OpinionLabel type={a.article_type} /> : <span>{articleTypeLabel(t, a.article_type)}</span>}
                            {a.category && <span>{articleCategoryLabel(t, a.category)}</span>}
                            <time dateTime={a.created_at}>{formatDate(a.created_at)}</time>
                          </p>
                          {a.excerpt && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="lists" className="mt-6">
                {publicLists.length === 0 ? (
                  <EmptyBlock icon={<ListVideo className="h-8 w-8" />} title={t("profile.noPublicLists")} />
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {publicLists.map((list) => (
                      <ListCard key={list.id} list={list} />
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="badges" className="mt-6">
                <BadgeShowcase userId={profile.user_id} variant="full" />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

/** Add, answer or end a friendship; hidden for guests and on the own profile */
const FriendRequestButton = ({ targetUserId }: { targetUserId: string }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const friendship = useFriendshipStatus(targetUserId);
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();
  const removeFriend = useRemoveFriend();

  if (!user || user.id === targetUserId) return null;

  if (!friendship) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => sendRequest.mutate(targetUserId)} disabled={sendRequest.isPending}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        {t("social.addFriend")}
      </Button>
    );
  }

  if (friendship.status === "pending") {
    if (friendship.requester_id === user.id) {
      return (
        <Button variant="outline" size="sm" className="gap-1.5" disabled>
          <Hourglass className="h-4 w-4" aria-hidden="true" />
          {t("social.requestSent")}
        </Button>
      );
    }
    return (
      <Button size="sm" className="gap-1.5" onClick={() => respondRequest.mutate({ friendshipId: friendship.id, accept: true })}>
        <Check className="h-4 w-4" aria-hidden="true" />
        {t("social.acceptRequest")}
      </Button>
    );
  }

  if (friendship.status !== "accepted") return null;

  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => removeFriend.mutate(friendship.id)}>
      <UserMinus className="h-4 w-4" aria-hidden="true" />
      {t("social.removeFriendBtn")}
    </Button>
  );
};

export default PublicProfilePage;
