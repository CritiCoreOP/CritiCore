import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StarRating from "@/components/StarRating";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useDataOptOut } from "@/hooks/useDataOptOut";
import { Link } from "@/lib/locale-router";
import { toast } from "sonner";
import tgnLogo from "@/assets/tgn-logo.png";
import OfficialBadge from "@/components/OfficialBadge";
import ReportDialog from "@/components/ReportDialog";
import { X as CloseTwoTone, Trash as DeleteTwoTone, Trophy as EmojiEventsTwoTone, AlertCircle as ErrorOutlineTwoTone, PenSquare as RateReviewTwoTone, Star as StarTwoTone, ThumbsDown as ThumbDownTwoTone, ThumbsUp as ThumbUpTwoTone } from "lucide-react";

interface ReactionCounts {
  like: number;
  dislike: number;
  kudos: number;
}

interface Review {
  id: string;
  user_id: string;
  media_id: string;
  score: number;
  title: string | null;
  content: string | null;
  created_at: string;
  is_critic_review: boolean;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    is_official?: boolean;
  } | null;
  reactions: ReactionCounts;
  userReactions: string[];
}

interface ReviewSectionProps {
  mediaId: string;
  mediaType: "game" | "movie" | "series";
  title?: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  releaseDate?: string | null;
}

const reviewSchema = z.object({
  score: z.number().min(0.5).max(10),
  title: z.string().max(200).optional().or(z.literal("")),
  content: z.string().max(2000).optional().or(z.literal("")),
});

