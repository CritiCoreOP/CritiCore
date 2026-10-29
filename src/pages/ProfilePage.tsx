import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Eye, Pencil, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocalePath, useNavigate, useSearchParams } from "@/lib/locale-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, AVATAR_IMAGE } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import PressApplicationDialog from "@/components/PressApplicationDialog";
import ProfileIdentity from "@/components/profile/ProfileIdentity";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { OWN_TABS, formatNumber, formatScore, type OwnTab, type SavedEntry } from "@/components/profile/shared";
import EditProfileSheet, { type ProfileDraft } from "@/components/profile/EditProfileSheet";
import { ScoreDistribution, StatGrid } from "@/components/profile/ProfileParts";
import { shareLink } from "@/lib/shareLink";
import { isMediaKind } from "@/components/profile/media";
import type { ProfileReview } from "@/components/profile/ReviewList";
import { useAllMediaStatus } from "@/hooks/useMediaStatus";
import { useMyLists } from "@/hooks/useCustomLists";
import { useFriendships } from "@/hooks/useFriendships";
import { PROFILE_COLUMNS } from "@/lib/profileColumns";
import { PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { averageScore, checkAvatarFile, daysUntilChange, scoreBuckets } from "@/lib/profileStats";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_official: boolean;
  created_at: string;
  username_changed_at: string | null;
  display_name_changed_at: string | null;
  post_karma: number | null;
  comment_karma: number | null;
}

interface UsernameHistory {
  id: string;
  old_username: string;
  changed_at: string;
}

type PressStatus = "none" | "pending" | "verified";

