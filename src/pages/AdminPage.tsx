import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@/lib/locale-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Shield,
  FileCheck,
  Ban,
  Unlock,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Footer from "@/components/Footer";
import { PROFILE_COLUMNS } from "@/lib/profileColumns";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

interface PressProfile {
  id: string;
  user_id: string;
  organization: string | null;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  profile?: Profile;
}

interface ModerationLog {
  id: string;
  admin_id: string;
  target_type: string;
  target_id: string;
  action: string;
  reason: string | null;
  created_at: string;
}

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pressProfiles, setPressProfiles] = useState<PressProfile[]>([]);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      checkAdminRole();
    }
  }, [user, authLoading, navigate]);

  const checkAdminRole = async () => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();

      if (data) {
        setIsAdmin(true);
        loadData();
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Error checking admin role:", err);
    } finally {
      setCheckingRole(false);
    }
  };

  const loadData = useCallback(async () => {
    const [profilesRes, pressRes, logsRes] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).order("created_at", { ascending: false }),
      supabase.from("press_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("moderation_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (pressRes.data) {
      // Enrich press profiles with user profile data
      const enriched = pressRes.data.map((pp) => ({
        ...pp,
        profile: profilesRes.data?.find((p) => p.user_id === pp.user_id),
      }));
      setPressProfiles(enriched);
    }
    if (logsRes.data) setModerationLogs(logsRes.data);
  }, []);

  const logModeration = async (targetType: string, targetId: string, action: string, reason?: string) => {
    await supabase.from("moderation_logs").insert({
      admin_id: user!.id,
      target_type: targetType,
      target_id: targetId,
      action,
      reason: reason || null,
    });
  };

  const handleBanUser = async (profile: Profile) => {
    setActionLoading(profile.id);
    const newStatus = profile.status === "banned" ? "active" : "banned";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", profile.id);
    await logModeration("user", profile.user_id, newStatus === "banned" ? "ban" : "unban");
    await loadData();
    setActionLoading(null);
  };

  const handleVerifyPress = async (pp: PressProfile) => {
    setActionLoading(pp.id);
    const newVerified = !pp.verified;
    await supabase
      .from("press_profiles")
      .update({
        verified: newVerified,
        verified_at: newVerified ? new Date().toISOString() : null,
      })
      .eq("id", pp.id);
    await logModeration("press_profile", pp.user_id, newVerified ? "verify_press" : "revoke_press");
    await loadData();
    setActionLoading(null);
  };

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center pt-16">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-xl font-bold">Zugriff verweigert</h2>
              <p className="text-muted-foreground">Du hast keine Berechtigung, auf das Admin-Dashboard zuzugreifen.</p>
              <Button onClick={() => navigate("/")} variant="outline">
                Zur Startseite
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  const statusBadge = (status: string) => {
    if (status === "banned") return <Badge variant="destructive">Gesperrt</Badge>;
    return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Aktiv</Badge>;
  };

  return (
    <>
      <div className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin-Dashboard</h1>
            <p className="text-muted-foreground">User-Verwaltung, Moderation und Presse-Verifizierung</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Benutzer
                </CardDescription>
                <CardTitle className="text-2xl">{profiles.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4" /> Presse-Anträge
                </CardDescription>
                <CardTitle className="text-2xl">{pressProfiles.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Mod-Aktionen
                </CardDescription>
                <CardTitle className="text-2xl">{moderationLogs.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="scrollbar-none mb-4 w-full justify-start overflow-x-auto overflow-y-hidden flex-nowrap">
              <TabsTrigger value="users">Benutzer</TabsTrigger>
              <TabsTrigger value="press">Presse</TabsTrigger>
              <TabsTrigger value="logs">Mod-Log</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-3">
              {profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={profile.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {(profile.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{profile.display_name || "Unbenannt"}</p>
                          <p className="text-xs text-muted-foreground truncate">{profile.user_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-start">
                        {statusBadge(profile.status)}
                        <Button
                          size="sm"
                          variant={profile.status === "banned" ? "outline" : "destructive"}
                          onClick={() => handleBanUser(profile)}
                          disabled={actionLoading === profile.id}
                        >
                          {actionLoading === profile.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : profile.status === "banned" ? (
                            <>
                              <Unlock className="w-4 h-4 mr-1" />
                              Entsperren
                            </>
                          ) : (
                            <>
                              <Ban className="w-4 h-4 mr-1" />
                              Sperren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {profiles.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Keine Benutzer vorhanden.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Press Tab */}
            <TabsContent value="press" className="space-y-3">
              {pressProfiles.map((pp) => (
                <Card key={pp.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={pp.profile?.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {(pp.profile?.display_name || pp.organization || "P").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {pp.profile?.display_name || "Unbenannt"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pp.organization || "Keine Organisation"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-start">
                        {pp.verified ? (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Verifiziert</Badge>
                        ) : (
                          <Badge variant="outline">Ausstehend</Badge>
                        )}
                        <Button
                          size="sm"
                          variant={pp.verified ? "destructive" : "default"}
                          onClick={() => handleVerifyPress(pp)}
                          disabled={actionLoading === pp.id}
                        >
                          {actionLoading === pp.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : pp.verified ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Entziehen
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verifizieren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pressProfiles.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Keine Presse-Anträge vorhanden.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Moderation Logs Tab */}
            <TabsContent value="logs" className="space-y-3">
              {moderationLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="capitalize">
                            {log.action.replace("_", " ")}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">
                            {log.target_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Ziel: {log.target_id}
                        </p>
                        {log.reason && (
                          <p className="text-sm text-muted-foreground mt-1">{log.reason}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground sm:shrink-0">
                        {new Date(log.created_at).toLocaleString("de-DE")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {moderationLogs.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Keine Moderationsaktionen vorhanden.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminPage;