const ReviewSection = ({ mediaId, mediaType, title, seasonNumber = null, episodeNumber = null, releaseDate = null }: ReviewSectionProps) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { guardOptOut } = useDataOptOut();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [score, setScore] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");

  useEffect(() => {
    loadReviews();
  }, [mediaId, mediaType, user]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("reviews")
        .select("id, user_id, media_id, score, title, content, created_at, is_critic_review, season_number, episode_number")
        .eq("media_id", mediaId)
        .eq("media_type", mediaType);

      if (seasonNumber != null) {
        query = query.eq("season_number", seasonNumber);
      } else {
        query = query.is("season_number", null);
      }
      if (episodeNumber != null) {
        query = query.eq("episode_number", episodeNumber);
      } else {
        query = query.is("episode_number", null);
      }

      const { data } = await query.order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const reviewIds = data.map(r => r.id);

        // Fetch profiles and reactions in parallel
        const [profilesRes, reactionsRes, userReactionsRes] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name, avatar_url, is_official").in("user_id", userIds),
          supabase.from("review_reactions").select("review_id, reaction_type").in("review_id", reviewIds),
          user
            ? supabase.from("review_reactions").select("review_id, reaction_type").in("review_id", reviewIds).eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap = new Map(
          (profilesRes.data || []).map(p => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url, is_official: p.is_official }])
        );

        // Count reactions per review
        const reactionMap = new Map<string, ReactionCounts>();
        for (const r of reactionsRes.data || []) {
          const counts = reactionMap.get(r.review_id) || { like: 0, dislike: 0, kudos: 0 };
          counts[r.reaction_type as keyof ReactionCounts]++;
          reactionMap.set(r.review_id, counts);
        }

        // User's own reactions
        const userReactionMap = new Map<string, string[]>();
        for (const r of userReactionsRes.data || []) {
          const types = userReactionMap.get(r.review_id) || [];
          types.push(r.reaction_type);
          userReactionMap.set(r.review_id, types);
        }

        const reviewsWithAll = data.map(r => ({
          ...r,
          profile: profileMap.get(r.user_id) || null,
          reactions: reactionMap.get(r.id) || { like: 0, dislike: 0, kudos: 0 },
          userReactions: userReactionMap.get(r.id) || [],
        }));
        setReviews(reviewsWithAll);

        if (user) {
          const own = reviewsWithAll.find((r) => r.user_id === user.id);
          setUserReview(own || null);
          if (own) {
            setScore(own.score);
            setReviewTitle(own.title || "");
            setReviewContent(own.content || "");
            setShowForm(true);
          }
        }
      } else {
        setReviews([]);
        setUserReview(null);
      }
    } catch (err) {
      console.error("Error loading reviews:", err);
      setError(t("reviews.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (guardOptOut()) return;

    setError(null);
    setSubmitting(true);

    try {
      const validated = reviewSchema.parse({
        score,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
      });

      // Check if user is verified press
      const { data: pressData } = await supabase
        .from("press_profiles")
        .select("verified")
        .eq("user_id", user.id)
        .eq("verified", true)
        .maybeSingle();
      const isCritic = !!pressData;

      if (userReview) {
        const { error: updateError } = await supabase
          .from("reviews")
          .update({
            score: validated.score,
            title: validated.title || null,
            content: validated.content || null,
            is_critic_review: isCritic,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userReview.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("reviews").insert({
          user_id: user.id,
          media_id: mediaId,
          media_type: mediaType,
          score: validated.score,
          title: validated.title || null,
          content: validated.content || null,
          is_critic_review: isCritic,
          season_number: seasonNumber,
          episode_number: episodeNumber,
        });

        if (insertError) throw insertError;
      }

      await loadReviews();
      setReviewTitle("");
      setReviewContent("");
      setScore(0);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError(err.message || t("reviews.saveError"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !userReview) return;
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", userReview.id);
      if (error) throw error;
      setUserReview(null);
      toast.success(t("reviews.deleted"));
      await loadReviews();
    } catch {
      toast.error(t("reviews.deleteError"));
    }
  };

  const handleReaction = async (reviewId: string, type: "like" | "dislike" | "kudos") => {
    if (!user) return;
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    const hasReaction = review.userReactions.includes(type);
    const opposite = type === "like" ? "dislike" : type === "dislike" ? "like" : null;
    const hasOpposite = opposite ? review.userReactions.includes(opposite) : false;

    try {
      // Remove opposite reaction first (like/dislike are mutually exclusive)
      if (hasOpposite && opposite) {
        await supabase.from("review_reactions").delete()
          .eq("review_id", reviewId).eq("user_id", user.id).eq("reaction_type", opposite);
      }

      if (hasReaction) {
        await supabase.from("review_reactions").delete()
          .eq("review_id", reviewId).eq("user_id", user.id).eq("reaction_type", type);
      } else {
        await supabase.from("review_reactions").insert({
          review_id: reviewId, user_id: user.id, reaction_type: type,
        });
      }
      // Optimistic update
      setReviews(prev => prev.map(r => {
        if (r.id !== reviewId) return r;
        const newReactions = { ...r.reactions };
        let newUserReactions = hasReaction
          ? r.userReactions.filter(rt => rt !== type)
          : [...r.userReactions, type];
        newReactions[type] = hasReaction ? Math.max(0, newReactions[type] - 1) : newReactions[type] + 1;
        // Remove opposite
        if (!hasReaction && hasOpposite && opposite) {
          newUserReactions = newUserReactions.filter(rt => rt !== opposite);
          newReactions[opposite as keyof ReactionCounts] = Math.max(0, newReactions[opposite as keyof ReactionCounts] - 1);
        }
        return { ...r, reactions: newReactions, userReactions: newUserReactions };
      }));
    } catch {
      toast.error(t("reviews.reactionError"));
    }
  };

  const avgScore = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length).toFixed(1) : "—";

  const dateLocale = i18n.language === "en" ? "en-US" : i18n.language === "fr" ? "fr-FR" : i18n.language === "es" ? "es-ES" : "de-DE";

  return (
    <div className="space-y-8">
      {/* Stats — only once at least one review exists */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t("reviews.avgRating")}</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {avgScore}
                <StarTwoTone className="w-6 h-6 text-primary" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t("reviews.reviewCount")}</CardDescription>
              <CardTitle className="text-3xl">{reviews.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Review Form / Empty state */}
      {releaseDate && new Date(releaseDate) > new Date() ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <ErrorOutlineTwoTone className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-medium">{t("reviews.notReleasedYet")}</p>
            <p className="text-sm text-muted-foreground">{t("reviews.notReleasedDesc", { date: new Date(releaseDate).toLocaleDateString(dateLocale) })}</p>
          </CardContent>
        </Card>
      ) : user ? (
        !showForm ? (
          <div className="flex justify-center">
            <Button
              type="button"
              size="lg"
              onClick={() => setShowForm(true)}
              aria-expanded={false}
              aria-controls="review-form-panel"
              className="gap-2"
            >
              <RateReviewTwoTone className="w-5 h-5" aria-hidden="true" />
              {t("reviews.writeReview", "Bewertung schreiben")}
            </Button>
          </div>
        ) : (
        <Card data-no-glow id="review-form-panel" aria-labelledby="review-form-title">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle id="review-form-title">{userReview ? t("reviews.updateReview") : t("reviews.submitReview")}</CardTitle>
                {userReview && (
                  <CardDescription>
                    {title ? t("reviews.alreadyReviewed", { title }) : t("reviews.alreadyReviewedGeneric")}
                  </CardDescription>
                )}
              </div>
              {!userReview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowForm(false)}
                  aria-expanded={true}
                  aria-controls="review-form-panel"
                  aria-label={t("common.close", "Schließen")}
                >
                  <CloseTwoTone className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <ErrorOutlineTwoTone className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Score — Stars */}
              <div className="space-y-3">
                <Label id="score-label">{t("reviews.yourRating", "Deine Wertung")}</Label>
                <StarRating
                  value={score}
                  onChange={setScore}
                  ariaLabel={t("reviews.yourRating", "Deine Wertung") as string}
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t("reviews.titleOptional")}</Label>
                <input
                  id="title"
                  type="text"
                  placeholder={t("reviews.titlePlaceholder")}
                  maxLength={200}
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] border border-border/60 bg-background/40 text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:border-[hsl(var(--accent-light,var(--primary)))] focus:ring-2 focus:ring-[hsl(var(--accent-light,var(--primary)))]/40"
                />
                <p className="text-xs text-muted-foreground text-right tabular-nums">{reviewTitle.length}/200</p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">{t("reviews.contentOptional")}</Label>
                <Textarea
                  id="content"
                  placeholder={t("reviews.contentPlaceholder")}
                  maxLength={2000}
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  className="min-h-28 w-full resize-none rounded-[10px] border border-border/60 bg-background/40 px-3 py-2 text-foreground placeholder:text-muted-foreground/70 transition-colors focus-visible:border-[hsl(var(--accent-light,var(--primary)))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-light,var(--primary)))]/40 focus-visible:ring-offset-0"
                />
                <p className="text-xs text-muted-foreground text-right tabular-nums">{reviewContent.length}/2000</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {userReview && (
                  <Button type="button" variant="ghost" size="icon" onClick={handleDelete} title={t("reviews.delete")} aria-label={t("reviews.delete") as string}>
                    <DeleteTwoTone className="w-4 h-4" />
                  </Button>
                )}
                <Button type="submit" disabled={submitting || score < 0.5}>
                  {submitting && <M3LoadingIndicator size={16} className="inline-flex mr-2" />}
                  {userReview ? t("reviews.update") : t("reviews.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        )
      ) : (
        <Card>
          <CardContent className="pt-8 pb-8 text-center flex flex-col items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <StarTwoTone className="w-7 h-7" />
            </span>
            <p className="text-foreground font-semibold text-lg">
              {reviews.length === 0 ? t("reviews.beFirst") : t("reviews.loginPrompt")}
            </p>
            <Button asChild>
              <Link to="/auth">{t("reviews.loginButton")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews List — heading only once reviews exist (empty state covers 0) */}
      {reviews.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">
            {t("reviews.reviewsCount", { count: reviews.length })}
          </h3>

        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6 pb-4">
                <div className="flex items-start gap-4 mb-3">
                  <Link to={`/user/${review.user_id}`} className="shrink-0">
                    <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary transition-all">
                      <AvatarImage src={review.profile?.avatar_url || ""} />
                      <AvatarFallback>{(review.profile?.display_name || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link to={`/user/${review.user_id}`} className="font-medium hover:text-primary transition-colors">
                        {review.profile?.display_name || t("reviews.anonymous")}
                      </Link>
                      {review.is_critic_review && (
                        <Badge className="bg-[#1a1a2e] text-white text-xs gap-1.5 pl-1.5 pr-2.5 py-0.5 border border-primary/30">
                          <img src={tgnLogo} alt="TGN" className="h-3.5 w-auto" />
                          {t("reviews.criticBadge")}
                        </Badge>
                      )}
                      {review.profile?.is_official && <OfficialBadge />}
                      {user && review.user_id === user.id && (
                        <Badge variant="outline" className="text-xs">{t("reviews.you")}</Badge>
                      )}
                    </div>
                    {review.title && <p className="font-semibold text-foreground mb-1">{review.title}</p>}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-0.5">
                        <StarTwoTone className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold text-primary">{review.score.toFixed(1)}</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(review.created_at).toLocaleDateString(dateLocale)}</span>
                    </div>
                  </div>
                </div>
                {review.content && <p className="text-sm text-foreground/80 leading-relaxed mb-3">{review.content}</p>}
                {/* Reaction buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 text-xs ${review.userReactions.includes("like") ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => handleReaction(review.id, "like")}
                    disabled={!user}
                  >
                    <ThumbUpTwoTone className={`w-3.5 h-3.5 ${review.userReactions.includes("like") ? "text-primary" : ""}`} />
                    {review.reactions.like > 0 && review.reactions.like}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 text-xs ${review.userReactions.includes("dislike") ? "text-destructive" : "text-muted-foreground"}`}
                    onClick={() => handleReaction(review.id, "dislike")}
                    disabled={!user}
                  >
                    <ThumbDownTwoTone className={`w-3.5 h-3.5 ${review.userReactions.includes("dislike") ? "text-destructive" : ""}`} />
                    {review.reactions.dislike > 0 && review.reactions.dislike}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 text-xs ${review.userReactions.includes("kudos") ? "text-amber-500" : "text-muted-foreground"}`}
                    onClick={() => handleReaction(review.id, "kudos")}
                    disabled={!user}
                  >
                    <EmojiEventsTwoTone className={`w-3.5 h-3.5 ${review.userReactions.includes("kudos") ? "text-amber-500" : ""}`} />
                    {t("reviews.kudos")}
                    {review.reactions.kudos > 0 && <span>{review.reactions.kudos}</span>}
                  </Button>
                  {user && review.user_id !== user.id && (
                    <div className="ml-auto">
                      <ReportDialog
                        targetId={review.id}
                        targetType="review"
                        targetTitle={review.title || review.profile?.display_name || undefined}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default ReviewSection;