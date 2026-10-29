import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { LANG_TO_LOCALE } from "@/lib/localeRouting";
import { Copy as ContentCopyTwoTone, Trash as DeleteTwoTone, Users as GroupsTwoTone, Link as LinkTwoTone } from "lucide-react";

interface Collaborator {
  id: string;
  user_id: string;
  accepted: boolean;
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface CollabPanelProps {
  articleId: string | null;
  userId: string | undefined;
}

const CollabPanel = ({ articleId, userId }: CollabPanelProps) => {
  const { t } = useTranslation();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && articleId) loadCollaborators();
  }, [open, articleId]);

  const loadCollaborators = async () => {
    if (!articleId) return;
    const { data } = await supabase
      .from("article_collaborators")
      .select("id, user_id, accepted")
      .eq("article_id", articleId);

    if (data) {
      // Load profiles for accepted collaborators
      const userIds = data.filter(c => c.accepted).map(c => c.user_id);
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        profileMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }

      setCollaborators(data.map((c: any) => ({
        ...c,
        profile: profileMap[c.user_id] || null,
      })));
    }
  };

  const generateInviteLink = async () => {
    if (!articleId || !userId) return;

    const token = crypto.randomUUID();
    // Use a unique placeholder user_id to avoid unique constraint violations
    // The accept_article_invite function will replace it with the actual user
    const placeholderUserId = crypto.randomUUID();
    const { error } = await supabase.from("article_collaborators").insert({
      article_id: articleId,
      user_id: placeholderUserId,
      invited_by: userId,
      invite_token: token,
      accepted: false,
    } as any);

    if (error) {
      toast.error(error.message);
      return;
    }

    const lang = document.documentElement.lang || "de";
    const fullLocale = LANG_TO_LOCALE[lang] || lang;
    const link = `${window.location.origin}/${fullLocale}/invite/${token}`;
    setInviteLink(link);
    loadCollaborators();
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard?.writeText(inviteLink).then(
      () => toast.success(t("collab.linkCopied")),
      () => toast.error(t("common.error")),
    );
  };

  const removeCollaborator = async (id: string) => {
    const { error } = await supabase.from("article_collaborators").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("collab.removed", "Collaborator entfernt"));
    loadCollaborators();
  };

  if (!articleId) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-9 w-9 shrink-0" title={t("collab.saveFirst")}>
        <GroupsTwoTone className="w-4 h-4" />
        <span className="sr-only">{t("collab.title")}</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 relative" title={t("collab.title")}>
          <GroupsTwoTone className="w-4 h-4" />
          <span className="sr-only">{t("collab.title")}</span>
          {collaborators.filter(c => c.accepted).length > 0 && (
            <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px]">
              {collaborators.filter(c => c.accepted).length}
            </Badge>
          )}
        </Button>

      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GroupsTwoTone className="w-5 h-5 text-primary" />
            {t("collab.title", "Zusammenarbeit")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Generate invite link */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("collab.inviteDesc", "Erstelle einen Einladungslink, den du mit anderen teilen kannst.")}
            </p>
            {inviteLink ? (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs font-mono" />
                <Button size="sm" variant="outline" onClick={copyLink} aria-label={t("collab.copyLink")}>
                  <ContentCopyTwoTone className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={generateInviteLink} className="w-full gap-2" size="sm">
                <LinkTwoTone className="w-4 h-4" />
                {t("collab.generateLink", "Einladungslink erstellen")}
              </Button>
            )}
          </div>

          {/* Collaborator list */}
          {collaborators.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t("collab.members", "Mitarbeiter")}</h4>
              {collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={collab.profile?.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {collab.accepted ? (collab.profile?.display_name || "U").charAt(0) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {collab.accepted
                          ? collab.profile?.display_name || t("collab.unknownUser", "Unbekannt")
                          : t("collab.pending", "Einladung ausstehend")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={collab.accepted ? "default" : "secondary"} className="text-xs">
                      {collab.accepted ? t("collab.active", "Aktiv") : t("collab.pendingShort", "Offen")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeCollaborator(collab.id)}
                      aria-label={t("common.delete")}
                    >
                      <DeleteTwoTone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollabPanel;
