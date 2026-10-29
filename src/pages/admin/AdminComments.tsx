import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/locale";
import { Ban as BlockTwoTone, Trash as DeleteTwoTone } from "lucide-react";
import { PROFILE_COLUMNS } from "@/lib/profileColumns";

interface Comment { id: string; user_id: string; content: string; target_type: string; target_id: string; created_at: string; }
interface Profile { user_id: string; display_name: string | null; avatar_url: string | null; status: string; id: string; }

const AdminComments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [commentsRes, profilesRes] = await Promise.all([
      supabase.from("comments").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select(PROFILE_COLUMNS)
    ]);
    if (commentsRes.data) setComments(commentsRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);
  const logMod = async (targetId: string, action: string) => { 
    await supabase.from("moderation_logs").insert({ 
      admin_id: user!.id, 
      target_type: "comment", 
      target_id: targetId, 
      action 
    }); 
  };

  const deleteComment = async (comment: Comment) => { 
    setActionLoading(comment.id); 
    await supabase.from("comments").delete().eq("id", comment.id); 
    await logMod(comment.id, "delete_comment"); 
    toast.success(t("admin.comments.commentDeleted")); 
    await loadData(); 
    setActionLoading(null); 
  };

  const banUser = async (comment: Comment) => { 
    const profile = getProfile(comment.user_id); 
    if (!profile) return; 
    setActionLoading(`ban-${comment.id}`); 
    await supabase.from("profiles").update({ status: "banned" }).eq("id", profile.id); 
    await supabase.from("moderation_logs").insert({ 
      admin_id: user!.id, 
      target_type: "user", 
      target_id: comment.user_id, 
      action: "ban" 
    }); 
    toast.success(t("admin.comments.userBanned")); 
    await loadData(); 
    setActionLoading(null); 
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.comments.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.comments.subtitle")}</p>
      </div>
      <ul className="space-y-2" aria-label={t("admin.comments.title")}>
        {comments.map((comment) => { 
          const profile = getProfile(comment.user_id); 
          return (
            <li key={comment.id}>
              <Card>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                      <AvatarFallback className="text-xs">
                        {(profile?.display_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{profile?.display_name || t("admin.comments.unnamed")}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{comment.target_type}</Badge>
                        {profile?.status === "banned" && <Badge variant="destructive" className="text-xs">{t("admin.comments.banned")}</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatDateTime(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive" 
                        onClick={() => deleteComment(comment)} 
                        disabled={actionLoading === comment.id}
                        aria-label={t("admin.comments.deleteComment")}
                      >
                        {actionLoading === comment.id ? <M3LoadingIndicator size={14} /> : <DeleteTwoTone className="w-3.5 h-3.5" />}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive" 
                        onClick={() => banUser(comment)} 
                        disabled={actionLoading === `ban-${comment.id}` || profile?.status === "banned"}
                        aria-label={t("admin.comments.banUser")}
                      >
                        {actionLoading === `ban-${comment.id}` ? <M3LoadingIndicator size={14} /> : <BlockTwoTone className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ); 
        })}
        {comments.length === 0 && (
          <li className="text-center py-8">
            <Card>
              <CardContent className="py-8 text-muted-foreground">
                {t("admin.comments.noComments")}
              </CardContent>
            </Card>
          </li>
        )}
      </ul>
    </div>
  );
};

export default AdminComments;
