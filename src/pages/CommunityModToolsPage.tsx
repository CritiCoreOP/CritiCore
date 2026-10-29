import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Link, useNavigate } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/locale";
import CommunityIcon from "@/components/forum/CommunityIcon";
import FlairManager from "@/components/forum/FlairManager";
import { ShieldCheck as AdminPanelSettingsTwoTone, ArrowLeft as ArrowBackTwoTone, Ban as BlockTwoTone, CheckCircle2 as CheckCircleTwoTone, Trash as DeleteTwoTone, FileText as DescriptionTwoTone, Flag as FlagTwoTone, Gavel as GavelTwoTone, UserMinus as PersonRemoveTwoTone, Search as SearchTwoTone, Settings as SettingsTwoTone, Shield as ShieldTwoTone, EyeOff as VisibilityOffTwoTone, Mail as MailTwoTone, Users as PeopleTwoTone, Pin as PushPinTwoTone, ListPlus as QueueTwoTone } from "lucide-react";

type ModSection = "queue" | "mod-mail" | "members" | "mod-log" | "reported" | "settings" | "flairs";

const CommunityModToolsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [section, setSection] = useState<ModSection>("queue");

  // Queue data
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [modLogs, setModLogs] = useState<any[]>([]);
  const [modMail, setModMail] = useState<any[]>([]);
  const [selectedMail, setSelectedMail] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadCommunity = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const { data: comm } = await supabase
      .from("forum_communities")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!comm) { setLoading(false); return; }
    setCommunity(comm);

    if (user && comm.created_by === user.id) {
      setIsCreator(true);
    }
    setLoading(false);
  }, [slug, user]);

  const loadPosts = useCallback(async () => {
    if (!community) return;
    const { data } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("community_id", community.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) {
      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
        : { data: [] };
      setPosts(data.map((p: any) => ({
        ...p,
        profile: profiles?.find((pr: any) => pr.user_id === p.user_id),
      })));
    }
  }, [community]);

  const loadMembers = useCallback(async () => {
    if (!community) return;
    const { data } = await supabase
      .from("forum_community_members")
      .select("*")
      .eq("community_id", community.id)
      .order("joined_at", { ascending: false });
    if (data) {
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url, username").in("user_id", userIds)
        : { data: [] };
      setMembers(data.map((m: any) => ({
        ...m,
        profile: profiles?.find((pr: any) => pr.user_id === m.user_id),
      })));
    }
  }, [community]);

  const loadReports = useCallback(async () => {
    if (!community) return;
    // Get post IDs for this community
    const postIds = posts.map((p) => p.id);
    if (postIds.length === 0) { setReports([]); return; }
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("target_type", "post")
      .in("target_id", postIds)
      .order("created_at", { ascending: false })
      .limit(50);
    setReports(data || []);
  }, [community, posts]);

  const loadModLogs = useCallback(async () => {
    if (!community) return;
    const { data } = await supabase
      .from("moderation_logs")
      .select("*")
      .eq("target_type", "community_post")
      .order("created_at", { ascending: false })
      .limit(100);
    setModLogs(data || []);
  }, [community]);

  const loadModMail = useCallback(async () => {
    if (!community) return;
    const { data } = await supabase
      .from("forum_mod_mail" as any)
      .select("*")
      .eq("community_id", community.id)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) {
      const raw = data as any[];
      const senderIds = [...new Set(raw.map((m: any) => m.sender_id))];
      const { data: profiles } = senderIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url, username").in("user_id", senderIds)
        : { data: [] };
      // Load reply counts
      const mailIds = raw.map((m: any) => m.id);
      let replies: any[] = [];
      if (mailIds.length > 0) {
        const { data: r } = await supabase
          .from("forum_mod_mail" as any)
          .select("parent_id")
          .in("parent_id", mailIds);
        replies = r || [];
      }
      setModMail(raw.map((m: any) => ({
        ...m,
        profile: profiles?.find((p: any) => p.user_id === m.sender_id),
        reply_count: replies.filter((r: any) => r.parent_id === m.id).length,
      })));
    }
  }, [community]);

  useEffect(() => { loadCommunity(); }, [loadCommunity]);

  useEffect(() => {
    if (!community || !isCreator) return;
    loadPosts();
    loadMembers();
    loadModMail();
  }, [community, isCreator, loadPosts, loadMembers, loadModMail]);

  useEffect(() => {
    if (section === "reported" && posts.length > 0) loadReports();
    if (section === "mod-log") loadModLogs();
  }, [section, posts, loadReports, loadModLogs]);

  const logMod = async (action: string, targetId: string) => {
    if (!user) return;
    await supabase.from("moderation_logs").insert({
      admin_id: user.id,
      target_type: "community_post",
      target_id: targetId,
      action,
    });
  };

  const handleDeletePost = async (postId: string) => {
    setActionLoading(postId);
    await supabase.from("forum_posts").delete().eq("id", postId);
    await supabase.from("forum_communities").update({ post_count: Math.max(0, (community?.post_count || 1) - 1) }).eq("id", community.id);
    await logMod("delete_post", postId);
    toast.success("Post gelöscht.");
    loadPosts();
    setActionLoading(null);
  };

  const handlePinPost = async (post: any) => {
    setActionLoading(post.id);
    await supabase.from("forum_posts").update({ pinned: !post.pinned }).eq("id", post.id);
    await logMod(post.pinned ? "unpin_post" : "pin_post", post.id);
    toast.success(post.pinned ? "Post entpinnt." : "Post angepinnt.");
    loadPosts();
    setActionLoading(null);
  };

  const handleRemoveMember = async (member: any) => {
    setActionLoading(member.id);
    await supabase.from("forum_community_members").delete().eq("id", member.id);
    await supabase.from("forum_communities").update({ member_count: Math.max(0, (community?.member_count || 1) - 1) }).eq("id", community.id);
    await logMod("remove_member", member.user_id);
    toast.success("Mitglied entfernt.");
    loadMembers();
    setActionLoading(null);
  };

  const handleResolveReport = async (reportId: string) => {
    setActionLoading(reportId);
    await supabase.from("reports").update({ status: "resolved", resolved_by: user?.id, resolved_at: new Date().toISOString() }).eq("id", reportId);
    toast.success("Report erledigt.");
    loadReports();
    setActionLoading(null);
  };

  const loadMailThread = async (mail: any) => {
    setSelectedMail(mail);
    setReplyContent("");
    const { data } = await supabase
      .from("forum_mod_mail" as any)
      .select("*")
      .eq("parent_id", mail.id)
      .order("created_at", { ascending: true });
    if (data) {
      const senderIds = [...new Set((data as any[]).map((r: any) => r.sender_id))];
      const { data: profiles } = senderIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", senderIds)
        : { data: [] };
      setSelectedMail({
        ...mail,
        replies: (data as any[]).map((r: any) => ({
          ...r,
          profile: profiles?.find((p: any) => p.user_id === r.sender_id) || mail.profile,
        })),
      });
    }
  };

  const handleReplyMail = async () => {
    if (!user || !selectedMail || !replyContent.trim()) return;
    setReplying(true);
    await supabase.from("forum_mod_mail" as any).insert({
      community_id: community.id,
      sender_id: user.id,
      subject: `Re: ${selectedMail.subject}`,
      content: replyContent.trim(),
      is_mod_reply: true,
      parent_id: selectedMail.id,
    } as any);
    toast.success("Antwort gesendet.");
    setReplyContent("");
    await loadMailThread(selectedMail);
    await loadModMail();
    setReplying(false);
  };

  const handleCloseMailThread = async (mailId: string) => {
    await supabase.from("forum_mod_mail" as any).update({ status: "closed" } as any).eq("id", mailId);
    toast.success("Thread geschlossen.");
    setSelectedMail(null);
    loadModMail();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!community || !isCreator) return (
    <div className="text-center py-16">
      <ShieldTwoTone className="!text-5xl text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground font-medium">Kein Zugriff auf die Mod-Tools.</p>
      <Link to="/forum"><Button variant="outline" className="mt-4">Zurück zum Forum</Button></Link>
    </div>
  );

  const openMailCount = modMail.filter((m) => m.status === "open").length;

  const sidebarSections = [
    {
      label: "ÜBERSICHT",
      items: [
        { key: "queue" as const, label: "Warteschlange", icon: <QueueTwoTone className="!text-[18px]" />, count: posts.length },
        { key: "mod-mail" as const, label: "Mod Mail", icon: <MailTwoTone className="!text-[18px]" />, count: openMailCount },
        { key: "reported" as const, label: "Gemeldet", icon: <FlagTwoTone className="!text-[18px]" />, count: reports.filter((r) => r.status === "pending").length },
      ],
    },
    {
      label: "MODERATION",
      items: [
        { key: "members" as const, label: "Mods & Mitglieder", icon: <PeopleTwoTone className="!text-[18px]" />, count: members.length },
        { key: "mod-log" as const, label: "Mod-Log", icon: <GavelTwoTone className="!text-[18px]" /> },
      ],
    },
    {
      label: "EINSTELLUNGEN",
      items: [
        { key: "flairs" as const, label: "Flairs", icon: <AdminPanelSettingsTwoTone className="!text-[18px]" /> },
        { key: "settings" as const, label: "Einstellungen", icon: <SettingsTwoTone className="!text-[18px]" /> },
      ],
    },
  ];

  const filteredPosts = posts.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMembers = members.filter((m) =>
    !search || m.profile?.display_name?.toLowerCase().includes(search.toLowerCase()) || m.profile?.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="-mx-4 lg:-mx-6 -mt-4 min-h-[80vh]">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate(`/forum/c/${slug}`)}>
          <ArrowBackTwoTone className="!text-[18px]" /> Mod-Tools verlassen
        </Button>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-6 h-6 rounded-md overflow-hidden bg-secondary flex items-center justify-center">
            <CommunityIcon icon={community.icon} size="sm" />
          </div>
          <span className="text-sm font-semibold text-foreground">c/{community.slug}</span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border bg-card/50 min-h-[calc(100vh-8rem)] p-3 space-y-5 hidden md:block">
          {/* Search */}
          <div className="relative">
            <SearchTwoTone className="absolute left-2.5 top-1/2 -translate-y-1/2 !text-[16px] text-muted-foreground" />
            <Input
              placeholder="Suche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-secondary/30"
            />
          </div>

          {sidebarSections.map((sec) => (
            <div key={sec.label}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2">{sec.label}</p>
              <div className="space-y-0.5">
                {sec.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSection(item.key)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                      section === item.key
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {"count" in item && item.count !== undefined && (
                      <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                        section === item.key ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-5">
          {/* Mobile section tabs */}
          <div className="md:hidden mb-4 overflow-x-auto">
            <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg w-fit">
              {[
                { key: "queue" as const, label: "Queue" },
                { key: "mod-mail" as const, label: "Mail" },
                { key: "reported" as const, label: "Reports" },
                { key: "members" as const, label: "Mitglieder" },
                { key: "mod-log" as const, label: "Log" },
                { key: "settings" as const, label: "Settings" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSection(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    section === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Queue ── */}
          {section === "queue" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Warteschlange</h2>
                <p className="text-sm text-muted-foreground">Alle Posts in deiner Community verwalten.</p>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🐱</div>
                  <p className="font-semibold text-foreground">Queue ist leer.</p>
                  <p className="text-sm text-muted-foreground">Alles sauber!</p>
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-24">Score</TableHead>
                        <TableHead className="w-32">Datum</TableHead>
                        <TableHead className="w-36 text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPosts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={post.profile?.avatar_url || ""} />
                                <AvatarFallback className="text-[9px]">{(post.profile?.display_name || "?")[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{post.title}</p>
                                <p className="text-[11px] text-muted-foreground truncate">von {post.profile?.display_name || "Anonym"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {post.pinned ? (
                              <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">Gepinnt</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Normal</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-bold tabular-nums ${
                              post.upvotes - post.downvotes > 0 ? "text-green-500" : post.upvotes - post.downvotes < 0 ? "text-destructive" : "text-muted-foreground"
                            }`}>
                              {post.upvotes - post.downvotes}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(post.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title={post.pinned ? "Entpinnen" : "Anpinnen"}
                                onClick={() => handlePinPost(post)}
                                disabled={actionLoading === post.id}
                              >
                                <PushPinTwoTone className={`!text-[16px] ${post.pinned ? "text-primary" : ""}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                title="Löschen"
                                onClick={() => handleDeletePost(post.id)}
                                disabled={actionLoading === post.id}
                              >
                                <DeleteTwoTone className="!text-[16px]" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* ── Mod Mail ── */}
          {section === "mod-mail" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Mod Mail</h2>
                <p className="text-sm text-muted-foreground">Nachrichten von Community-Mitgliedern an die Moderation.</p>
              </div>

              {selectedMail ? (
                /* Thread view */
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setSelectedMail(null)}>
                    <ArrowBackTwoTone className="!text-[16px]" /> Zurück zur Übersicht
                  </Button>

                  <Card>
                    <CardContent className="p-5 space-y-4">
                      {/* Original message */}
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={selectedMail.profile?.avatar_url || ""} />
                          <AvatarFallback className="text-xs">{(selectedMail.profile?.display_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{selectedMail.profile?.display_name || "Anonym"}</span>
                            <Badge variant={selectedMail.status === "open" ? "default" : "secondary"} className="text-[10px]">
                              {selectedMail.status === "open" ? "Offen" : "Geschlossen"}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground ml-auto">{formatDateTime(selectedMail.created_at)}</span>
                          </div>
                          <h3 className="font-bold text-foreground mt-1">{selectedMail.subject}</h3>
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">{selectedMail.content}</p>
                        </div>
                      </div>

                      {/* Replies */}
                      {selectedMail.replies?.length > 0 && (
                        <div className="border-t border-border pt-4 space-y-4">
                          {selectedMail.replies.map((reply: any) => (
                            <div key={reply.id} className={`flex items-start gap-3 ${reply.is_mod_reply ? "pl-4 border-l-2 border-primary/30" : ""}`}>
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={reply.profile?.avatar_url || ""} />
                                <AvatarFallback className="text-[10px]">{(reply.profile?.display_name || "?")[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold">{reply.profile?.display_name || "Mod"}</span>
                                  {reply.is_mod_reply && <Badge className="text-[9px] bg-primary/15 text-primary border-primary/20">Mod</Badge>}
                                  <span className="text-[10px] text-muted-foreground">{formatDateTime(reply.created_at)}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      {selectedMail.status === "open" && (
                        <div className="border-t border-border pt-4 space-y-3">
                          <Textarea
                            placeholder="Antwort schreiben..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => handleCloseMailThread(selectedMail.id)}>
                              Thread schließen
                            </Button>
                            <Button size="sm" className="text-xs gap-1" onClick={handleReplyMail} disabled={replying || !replyContent.trim()}>
                              {replying ? "Senden..." : "Antworten"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : modMail.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">📬</div>
                  <p className="font-semibold text-foreground">Keine Mod Mail.</p>
                  <p className="text-sm text-muted-foreground">Noch keine Nachrichten eingegangen.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {modMail.map((mail) => (
                    <Card
                      key={mail.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${mail.status === "open" ? "border-primary/20" : "opacity-60"}`}
                      onClick={() => loadMailThread(mail)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={mail.profile?.avatar_url || ""} />
                            <AvatarFallback className="text-[10px]">{(mail.profile?.display_name || "?")[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{mail.profile?.display_name || "Anonym"}</span>
                              <Badge variant={mail.status === "open" ? "default" : "secondary"} className="text-[10px]">
                                {mail.status === "open" ? "Offen" : "Geschlossen"}
                              </Badge>
                              {mail.reply_count > 0 && (
                                <span className="text-[10px] text-muted-foreground">{mail.reply_count} Antwort{mail.reply_count > 1 ? "en" : ""}</span>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(mail.created_at)}</span>
                            </div>
                            <h4 className="text-sm font-medium text-foreground mt-0.5 truncate">{mail.subject}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{mail.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Reported ── */}
          {section === "reported" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Gemeldete Inhalte</h2>
                <p className="text-sm text-muted-foreground">Von Nutzern gemeldete Posts überprüfen.</p>
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="font-semibold text-foreground">Keine offenen Meldungen.</p>
                  <p className="text-sm text-muted-foreground">Alles in Ordnung!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => {
                    const post = posts.find((p) => p.id === report.target_id);
                    return (
                      <Card key={report.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={report.status === "pending" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                                  {report.status === "pending" ? "Offen" : "Erledigt"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Grund: {report.reason}</span>
                              </div>
                              {post && <p className="text-sm font-medium truncate">{post.title}</p>}
                              {report.description && <p className="text-xs text-muted-foreground mt-1">{report.description}</p>}
                              <p className="text-[11px] text-muted-foreground mt-1">{formatDateTime(report.created_at)}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {report.status === "pending" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => handleResolveReport(report.id)}
                                    disabled={actionLoading === report.id}
                                  >
                                    <CheckCircleTwoTone className="!text-[14px]" /> Erledigt
                                  </Button>
                                  {post && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => { handleDeletePost(post.id); handleResolveReport(report.id); }}
                                      disabled={actionLoading === report.id}
                                    >
                                      <DeleteTwoTone className="!text-[14px]" /> Löschen
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Members ── */}
          {section === "members" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Mods & Mitglieder</h2>
                <p className="text-sm text-muted-foreground">{members.length} Mitglieder in dieser Community.</p>
              </div>

              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mitglied</TableHead>
                      <TableHead className="w-28">Rolle</TableHead>
                      <TableHead className="w-32">Beigetreten</TableHead>
                      <TableHead className="w-24 text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={member.profile?.avatar_url || ""} />
                              <AvatarFallback className="text-[10px]">{(member.profile?.display_name || "?")[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{member.profile?.display_name || "Anonym"}</p>
                              {member.profile?.username && <p className="text-[11px] text-muted-foreground">@{member.profile.username}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.role === "creator" ? "default" : "secondary"} className="text-[10px] capitalize">
                            {member.role === "creator" ? "Ersteller" : member.role === "moderator" ? "Moderator" : "Mitglied"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(member.joined_at)}</TableCell>
                        <TableCell className="text-right">
                          {member.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="Entfernen"
                              onClick={() => handleRemoveMember(member)}
                              disabled={actionLoading === member.id}
                            >
                              <PersonRemoveTwoTone className="!text-[16px]" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Keine Mitglieder gefunden.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ── Mod Log ── */}
          {section === "mod-log" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Mod-Log</h2>
                <p className="text-sm text-muted-foreground">Alle Moderationsaktionen in dieser Community.</p>
              </div>

              {modLogs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">📋</div>
                  <p className="font-semibold text-foreground">Keine Einträge.</p>
                  <p className="text-sm text-muted-foreground">Noch keine Moderationsaktionen durchgeführt.</p>
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aktion</TableHead>
                        <TableHead>Ziel-ID</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge
                              variant={log.action.includes("delete") ? "destructive" : log.action.includes("pin") ? "default" : "outline"}
                              className="text-[10px] capitalize"
                            >
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs text-muted-foreground">{log.target_id.slice(0, 8)}...</code>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs text-muted-foreground">{log.admin_id.slice(0, 8)}...</code>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* ── Flairs ── */}
          {section === "flairs" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Flairs verwalten</h2>
                <p className="text-sm text-muted-foreground">Post- und User-Flairs für c/{community.slug}.</p>
              </div>
              <FlairManager communityId={community.id} userId={user!.id} />
            </div>
          )}

          {/* ── Settings ── */}
          {section === "settings" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Community-Einstellungen</h2>
                <p className="text-sm text-muted-foreground">Grundeinstellungen für c/{community.slug}.</p>
              </div>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                      <Input value={community.name} readOnly className="bg-secondary/30" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Slug</label>
                      <Input value={community.slug} readOnly className="bg-secondary/30" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Beschreibung</label>
                    <Input value={community.description || ""} readOnly className="bg-secondary/30" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center p-3 rounded-xl bg-secondary/30">
                      <p className="text-lg font-bold text-foreground">{community.member_count}</p>
                      <p className="text-[10px] text-muted-foreground">Mitglieder</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-secondary/30">
                      <p className="text-lg font-bold text-foreground">{community.post_count}</p>
                      <p className="text-[10px] text-muted-foreground">Posts</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-secondary/30">
                      <p className="text-lg font-bold text-foreground">{community.is_official ? "Ja" : "Nein"}</p>
                      <p className="text-[10px] text-muted-foreground">Offiziell</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* Right insights panel (desktop only) */}
        <aside className="hidden lg:block w-72 shrink-0 border-l border-border bg-card/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Insights & Aktivität</h3>
          </div>
          <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>

          <Badge variant="outline" className="text-[10px]">c/{community.slug}</Badge>

          <div className="space-y-3 pt-2">
            {[
              { label: "Posts (gesamt)", value: community.post_count },
              { label: "Mitglieder (gesamt)", value: community.member_count },
              { label: "Offene Mod Mail", value: openMailCount },
              { label: "Offene Reports", value: reports.filter((r) => r.status === "pending").length },
              { label: "Mod-Aktionen", value: modLogs.length },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="text-sm font-bold text-foreground tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CommunityModToolsPage;
