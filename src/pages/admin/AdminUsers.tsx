import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { toast } from "sonner";
import AdminWarningDialog from "@/components/admin/AdminWarningDialog";
import { useTranslation } from "react-i18next";
import { formatDate, formatDateTime } from "@/lib/locale";
import { Ban as BlockTwoTone, Trash as DeleteTwoTone, Languages as LanguageTwoTone, LockOpen as LockOpenTwoTone, UserCog as ManageAccountsTwoTone, Search as SearchTwoTone, Eye as VisibilityTwoTone, AlertTriangle as WarningAmberTwoTone } from "lucide-react";
import { PROFILE_COLUMNS } from "@/lib/profileColumns";

interface Profile { id: string; user_id: string; display_name: string | null; avatar_url: string | null; status: string; ban_reason: string | null; created_at: string; }
interface UserRole { user_id: string; role: string; }
interface BannedIp { id: string; ip_address: string; reason: string | null; related_user_id: string | null; created_at: string; active: boolean; }

const AdminUsers = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [warningTarget, setWarningTarget] = useState<Profile | null>(null);
  
  // Ban dialog
  const [banTarget, setBanTarget] = useState<Profile | null>(null);
  const [banReason, setBanReason] = useState("");
  const [alsoBlockIp, setAlsoBlockIp] = useState(false);
  const [banLoading, setBanLoading] = useState(false);

  // Banned IPs tab
  const [bannedIps, setBannedIps] = useState<BannedIp[]>([]);
  const [newBanIp, setNewBanIp] = useState("");
  const [newBanIpReason, setNewBanIpReason] = useState("");

  const loadData = useCallback(async () => {
    const [profilesRes, rolesRes, ipsRes, banReasonsRes] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("banned_ips").select("*").order("created_at", { ascending: false }),
      // ban_reason is admin-only and served through a dedicated RPC
      supabase.rpc("admin_list_ban_reasons"),
    ]);
    if (profilesRes.data) {
      const reasons = new Map<string, string | null>(
        ((banReasonsRes.data as { user_id: string; ban_reason: string | null }[] | null) || []).map(
          (r) => [r.user_id, r.ban_reason]
        )
      );
      setProfiles(
        (profilesRes.data as any[]).map((p) => ({ ...p, ban_reason: reasons.get(p.user_id) ?? null })) as any
      );
    }
    if (rolesRes.data) setRoles(rolesRes.data);
    if (ipsRes.data) setBannedIps(ipsRes.data as any);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const logModeration = async (targetId: string, action: string, reason?: string) => {
    await supabase.from("moderation_logs").insert({ admin_id: user!.id, target_type: "user", target_id: targetId, action, reason });
  };

  const openBanDialog = (profile: Profile) => {
    setBanTarget(profile);
    setBanReason(profile.ban_reason || "");
    setAlsoBlockIp(false);
  };

  const handleBanConfirm = async () => {
    if (!banTarget) return;
    setBanLoading(true);
    const isBanning = banTarget.status !== "banned";

    if (isBanning) {
      await supabase.from("profiles").update({ status: "banned", ban_reason: banReason || null }).eq("id", banTarget.id);
      await logModeration(banTarget.user_id, "ban", banReason);

      if (alsoBlockIp) {
        // Get user IP via edge function
        try {
          await supabase.from("banned_ips").upsert({
            ip_address: "pending-" + banTarget.user_id.slice(0, 8),
            reason: banReason || `Banned with user ${banTarget.display_name}`,
            banned_by: user!.id,
            related_user_id: banTarget.user_id,
            active: true,
          }, { onConflict: "ip_address" });
        } catch (e) {
          console.error("IP ban error:", e);
        }
      }

      toast.success(t("admin.users.userBanned"));
    } else {
      await supabase.from("profiles").update({ status: "active", ban_reason: null }).eq("id", banTarget.id);
      await logModeration(banTarget.user_id, "unban");
      toast.success(t("admin.users.userUnbanned"));
    }

    setBanTarget(null);
    setBanReason("");
    setBanLoading(false);
    await loadData();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    const existingRoles = roles.filter((r) => r.user_id === userId);
    const hasRole = existingRoles.some((r) => r.role === newRole);
    if (!hasRole) {
      await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      await logModeration(userId, `role_add_${newRole}`);
      toast.success(t("admin.users.roleAdded", { role: newRole }));
    }
    await loadData(); setActionLoading(null);
  };

  const openDetail = async (profile: Profile) => {
    setSelectedUser(profile);
    const [reviewsRes, commentsRes] = await Promise.all([
      supabase.from("reviews").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("comments").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }).limit(10),
    ]);
    if (reviewsRes.data) setReviews(reviewsRes.data);
    if (commentsRes.data) setComments(commentsRes.data);
  };

  const handleAddIpBan = async () => {
    if (!newBanIp.trim()) return;
    const { error } = await supabase.from("banned_ips").insert({
      ip_address: newBanIp.trim(),
      reason: newBanIpReason || null,
      banned_by: user!.id,
      active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("ban.ipBanAdded"));
    setNewBanIp("");
    setNewBanIpReason("");
    await loadData();
  };

  const handleRemoveIpBan = async (id: string) => {
    await supabase.from("banned_ips").delete().eq("id", id);
    toast.success(t("ban.ipBanRemoved"));
    await loadData();
  };

  const getUserRoles = (userId: string) => roles.filter((r) => r.user_id === userId);
  const filtered = profiles.filter((p) => !search || p.display_name?.toLowerCase().includes(search.toLowerCase()) || p.user_id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.users.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.users.totalUsers", { count: profiles.length })}</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{t("admin.users.title")}</TabsTrigger>
          <TabsTrigger value="ip-bans">{t("ban.bannedIps")} ({bannedIps.filter(b => b.active).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-sm">
            <SearchTwoTone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.users.searchPlaceholder")} className="pl-9" />
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("admin.users.user")}</TableHead><TableHead>{t("admin.users.userId")}</TableHead>
                <TableHead>{t("admin.users.role")}</TableHead><TableHead>{t("admin.users.status")}</TableHead>
                <TableHead>{t("admin.users.registered")}</TableHead><TableHead className="text-right">{t("admin.users.actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((profile) => {
                  const userRoles = getUserRoles(profile.user_id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarImage src={profile.avatar_url || ""} /><AvatarFallback className="text-xs">{(profile.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback></Avatar><span className="font-medium text-sm">{profile.display_name || t("admin.users.unnamed")}</span></div></TableCell>
                      <TableCell><code className="text-xs text-muted-foreground">{profile.user_id.slice(0, 8)}...</code></TableCell>
                      <TableCell><div className="flex gap-1">{userRoles.map((r) => <Badge key={r.role} variant="secondary" className="capitalize text-xs">{r.role}</Badge>)}</div></TableCell>
                      <TableCell>
                        {profile.status === "banned" ? (
                          <Badge variant="destructive" title={profile.ban_reason || undefined}>{t("admin.users.banned")}</Badge>
                        ) : (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30">{t("admin.users.active")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(profile.created_at)}</TableCell>
                      <TableCell><div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDetail(profile)}><VisibilityTwoTone className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setWarningTarget(profile)} title={t("warnings.sendWarning", "Warnung senden")}><WarningAmberTwoTone className="w-4 h-4 text-yellow-500" /></Button>
                        <Select onValueChange={(val) => handleRoleChange(profile.user_id, val)}>
                          <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent [&>svg]:hidden"><ManageAccountsTwoTone className="w-4 h-4 mx-auto text-muted-foreground" /></SelectTrigger>
                          <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="press">{t("admin.settings.pressRole")}</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openBanDialog(profile)} disabled={actionLoading === profile.id}>
                          {actionLoading === profile.id ? <M3LoadingIndicator size={16} /> : profile.status === "banned" ? <LockOpenTwoTone className="w-4 h-4 text-green-400" /> : <BlockTwoTone className="w-4 h-4 text-destructive" />}
                        </Button>
                      </div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ip-bans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LanguageTwoTone className="w-5 h-5 text-primary" />
                {t("ban.addIpBan")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder={t("ban.ipAddress")} value={newBanIp} onChange={(e) => setNewBanIp(e.target.value)} className="max-w-[200px]" />
                <Input placeholder={t("ban.banReason")} value={newBanIpReason} onChange={(e) => setNewBanIpReason(e.target.value)} className="flex-1" />
                <Button onClick={handleAddIpBan} disabled={!newBanIp.trim()}>{t("ban.addIpBan")}</Button>
              </div>
            </CardContent>
          </Card>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("ban.ipAddress")}</TableHead>
                <TableHead>{t("ban.reason")}</TableHead>
                <TableHead>{t("admin.users.registered")}</TableHead>
                <TableHead className="text-right">{t("admin.users.actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {bannedIps.filter(b => b.active).map((ban) => (
                  <TableRow key={ban.id}>
                    <TableCell><code className="text-sm">{ban.ip_address}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ban.reason || "–"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(ban.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRemoveIpBan(ban.id)}>
                        <DeleteTwoTone className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {bannedIps.filter(b => b.active).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Keine gesperrten IPs</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Ban Dialog */}
      <Dialog open={!!banTarget} onOpenChange={(open) => !open && setBanTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {banTarget?.status === "banned" ? (
                <><LockOpenTwoTone className="w-5 h-5 text-green-400" /> {t("ban.unbanUser")}</>
              ) : (
                <><BlockTwoTone className="w-5 h-5 text-destructive" /> {t("ban.banUser")}</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={banTarget?.avatar_url || ""} />
                <AvatarFallback>{(banTarget?.display_name || "U").charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{banTarget?.display_name || t("admin.users.unnamed")}</span>
            </div>

            {banTarget?.status !== "banned" && (
              <>
                <div className="space-y-2">
                  <Label>{t("ban.banReason")}</Label>
                  <Textarea
                    placeholder={t("ban.banReasonPlaceholder")}
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{t("ban.alsoBlockIp")}</p>
                    <p className="text-xs text-muted-foreground">{t("ban.ipBanNote")}</p>
                  </div>
                  <Switch checked={alsoBlockIp} onCheckedChange={setAlsoBlockIp} />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>{t("common.cancel")}</Button>
            <Button
              variant={banTarget?.status === "banned" ? "default" : "destructive"}
              onClick={handleBanConfirm}
              disabled={banLoading}
            >
              {banLoading && <M3LoadingIndicator size={16} className="mr-2" />}
              {banTarget?.status === "banned" ? t("ban.confirmUnban") : t("ban.confirmBan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-3"><Avatar className="h-10 w-10"><AvatarImage src={selectedUser?.avatar_url || ""} /><AvatarFallback>{(selectedUser?.display_name || "U").charAt(0)}</AvatarFallback></Avatar>{selectedUser?.display_name || t("admin.users.unnamed")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">{t("admin.users.userId")}</p><code className="text-xs">{selectedUser?.user_id}</code></div>
              <div><p className="text-muted-foreground">{t("admin.users.status")}</p><p>{selectedUser?.status === "banned" ? t("admin.users.banned") : t("admin.users.active")}</p></div>
              <div><p className="text-muted-foreground">{t("admin.users.registered")}</p><p>{selectedUser && formatDate(selectedUser.created_at)}</p></div>
              <div><p className="text-muted-foreground">{t("admin.users.roles")}</p><div className="flex gap-1 mt-0.5">{selectedUser && getUserRoles(selectedUser.user_id).map((r) => <Badge key={r.role} variant="secondary" className="capitalize text-xs">{r.role}</Badge>)}</div></div>
            </div>
            {selectedUser?.ban_reason && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs font-medium text-destructive mb-1">{t("ban.reason")}</p>
                <p className="text-sm">{selectedUser.ban_reason}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-2">{t("admin.users.recentReviews", { count: reviews.length })}</p>
              {reviews.length === 0 && <p className="text-xs text-muted-foreground">{t("admin.users.noReviews")}</p>}
              {reviews.slice(0, 5).map((r) => <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border"><span>{r.media_type} – {r.media_id}</span><Badge variant="outline">{r.score}/10</Badge></div>)}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("admin.users.recentComments", { count: comments.length })}</p>
              {comments.length === 0 && <p className="text-xs text-muted-foreground">{t("admin.users.noComments")}</p>}
              {comments.slice(0, 5).map((c) => <div key={c.id} className="text-xs py-1 border-b border-border"><p className="truncate">{c.content}</p><p className="text-muted-foreground">{formatDateTime(c.created_at)}</p></div>)}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {warningTarget && (
        <AdminWarningDialog
          open={!!warningTarget}
          onOpenChange={(open) => !open && setWarningTarget(null)}
          targetUserId={warningTarget.user_id}
          targetDisplayName={warningTarget.display_name}
        />
      )}
    </div>
  );
};

export default AdminUsers;
