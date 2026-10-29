import { useEffect, useState, useCallback } from "react";
import CommunityIcon from "@/components/forum/CommunityIcon";
import VoteButton from "@/components/forum/VoteButton";
import { useParams } from "react-router-dom";
import { Link, useNavigate } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE, AVATAR_IMAGE } from "@/lib/compressImage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import OfficialBadge from "@/components/OfficialBadge";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { toast } from "sonner";
import CommunityWidgets from "@/components/forum/CommunityWidgets";
import CommunityWidgetEditor from "@/components/forum/CommunityWidgetEditor";
import CommunityStatusDialog from "@/components/forum/CommunityStatusDialog";
import { Plus as AddTwoTone, FileText as ArticleTwoTone, Calendar as CalendarTodayTwoTone, Camera as CameraAltTwoTone, Megaphone as CampaignTwoTone, MessageCircle as ChatBubbleTwoTone, X as CloseTwoTone, Users as GroupsTwoTone, Image as ImageTwoTone, BellRing as NewReleasesTwoTone, UserPlus as PersonAddTwoTone, UserMinus as PersonRemoveTwoTone, Globe as PublicTwoTone, Share2 as ShareTwoTone, Shield as ShieldTwoTone, TrendingUp as TrendingUpTwoTone, Mail as MailTwoTone, MoreHorizontal as MoreHorizTwoTone, Pin as PushPinTwoTone, Flame as WhatshotTwoTone } from "lucide-react";
const CommunityPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [postType, setPostType] = useState<"text" | "image" | "link">("text");
  const [linkUrl, setLinkUrl] = useState("");
  const [postTags, setPostTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [showWidgetEditor, setShowWidgetEditor] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showModMail, setShowModMail] = useState(false);
  const [modMailSubject, setModMailSubject] = useState("");
  const [modMailContent, setModMailContent] = useState("");
  const [sendingModMail, setSendingModMail] = useState(false);

  const isCreator = user && community?.created_by === user.id;

  const handleUploadImage = async (original: File, type: "banner" | "icon") => {
    if (!user || !community) return;
    const setter = type === "banner" ? setUploadingBanner : setUploadingIcon;
    setter(true);
    const file = await compressImage(original, type === "icon" ? AVATAR_IMAGE : ARTICLE_IMAGE);
    const ext = file.name.split(".").pop();
    const path = `communities/${community.id}/${type}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("forum-images").upload(path, file);
    if (uploadErr) { toast.error("Upload fehlgeschlagen."); setter(false); return; }
    const { data: urlData } = supabase.storage.from("forum-images").getPublicUrl(path);
    const url = urlData.publicUrl;
    const update = type === "banner" ? { banner_url: url } : { icon: url };
    const { error } = await supabase.from("forum_communities").update(update).eq("id", community.id);
    if (!error) {
      setCommunity((c: any) => ({ ...c, ...update }));
      toast.success(type === "banner" ? "Banner aktualisiert!" : "Icon aktualisiert!");
    } else {
      toast.error("Fehler beim Speichern.");
    }
    setter(false);
  };

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);

    const { data: comm } = await supabase
      .from("forum_communities")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!comm) { setLoading(false); return; }
    setCommunity(comm);

    if (user) {
      const { data: member } = await supabase
        .from("forum_community_members")
        .select("id")
        .eq("community_id", comm.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setIsMember(!!member);
    }

    let query = supabase
      .from("forum_posts")
      .select("*")
      .eq("community_id", comm.id)
      .order("pinned", { ascending: false });

    if (sort === "hot") {
      query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
    } else if (sort === "top") {
      query = query.order("upvotes", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    query = query.limit(50);

    const { data: postsData } = await query;

    if (postsData) {
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url, is_official").in("user_id", userIds)
        : { data: [] };

      // Load flairs
      const flairIds = [...new Set(postsData.filter(p => p.flair_id).map(p => p.flair_id))];
      const { data: flairs } = flairIds.length > 0
        ? await supabase.from("forum_flairs").select("id, name, color, bg_color, emoji, icon_url").in("id", flairIds)
        : { data: [] };

      let votes: any[] = [];
      if (user) {
        const postIds = postsData.map((p) => p.id);
        if (postIds.length > 0) {
          const { data: v } = await supabase.from("forum_votes").select("target_id, vote_type").eq("user_id", user.id).eq("target_type", "post").in("target_id", postIds);
          votes = v || [];
        }
      }

      setPosts(postsData.map((p) => ({
        ...p,
        profile: profiles?.find((pr) => pr.user_id === p.user_id),
        flair: flairs?.find((f: any) => f.id === p.flair_id) || null,
        userVote: votes.find((v) => v.target_id === p.id)?.vote_type || null,
      })));
    }

    const { data: widgetsData } = await supabase
      .from("forum_community_widgets" as any)
      .select("*")
      .eq("community_id", comm.id)
      .order("sort_order", { ascending: true });
    setWidgets(widgetsData || []);

    setLoading(false);
  }, [slug, user, sort]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleJoin = async () => {
    if (!user || !community) { toast.error("Bitte anmelden."); return; }
    setJoining(true);
    if (isMember) {
      await supabase.from("forum_community_members").delete().eq("community_id", community.id).eq("user_id", user.id);
      await supabase.from("forum_communities").update({ member_count: Math.max(0, community.member_count - 1) }).eq("id", community.id);
      setIsMember(false);
      setCommunity((c: any) => ({ ...c, member_count: Math.max(0, c.member_count - 1) }));
    } else {
      await supabase.from("forum_community_members").insert({ community_id: community.id, user_id: user.id, role: "member" });
      await supabase.from("forum_communities").update({ member_count: community.member_count + 1 }).eq("id", community.id);
      setIsMember(true);
      setCommunity((c: any) => ({ ...c, member_count: c.member_count + 1 }));
    }
    setJoining(false);
  };

  const handleVote = async (post: any, voteType: "up" | "down") => {
    if (!user) { toast.error(t("forum.loginToVote")); return; }
    if (post.userVote === voteType) {
      await supabase.from("forum_votes").delete().eq("user_id", user.id).eq("target_id", post.id).eq("target_type", "post");
      const u: any = {};
      if (voteType === "up") u.upvotes = Math.max(0, post.upvotes - 1);
      else u.downvotes = Math.max(0, post.downvotes - 1);
      await supabase.from("forum_posts").update(u).eq("id", post.id);
    } else {
      if (post.userVote) {
        await supabase.from("forum_votes").delete().eq("user_id", user.id).eq("target_id", post.id).eq("target_type", "post");
        const revert: any = {};
        if (post.userVote === "up") revert.upvotes = Math.max(0, post.upvotes - 1);
        else revert.downvotes = Math.max(0, post.downvotes - 1);
        await supabase.from("forum_posts").update(revert).eq("id", post.id);
      }
      await supabase.from("forum_votes").upsert({ user_id: user.id, target_id: post.id, target_type: "post", vote_type: voteType });
      const add: any = {};
      if (voteType === "up") add.upvotes = (post.userVote === "up" ? post.upvotes : post.upvotes + 1);
      else add.downvotes = (post.userVote === "down" ? post.downvotes : post.downvotes + 1);
      await supabase.from("forum_posts").update(add).eq("id", post.id);
    }
    await loadData();
  };

  const handleCreatePost = async () => {
    if (!user || !community) return;
    if (!title.trim()) { toast.error("Titel ist erforderlich."); return; }
    if (postType === "link" && !linkUrl.trim()) { toast.error("Link ist erforderlich."); return; }
    setCreating(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const image = await compressImage(imageFile, ARTICLE_IMAGE);
      const ext = image.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("forum-images").upload(path, image);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("forum-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const finalContent = postType === "link"
      ? `[${linkUrl}](${linkUrl})${content.trim() ? `\n\n${content.trim()}` : ""}`
      : content.trim() || title.trim();

    const { data, error } = await supabase.from("forum_posts").insert({
      user_id: user.id,
      title: title.trim(),
      content: finalContent,
      category: "allgemein",
      community_id: community.id,
      image_url: imageUrl,
    }).select("id").single();

    if (!error) {
      await supabase.from("forum_communities").update({ post_count: community.post_count + 1 }).eq("id", community.id);
      localStorage.removeItem(`forum-draft-${community.slug}`);
      toast.success("Post erstellt!");
      setTitle(""); setContent(""); setImageFile(null); setShowCreate(false);
      setLinkUrl(""); setPostTags([]); setPostType("text");
      navigate(`/forum/${data.id}`);
    } else {
      toast.error("Post konnte nicht erstellt werden.");
    }
    setCreating(false);
  };

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("community-post-content") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9äöüß-]/g, "");
    if (tag && !postTags.includes(tag) && postTags.length < 5) {
      setPostTags([...postTags, tag]);
    }
    setTagInput("");
    setShowTagInput(false);
  };

  const handleSaveDraft = () => {
    localStorage.setItem(`forum-draft-${community.slug}`, JSON.stringify({ title, content, postType, linkUrl, postTags }));
    toast.success("Entwurf gespeichert.");
  };

  const handleSendModMail = async () => {
    if (!user || !community || !modMailSubject.trim() || !modMailContent.trim()) return;
    setSendingModMail(true);
    const { error } = await supabase.from("forum_mod_mail" as any).insert({
      community_id: community.id,
      sender_id: user.id,
      subject: modMailSubject.trim(),
      content: modMailContent.trim(),
      is_mod_reply: false,
    } as any);
    if (!error) {
      toast.success("Nachricht an die Moderation gesendet.");
      setModMailSubject("");
      setModMailContent("");
      setShowModMail(false);
    } else {
      toast.error("Nachricht konnte nicht gesendet werden.");
    }
    setSendingModMail(false);
  };

  if (loading) return (
    <div className="space-y-0">
      <div className="h-32 sm:h-40 bg-muted animate-pulse" />
      <div className="px-6 lg:px-10 py-5 flex gap-6">
        <div className="flex-1 space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted animate-pulse border border-border rounded-lg" />)}
        </div>
        <div className="hidden xl:block w-[320px] shrink-0">
          <div className="h-72 bg-muted animate-pulse border border-border rounded-lg" />
        </div>
      </div>
    </div>
  );

  if (!community) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground text-lg">Community nicht gefunden.</p>
      <Link to="/forum"><Button variant="outline" className="mt-4">Zurück zum Forum</Button></Link>
    </div>
  );

  const createdDate = new Date(community.created_at).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });

  const sortTabs = [
    { key: "hot" as const, label: "Hot", icon: <WhatshotTwoTone className="!text-[16px]" /> },
    { key: "new" as const, label: "Neu", icon: <NewReleasesTwoTone className="!text-[16px]" /> },
    { key: "top" as const, label: "Top", icon: <TrendingUpTwoTone className="!text-[16px]" /> },
  ];

  return (
    <div>
      {/* Banner */}
      <div
        className="h-28 sm:h-36 w-full relative group/banner"
        style={{
          background: community.banner_url
            ? `url(${community.banner_url}) center/cover no-repeat`
            : "hsl(var(--muted))",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        {isCreator && (
          <label className="absolute top-2 right-3 bg-background/70 text-foreground p-1.5 rounded-md cursor-pointer opacity-0 group-hover/banner:opacity-100 transition-opacity border border-border">
            <CameraAltTwoTone className="!text-[16px]" />
            <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, "banner"); }} />
          </label>
        )}
      </div>

      {/* Header */}
      <div className="relative bg-card border-b border-border px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end gap-3 pb-3 -mt-6 sm:gap-4">
          <div className="relative group/icon shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-card border-2 border-border rounded-xl flex items-center justify-center overflow-hidden">
              <CommunityIcon icon={community.icon} size="lg" />
            </div>
            {isCreator && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl cursor-pointer opacity-0 group-hover/icon:opacity-100 transition-opacity">
                <CameraAltTwoTone className="!text-[16px] text-white" />
                <input type="file" accept="image/*" className="hidden" disabled={uploadingIcon}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, "icon"); }} />
              </label>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">c/{community.slug}</h1>
              {community.is_official && <OfficialBadge />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{community.description || community.name}</p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 pb-0.5 sm:ml-20 sm:w-auto sm:flex-nowrap sm:shrink-0 lg:ml-0">
            {isCreator && (
              <Link to={`/forum/c/${community.slug}/mod`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <ShieldTwoTone className="!text-[14px]" /> Mod-Tools
                </Button>
              </Link>
            )}
            {user && isMember && (
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
                <AddTwoTone className="!text-[14px]" /> Post erstellen
              </Button>
            )}
            {user && (
              <Button
                variant={isMember ? "outline" : "default"}
                size="sm"
                onClick={handleJoin}
                disabled={joining}
                className="text-xs"
              >
                {isMember ? "Beigetreten" : "Beitreten"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Community Status Banner ── */}
      {(community.status_emoji || community.status_text || community.status_icon_url || isCreator) && (
        <div className="px-4 sm:px-6 lg:px-10">
          {community.status_emoji || community.status_text || community.status_icon_url ? (
             <div
               className={`flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg mt-3 ${isCreator ? "cursor-pointer hover:bg-accent transition-colors" : ""}`}
              onClick={isCreator ? () => setShowStatusDialog(true) : undefined}
            >
              {community.status_icon_url ? (
                <img src={community.status_icon_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
              ) : (
                <span className="text-base">{community.status_emoji}</span>
              )}
              <span className="text-sm text-foreground flex-1">{community.status_text || ""}</span>
              {isCreator && <span className="text-[10px] text-muted-foreground">Bearbeiten</span>}
            </div>
          ) : isCreator ? (
            <button
              onClick={() => setShowStatusDialog(true)}
              className="flex items-center gap-2 px-4 py-2 mt-3 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:bg-accent transition-colors w-full"
            >
              <CampaignTwoTone className="!text-sm" />
              Community-Status hinzufügen
            </button>
          ) : null}
        </div>
      )}

      {/* Content */}
      <div className="flex gap-6 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex-1 min-w-0">

          {/* Sort tabs */}
          <div className="flex items-center gap-px mb-3 border-b border-border overflow-x-auto flex-nowrap scrollbar-none">
            {sortTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSort(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  sort === tab.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Create post dialog — Reddit-style */}
          <Dialog open={showCreate && !!user} onOpenChange={(open) => { setShowCreate(open); if (!open) { setPostType("text"); } }}>
            <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-bold text-base text-foreground">Post erstellen</DialogTitle>
                  <span className="text-xs text-muted-foreground">in c/{community.slug}</span>
                </div>
              </div>

              {/* Content type tabs */}
              <div className="flex items-center border-b border-border px-5">
                {([
                  { key: "text" as const, label: "Text" },
                  { key: "image" as const, label: "Bilder & Video" },
                  { key: "link" as const, label: "Link" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setPostType(tab.key)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                      postType === tab.key
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {postType === tab.key && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="px-5 pt-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {/* Title with character count */}
                <div className="relative">
                  <Input
                    placeholder="Titel *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 300))}
                    maxLength={300}
                    className="text-base bg-secondary/30 border-border px-4 py-3 h-auto rounded-lg"
                  />
                  <span className="absolute -bottom-5 right-1 text-[11px] text-muted-foreground">
                    <span className={title.length > 270 ? "text-destructive" : ""}>{title.length}</span>/300
                  </span>
                </div>

                {/* Tags */}
                <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                  {postTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-foreground text-xs font-medium">
                      #{tag}
                      <button onClick={() => setPostTags(postTags.filter((t) => t !== tag))} className="hover:text-destructive transition-colors">
                        <CloseTwoTone className="!text-[12px]" />
                      </button>
                    </span>
                  ))}
                  {showTagInput ? (
                    <div className="flex items-center gap-1">
                      <Input
                        autoFocus
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value.slice(0, 30))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } if (e.key === "Escape") setShowTagInput(false); }}
                        placeholder="Tag eingeben..."
                        className="h-7 w-32 text-xs px-2"
                      />
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleAddTag}>+</Button>
                    </div>
                  ) : postTags.length < 5 ? (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="px-2 py-0.5 border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      + Tags hinzufügen
                    </button>
                  ) : null}
                </div>

                {/* Link input */}
                {postType === "link" && (
                  <Input
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    type="url"
                    className="bg-secondary/30 border-border"
                  />
                )}

                {/* Image upload area */}
                {postType === "image" && !imageFile && (
                  <label className="flex flex-col items-center gap-2 p-10 border-2 border-dashed border-border cursor-pointer hover:bg-accent transition-colors">
                    <ImageTwoTone className="!text-4xl text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Bild oder Video auswählen</span>
                    <span className="text-xs text-muted-foreground/60">Drag & Drop oder klicken</span>
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  </label>
                )}

                {/* Image preview */}
                {imageFile && (
                  <div className="relative overflow-hidden border border-border max-h-52">
                    <img src={URL.createObjectURL(imageFile)} alt="" className="w-full h-full object-contain" />
                    <button
                      onClick={() => setImageFile(null)}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors"
                    >
                      <CloseTwoTone className="!text-sm" />
                    </button>
                  </div>
                )}

                {/* Toolbar + Textarea (for text and link types) */}
                {(postType === "text" || postType === "link") && (
                  <div>
                    <div className="flex items-center gap-0.5 p-1.5 border border-border border-b-0 rounded-t-lg bg-secondary/20 flex-wrap">
                      <button onClick={() => insertMarkdown("**", "**")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm font-bold" title="Fett">B</button>
                      <button onClick={() => insertMarkdown("*", "*")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm italic" title="Kursiv">i</button>
                      <button onClick={() => insertMarkdown("~~", "~~")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm line-through" title="Durchgestrichen">S</button>
                      <button onClick={() => insertMarkdown("<sup>", "</sup>")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs" title="Hochgestellt">X²</button>
                      <div className="w-px h-5 bg-border mx-0.5" />
                      <button onClick={() => insertMarkdown("## ")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm" title="Überschrift">H</button>
                      <button onClick={() => insertMarkdown("[", "](url)")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Link einfügen">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      </button>
                      <label className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Bild einfügen">
                        <ImageTwoTone className="!text-[18px]" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                      </label>
                      <div className="w-px h-5 bg-border mx-0.5" />
                      <button onClick={() => insertMarkdown("- ")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Liste">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
                      </button>
                      <button onClick={() => insertMarkdown("1. ")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Nummerierte Liste">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text><text x="2" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text><text x="2" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text></svg>
                      </button>
                      <div className="w-px h-5 bg-border mx-0.5" />
                      <button onClick={() => insertMarkdown("> ")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Zitat">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
                      </button>
                      <button onClick={() => insertMarkdown("`", "`")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Code">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                      </button>
                      <button onClick={() => insertMarkdown(">!", "!<")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Spoiler">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      </button>
                    </div>
                    <Textarea
                      id="community-post-content"
                      placeholder="Text (optional)"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      className="text-sm rounded-t-none resize-y border-border"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
                <Button variant="ghost" size="sm" onClick={handleSaveDraft} className="text-muted-foreground text-xs">
                  Entwurf speichern
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreatePost}
                  disabled={creating || !title.trim() || (postType === "link" && !linkUrl.trim())}
                  className="px-5"
                >
                  {creating ? "Posten..." : "Post"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <ArticleTwoTone className="!text-3xl text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Noch keine Posts in dieser Community.</p>
              <p className="text-xs text-muted-foreground mt-1">Sei der Erste, der etwas teilt.</p>
              {user && isMember && (
                <Button size="sm" className="mt-4 gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
                  <AddTwoTone className="!text-[14px]" /> Ersten Post erstellen
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-border divide-y divide-border bg-card rounded-lg overflow-hidden">
              {posts.map((post) => {
                const score = post.upvotes - post.downvotes;
                return (
                  <article key={post.id} className={`transition-colors hover:bg-accent/30 ${post.pinned ? "bg-primary/[0.02]" : ""}`}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-xs">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={post.profile?.avatar_url || ""} />
                        <AvatarFallback className="text-[8px]">{(post.profile?.display_name || "?").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-muted-foreground">{post.profile?.display_name || "Anonym"}</span>
                      {post.profile?.is_official && <OfficialBadge />}
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-muted-foreground">{formatDate(post.created_at)}</span>
                      {post.pinned && (
                        <span className="flex items-center gap-1 text-muted-foreground ml-auto">
                          <PushPinTwoTone className="!text-xs" />
                          <span className="text-[10px]">Angepinnt</span>
                        </span>
                      )}
                    </div>

                    <Link to={`/forum/${post.id}`} className="block px-4 pb-2">
                      <h3 className="font-semibold text-foreground text-sm leading-snug mb-0.5 hover:text-primary transition-colors">{post.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                    </Link>

                    {post.image_url && (
                      <Link to={`/forum/${post.id}`} className="block px-4 pb-2">
                        <div className="overflow-hidden bg-muted rounded-lg max-h-[300px]">
                          <img src={post.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      </Link>
                    )}

                    <div className="flex items-center gap-1 px-3 pb-2.5">
                      <VoteButton score={score} userVote={post.userVote} onVote={(type) => handleVote(post, type)} vertical={false} size="sm" />
                      <Link
                        to={`/forum/${post.id}`}
                        className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                      >
                        <ChatBubbleTwoTone className="!text-[14px]" /> {post.comment_count}
                      </Link>
                      <button className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors">
                        <ShareTwoTone className="!text-[14px]" /> Teilen
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="hidden xl:block w-[320px] shrink-0 space-y-3">
          <div className="sticky top-[3.5rem] border border-border bg-card rounded-lg overflow-hidden">
            <div
              className="h-12 w-full"
              style={{
                background: community.banner_url
                  ? `url(${community.banner_url}) center/cover`
                  : "hsl(var(--muted))",
              }}
            />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2.5 -mt-8">
                <div className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  <CommunityIcon icon={community.icon} size="md" />
                </div>
                <div className="min-w-0 pt-4">
                  <h2 className="font-bold text-sm text-foreground truncate">{community.name}</h2>
                  <p className="text-[11px] text-muted-foreground truncate">c/{community.slug}</p>
                </div>
              </div>

              {community.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{community.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 py-1">
                <div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{community.member_count.toLocaleString("de-DE")}</p>
                  <p className="text-[10px] text-muted-foreground">Mitglieder</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{community.post_count.toLocaleString("de-DE")}</p>
                  <p className="text-[10px] text-muted-foreground">Posts</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarTodayTwoTone className="!text-sm" />
                  <span>Erstellt am {createdDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <PublicTwoTone className="!text-sm" />
                  <span>Öffentliche Community</span>
                </div>
              </div>

              {user && (
                <Button
                  variant={isMember ? "outline" : "default"}
                  size="sm"
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full gap-1.5 text-xs"
                >
                  {isMember ? (
                    <><PersonRemoveTwoTone className="!text-sm" /> Community verlassen</>
                  ) : (
                    <><PersonAddTwoTone className="!text-sm" /> Community beitreten</>
                  )}
                </Button>
              )}

              {user && isMember && !isCreator && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModMail(true)}
                  className="w-full gap-1.5 text-xs"
                >
                  <MailTwoTone className="!text-sm" /> Nachricht an Mods
                </Button>
              )}

              {isCreator && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Verwaltung</p>
                  <div className="space-y-1">
                    <Link
                      to={`/forum/c/${community.slug}/mod`}
                      className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-accent"
                    >
                      <span className="flex items-center gap-2"><ShieldTwoTone className="!text-sm" /> Mod-Tools</span>
                    </Link>
                    <label className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1.5 hover:bg-accent">
                      <span className="flex items-center gap-2"><CameraAltTwoTone className="!text-sm" /> Icon ändern</span>
                      <span className="text-[10px] text-muted-foreground">{uploadingIcon ? "..." : "Upload"}</span>
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingIcon}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, "icon"); }} />
                    </label>
                    <label className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1.5 hover:bg-accent">
                      <span className="flex items-center gap-2"><ImageTwoTone className="!text-sm" /> Banner ändern</span>
                      <span className="text-[10px] text-muted-foreground">{uploadingBanner ? "..." : "Upload"}</span>
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, "banner"); }} />
                    </label>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs gap-1.5" onClick={() => setShowWidgetEditor(true)}>
                    <MoreHorizTwoTone className="!text-sm" /> Widgets bearbeiten
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Widgets below */}
          <CommunityWidgets widgets={widgets} />

          {/* Widget Editor Dialog */}
          {isCreator && (
            <>
              <CommunityWidgetEditor
                open={showWidgetEditor}
                onClose={() => setShowWidgetEditor(false)}
                communityId={community.id}
                widgets={widgets}
                onUpdated={loadData}
              />
              <CommunityStatusDialog
                open={showStatusDialog}
                onOpenChange={setShowStatusDialog}
                communityId={community.id}
                currentEmoji={community.status_emoji}
                currentText={community.status_text}
                currentIconUrl={community.status_icon_url}
                onUpdated={(emoji, text, iconUrl) =>
                  setCommunity((c: any) => ({ ...c, status_emoji: emoji, status_text: text, status_icon_url: iconUrl }))
                }
              />
            </>
          )}
        </aside>
      </div>

      {/* Mod Mail Dialog */}
      <Dialog open={showModMail && !!user} onOpenChange={setShowModMail}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="font-bold">Nachricht an die Moderation</DialogTitle>
          <p className="text-sm text-muted-foreground -mt-2">Schreibe eine private Nachricht an die Mods von c/{community.slug}.</p>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Betreff *"
              value={modMailSubject}
              onChange={(e) => setModMailSubject(e.target.value.slice(0, 200))}
              maxLength={200}
            />
            <Textarea
              placeholder="Deine Nachricht... *"
              value={modMailContent}
              onChange={(e) => setModMailContent(e.target.value)}
              rows={5}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowModMail(false)}>Abbrechen</Button>
              <Button
                size="sm"
                onClick={handleSendModMail}
                disabled={sendingModMail || !modMailSubject.trim() || !modMailContent.trim()}
              >
                {sendingModMail ? "Senden..." : "Nachricht senden"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityPage;
