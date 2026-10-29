import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { toast } from "sonner";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import PressLogoBadge, { PRESS_LOGOS } from "@/components/PressLogoBadge";
import { XCircle as CancelTwoTone, CheckCircle2 as CheckCircleTwoTone, ShieldCheck as VerifiedUserTwoTone, Eye as VisibilityTwoTone } from "lucide-react";
import { PROFILE_COLUMNS } from "@/lib/profileColumns";

interface Profile { id: string; user_id: string; display_name: string | null; avatar_url: string | null; status: string; }
interface PressProfile { id: string; user_id: string; organization: string | null; verified: boolean; verified_at: string | null; created_at: string; press_logo: string | null; trusted: boolean; profile?: Profile; }

const AdminPress = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pressProfiles, setPressProfiles] = useState<PressProfile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPress, setSelectedPress] = useState<PressProfile | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    const [pressRes, profilesRes] = await Promise.all([supabase.from("press_profiles").select("*").order("created_at", { ascending: false }), supabase.from("profiles").select(PROFILE_COLUMNS)]);
    if (pressRes.data && profilesRes.data) { setPressProfiles(pressRes.data.map((pp: any) => ({ ...pp, profile: profilesRes.data.find((p) => p.user_id === pp.user_id) }))); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleVerify = async (pp: PressProfile, approve: boolean) => {
    setActionLoading(pp.id);
    if (approve) {
      await supabase.from("press_profiles").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", pp.id);
      await supabase.from("user_roles").insert({ user_id: pp.user_id, role: "press" as any }).select();
      toast.success(t("admin.press.pressVerified"));
    } else {
      await supabase.from("press_profiles").update({ verified: false, verified_at: null }).eq("id", pp.id);
      toast.success(t("admin.press.verificationRevoked"));
    }
    await supabase.from("moderation_logs").insert({ admin_id: user!.id, target_type: "press_profile", target_id: pp.user_id, action: approve ? "verify_press" : "revoke_press" });
    try { const { data: { session } } = await supabaseClient.auth.getSession(); if (session?.access_token) { await supabaseClient.functions.invoke("send-press-notification", { body: { user_id: pp.user_id, action: approve ? "verify" : "revoke" } }); } } catch (e) { console.error("Email notification failed:", e); }
    await loadData(); setActionLoading(null);
  };

  const toggleTrusted = async (pp: PressProfile) => {
    setActionLoading(pp.id);
    const newTrusted = !pp.trusted;
    await supabase.from("press_profiles").update({ trusted: newTrusted } as any).eq("id", pp.id);
    await supabase.from("moderation_logs").insert({ admin_id: user!.id, target_type: "press_profile", target_id: pp.user_id, action: newTrusted ? "set_trusted" : "remove_trusted" });
    toast.success(newTrusted ? t("admin.press.trustedSet") : t("admin.press.trustedRemoved"));
    await loadData(); setActionLoading(null);
  };

  const handleLogoChange = async (pp: PressProfile, logoKey: string) => {
    const val = logoKey === "none" ? null : logoKey;
    await supabase.from("press_profiles").update({ press_logo: val }).eq("id", pp.id);
    toast.success(t("admin.press.logoUpdated", "Logo aktualisiert"));
    await loadData();
    // Update selected if open
    if (selectedPress?.id === pp.id) {
      setSelectedPress({ ...pp, press_logo: val });
    }
  };

  const openDetail = async (pp: PressProfile) => {
    setSelectedPress(pp);
    const [articlesRes, reviewsRes] = await Promise.all([supabase.from("articles").select("*").eq("user_id", pp.user_id).order("created_at", { ascending: false }).limit(20), supabase.from("reviews").select("*").eq("user_id", pp.user_id).order("created_at", { ascending: false }).limit(20)]);
    if (articlesRes.data) setArticles(articlesRes.data);
    if (reviewsRes.data) setReviews(reviewsRes.data);
  };

  const pending = pressProfiles.filter((p) => !p.verified);
  const verified = pressProfiles.filter((p) => p.verified);

  const LogoSelector = ({ pp }: { pp: PressProfile }) => (
    <Select value={pp.press_logo || "none"} onValueChange={(v) => handleLogoChange(pp, v)}>
      <SelectTrigger className="h-8 w-[140px] text-xs">
        <SelectValue placeholder={t("admin.press.selectLogo", "Logo wählen")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">{t("admin.press.noLogo", "Kein Logo")}</span>
        </SelectItem>
        {Object.entries(PRESS_LOGOS).map(([key, cfg]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center gap-2">
              {cfg.logoUrl ? (
                <img src={cfg.logoUrl} alt={cfg.label} className="h-4 w-auto max-w-[60px] object-contain" />
              ) : (
                <span className="w-3 h-3 rounded-sm shrink-0 bg-muted-foreground" />
              )}
              {cfg.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">{t("admin.press.title")}</h1><p className="text-muted-foreground text-sm">{t("admin.press.summary", { pending: pending.length, verified: verified.length })}</p></div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">{t("admin.press.pending", { count: pending.length })}</TabsTrigger>
          <TabsTrigger value="verified">{t("admin.press.verified", { count: verified.length })}</TabsTrigger>
          <TabsTrigger value="all">{t("admin.press.all", { count: pressProfiles.length })}</TabsTrigger>
        </TabsList>
        {["pending", "verified", "all"].map((tab) => {
          const list = tab === "pending" ? pending : tab === "verified" ? verified : pressProfiles;
          return (
            <TabsContent key={tab} value={tab}><Card><CardContent className="p-0"><Table><TableHeader><TableRow>
              <TableHead>{t("admin.press.user")}</TableHead><TableHead>{t("admin.press.organization")}</TableHead><TableHead>Logo</TableHead><TableHead>{t("admin.press.status")}</TableHead><TableHead>{t("admin.press.date")}</TableHead><TableHead className="text-right">{t("admin.press.actions")}</TableHead>
            </TableRow></TableHeader><TableBody>
              {list.map((pp) => (
                <TableRow key={pp.id}>
                  <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarImage src={pp.profile?.avatar_url || ""} /><AvatarFallback className="text-xs">{(pp.profile?.display_name || "P").charAt(0)}</AvatarFallback></Avatar><span className="text-sm font-medium">{pp.profile?.display_name || t("admin.press.unnamed")}</span></div></TableCell>
                  <TableCell className="text-sm">{pp.organization || "–"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PressLogoBadge logoKey={pp.press_logo} />
                      {pp.verified && <LogoSelector pp={pp} />}
                    </div>
                  </TableCell>
                  <TableCell>{pp.verified ? <div className="flex gap-1"><Badge className="bg-green-600/20 text-green-400 border-green-600/30">{t("admin.press.verifiedBadge")}</Badge>{pp.trusted && <Badge className="bg-primary/20 text-primary border-primary/30">{t("admin.press.trusted")}</Badge>}</div> : <Badge variant="outline">{t("admin.press.pendingBadge")}</Badge>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(pp.created_at)}</TableCell>
                  <TableCell><div className="flex items-center gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDetail(pp)}><VisibilityTwoTone className="w-4 h-4" /></Button>
                     {!pp.verified ? (
                       <Button size="sm" onClick={() => handleVerify(pp, true)} disabled={actionLoading === pp.id}>{actionLoading === pp.id ? <M3LoadingIndicator size={16} /> : <><CheckCircleTwoTone className="w-4 h-4 mr-1" />{t("admin.press.verify")}</>}</Button>
                     ) : (
                       <>
                         <Button size="icon" variant={pp.trusted ? "default" : "ghost"} className="h-8 w-8" onClick={() => toggleTrusted(pp)} disabled={actionLoading === pp.id} title={pp.trusted ? t("admin.press.removeTrusted") : t("admin.press.markTrusted")}><VerifiedUserTwoTone className={`w-4 h-4 ${pp.trusted ? "" : "text-muted-foreground"}`} /></Button>
                         <Button size="sm" variant="destructive" onClick={() => handleVerify(pp, false)} disabled={actionLoading === pp.id}>{actionLoading === pp.id ? <M3LoadingIndicator size={16} /> : <><CancelTwoTone className="w-4 h-4 mr-1" />{t("admin.press.revoke")}</>}</Button>
                       </>
                     )}
                  </div></TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.press.noEntries")}</TableCell></TableRow>}
            </TableBody></Table></CardContent></Card></TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={!!selectedPress} onOpenChange={() => setSelectedPress(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{selectedPress?.profile?.display_name || t("admin.press.pressProfile")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">{t("admin.press.organization")}</p><p>{selectedPress?.organization || "–"}</p></div>
              <div><p className="text-muted-foreground">{t("admin.press.status")}</p><p>{selectedPress?.verified ? t("admin.press.verifiedBadge") : t("admin.press.pendingBadge")}</p></div>
              <div><p className="text-muted-foreground">Logo</p><div className="mt-1"><PressLogoBadge logoKey={selectedPress?.press_logo} />{!selectedPress?.press_logo && <span className="text-muted-foreground text-xs">–</span>}</div></div>
            </div>
            {selectedPress?.verified && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("admin.press.changeLogo", "Logo zuweisen")}</p>
                <LogoSelector pp={selectedPress} />
              </div>
            )}
            <div><p className="text-sm font-medium mb-2">{t("admin.press.articles", { count: articles.length })}</p>
              {articles.slice(0, 5).map((a) => <div key={a.id} className="text-xs py-1 border-b border-border flex justify-between"><span className="truncate mr-2">{a.title}</span><Badge variant={a.published ? "default" : "outline"} className="text-xs shrink-0">{a.published ? t("admin.press.publishedBadge") : t("admin.press.draftBadge")}</Badge></div>)}
              {articles.length === 0 && <p className="text-xs text-muted-foreground">{t("admin.press.noArticles")}</p>}
            </div>
            <div><p className="text-sm font-medium mb-2">{t("admin.press.reviews", { count: reviews.length })}</p>
              {reviews.slice(0, 5).map((r) => <div key={r.id} className="text-xs py-1 border-b border-border flex justify-between"><span>{r.media_type} – {r.media_id}</span><Badge variant="outline">{r.score}/10</Badge></div>)}
              {reviews.length === 0 && <p className="text-xs text-muted-foreground">{t("admin.press.noReviews")}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPress;