/** Skeleton in the page's own shape: identity column left, figures and rows right */
function ProfileSkeleton() {
  const bar = "animate-pulse rounded bg-muted/60 motion-reduce:animate-none";
  return (
    <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14" aria-hidden="true">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start">
          <div className="h-20 w-20 animate-pulse rounded-full bg-muted/60 motion-reduce:animate-none sm:h-24 sm:w-24 lg:h-36 lg:w-36" />
          <div className="flex flex-col gap-2">
            <div className={`${bar} h-7 w-44`} />
            <div className={`${bar} h-4 w-24`} />
          </div>
        </div>
        <div className={`${bar} h-4 w-full`} />
        <div className={`${bar} h-4 w-2/3`} />
      </div>
      <div className="flex flex-col gap-8">
        <div className="h-28 animate-pulse rounded-[16px] bg-muted/40 motion-reduce:animate-none" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-[12px] bg-muted/40 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </div>
  );
}

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const localePath = useLocalePath();
  const [params, setParams] = useSearchParams();
  const fileInput = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [saves, setSaves] = useState<SavedEntry[]>([]);
  const [history, setHistory] = useState<UsernameHistory[]>([]);
  const [press, setPress] = useState<{ status: PressStatus; logo: string | null }>({ status: "none", logo: null });
  const [profileLoading, setProfileLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const { data: statusItems = [] } = useAllMediaStatus();
  const { data: lists = [] } = useMyLists();
  const { data: friendships = [] } = useFriendships();
  const friendCount = friendships.filter((f) => f.status === "accepted").length;
  const pendingRequests = friendships.filter((f) => f.status === "pending" && f.addressee_id === user?.id).length;

  const tabParam = params.get("tab");
  const tab: OwnTab = (OWN_TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as OwnTab) : "reviews";
  const setTab = (next: OwnTab) =>
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
    document.title = t("meta.profile.title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.profile.description"));
  }, [t]);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const [profileRes, reviewsRes, savesRes, historyRes, pressRes] = await Promise.all([
        supabase.from("profiles").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle(),
        supabase
          .from("reviews")
          .select("id, media_id, media_type, score, title, content, created_at, is_critic_review, season_number, episode_number")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("user_saves").select("id, target_id, target_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("username_history").select("id, old_username, changed_at").eq("user_id", userId).order("changed_at", { ascending: false }),
        supabase.from("press_profiles").select("verified, press_logo").eq("user_id", userId).maybeSingle(),
      ]);
      // Every account gets a profile row at sign-up; should one be missing, the page still renders
      setProfile(
        (profileRes.data as unknown as UserProfile | null) ?? {
          id: userId, user_id: userId, display_name: null, username: null, avatar_url: null, bio: null, is_official: false,
          created_at: new Date().toISOString(), username_changed_at: null, display_name_changed_at: null, post_karma: 0, comment_karma: 0,
        },
      );
      setReviews((reviewsRes.data ?? []) as ProfileReview[]);
      // Saves of the old forum are still in the table; only titles belong on the profile
      setSaves((savesRes.data ?? []).filter((s) => isMediaKind(s.target_type)));
      setHistory((historyRes.data ?? []) as UsernameHistory[]);
      const pressRow = pressRes.data as { verified: boolean; press_logo: string | null } | null;
      setPress(pressRow ? { status: pressRow.verified ? "verified" : "pending", logo: pressRow.press_logo || null } : { status: "none", logo: null });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (user) loadProfile(user.id);
  }, [user, loading, navigate, loadProfile]);

  const announce = () => window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    const problem = checkAvatarFile(file);
    if (problem) {
      toast.error(problem === "type" ? t("profile.avatarType") : t("profile.avatarSize"));
      return;
    }
    setAvatarBusy(true);
    try {
      const avatar = await compressImage(file, AVATAR_IMAGE);
      const ext = avatar.type.split("/")[1].replace("jpeg", "jpg");
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, avatar, { upsert: true, contentType: avatar.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      announce();
      toast.success(t("profile.avatarUpdated"));
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(t("profile.avatarError"));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSave = async (draft: ProfileDraft): Promise<boolean> => {
    if (!user || !profile) return false;
    try {
      const updates: Partial<UserProfile> = {};
      const now = new Date().toISOString();
      if (draft.bio !== (profile.bio ?? "")) updates.bio = draft.bio || null;
      if (draft.displayName && draft.displayName !== (profile.display_name ?? "")) {
        const days = daysUntilChange(profile.display_name_changed_at, 7);
        if (days > 0) {
          toast.error(t("profile.displayNameCooldown", { days }));
          return false;
        }
        updates.display_name = draft.displayName;
        updates.display_name_changed_at = now;
      }
      const usernameChanged = !!draft.username && draft.username !== (profile.username ?? "");
      if (usernameChanged) {
        const days = daysUntilChange(profile.username_changed_at, 30);
        if (days > 0) {
          toast.error(t("profile.usernameCooldown", { days }));
          return false;
        }
        const { data: taken } = await supabase.from("profiles").select("id").eq("username", draft.username).neq("user_id", user.id).limit(1);
        if (taken && taken.length > 0) {
          toast.error(t("profile.usernameTaken"));
          return false;
        }
        updates.username = draft.username;
        updates.username_changed_at = now;
      }
      if (Object.keys(updates).length === 0) return true;

      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
      if (error) throw error;
      if (usernameChanged && profile.username) {
        await supabase.from("username_history").insert({ user_id: user.id, old_username: profile.username });
        setHistory((prev) => [{ id: `new-${now}`, old_username: profile.username!, changed_at: now }, ...prev]);
      }
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      if (updates.display_name || updates.username) announce();
      toast.success(t("profile.updated"));
      return true;
    } catch {
      toast.error(t("profile.saveError"));
      return false;
    }
  };

  const removeSave = async (save: SavedEntry) => {
    setSaves((prev) => prev.filter((s) => s.id !== save.id));
    const { error } = await supabase.from("user_saves").delete().eq("id", save.id);
    if (error) {
      setSaves((prev) => [save, ...prev]);
      toast.error(t("profile.saveError"));
      return;
    }
    toast.success(t("profile.unsaved"), {
      action: {
        label: t("profile.undo"),
        onClick: async () => {
          const { data } = await supabase
            .from("user_saves")
            .insert({ user_id: user!.id, target_id: save.target_id, target_type: save.target_type })
            .select("id, target_id, target_type, created_at")
            .single();
          if (data) setSaves((prev) => [data, ...prev].sort((a, b) => b.created_at.localeCompare(a.created_at)));
        },
      },
    });
  };

  const withdrawPress = async () => {
    if (!user) return;
    const { error } = await supabase.from("press_profiles").delete().eq("user_id", user.id).eq("verified", false);
    if (error) {
      toast.error(t("press.errorWithdraw"));
      return;
    }
    toast.success(t("press.withdrawn"));
    setPress({ status: "none", logo: null });
  };

  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || t("profile.anonymous");
  const avg = averageScore(reviews);
  const showDistribution = reviews.length >= 3 && avg !== null;
  const publicPath = user ? localePath(`/user/${user.id}`) : "";

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 pt-24">
        <div className="container mx-auto max-w-6xl px-4">
          {loading || profileLoading || !user || !profile ? (
            <ProfileSkeleton />
          ) : (
            <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
              <ProfileIdentity
                profile={profile}
                displayName={displayName}
                press={{ verified: press.status === "verified", logo: press.logo }}
                pastUsernames={history}
                onAvatarClick={() => fileInput.current?.click()}
                avatarBusy={avatarBusy}
                emptyBio={
                  <button type="button" onClick={() => setEditOpen(true)} className="self-start text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {t("profile.addBio")}
                  </button>
                }
                actions={
                  <>
                    <Button onClick={() => setEditOpen(true)} className="flex-1 gap-2 active:scale-[0.98] lg:flex-none">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      {t("profile.editProfile")}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => shareLink(`${window.location.origin}${publicPath}`, displayName, t("share.copied"))}
                      aria-label={t("profile.shareProfile")}
                      title={t("profile.shareProfile")}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <Link to={`/user/${user.id}`} aria-label={t("profile.viewPublic")} title={t("profile.viewPublic")}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                }
              >
                {press.status === "pending" && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border/60 px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {t("profile.pressPending")}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-destructive hover:text-destructive" onClick={withdrawPress}>
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("press.withdraw")}
                    </Button>
                  </div>
                )}
                {press.status === "none" && (
                  <div>
                    <PressApplicationDialog userId={user.id} onSubmitted={() => loadProfile(user.id)} />
                  </div>
                )}
              </ProfileIdentity>

              <div className="flex min-w-0 flex-col gap-10">
                <section aria-label={t("profile.overview")} className={showDistribution ? "grid gap-4 md:grid-cols-2" : undefined}>
                  <StatGrid
                    columns={showDistribution ? 2 : 4}
                    stats={[
                      { label: t("profile.reviews"), value: formatNumber(reviews.length) },
                      { label: t("profile.average"), value: avg === null ? "–" : formatScore(avg) },
                      { label: t("profile.statusStat"), value: formatNumber(statusItems.length) },
                      { label: t("profile.saved"), value: formatNumber(saves.length) },
                    ]}
                  />
                  {showDistribution && <ScoreDistribution buckets={scoreBuckets(reviews)} average={avg} total={reviews.length} />}
                </section>

                <ProfileTabs
                  tab={tab}
                  onTabChange={setTab}
                  userId={user.id}
                  reviews={reviews}
                  saves={saves}
                  onRemoveSave={removeSave}
                  statusItems={statusItems}
                  lists={lists}
                  friendCount={friendCount}
                  pendingRequests={pendingRequests}
                />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {user && profile && (
        <EditProfileSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          userId={user.id}
          current={profile}
          onAvatarClick={() => fileInput.current?.click()}
          avatarBusy={avatarBusy}
          onSave={handleSave}
        />
      )}
      <input
        ref={fileInput}
        id="profile-avatar-upload"
        name="avatar"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarFile}
        aria-label={t("profile.changeAvatar")}
      />
    </div>
  );
};

export default ProfilePage;
