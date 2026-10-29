import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PlusCircle as AddCircleTwoTone, XCircle as CancelTwoTone, CheckCircle2 as CheckCircleTwoTone, Code as CodeTwoTone, Copy as ContentCopyTwoTone, Trash as DeleteTwoTone, LogIn as LoginTwoTone, Code2 as ApiTwoTone, ClipboardList as AssignmentTwoTone, Braces as DataObjectTwoTone, Hourglass as HourglassTopTwoTone, Key as KeyTwoTone, Gauge as SpeedTwoTone } from "lucide-react";

interface ApiKeyInfo {
  id: string;
  key_prefix: string;
  name: string;
  requests_today: number;
  requests_total: number;
  rate_limit: number;
  active: boolean;
  created_at: string;
  last_request_at: string | null;
}

interface ApiApplication {
  id: string;
  project_name: string;
  project_url: string | null;
  use_case: string;
  expected_requests: string;
  status: string;
  created_at: string;
}

const DeveloperPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [application, setApplication] = useState<ApiApplication | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Application form state
  const [form, setForm] = useState({
    project_name: "",
    project_url: "",
    use_case: "",
    expected_requests: "",
    agree_terms: false,
  });

  useEffect(() => {
    document.title = t("developers.pageTitle");
  }, [t]);

  useEffect(() => {
    if (user) {
      fetchApplication();
      fetchKeys();
    } else {
      setAppLoading(false);
    }
  }, [user]);

  const fetchApplication = async () => {
    setAppLoading(true);
    const { data } = await supabase
      .from("api_applications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setApplication(data);
    setAppLoading(false);
  };

  const fetchKeys = async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("id, key_prefix, name, requests_today, requests_total, rate_limit, active, created_at, last_request_at")
      .order("created_at", { ascending: false });
    if (data) setKeys(data);
  };

  const submitApplication = async () => {
    if (!form.project_name.trim() || !form.use_case.trim() || !form.expected_requests || !form.agree_terms) {
      toast.error(t("developers.fillRequired"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("api_applications").insert({
        user_id: user!.id,
        project_name: form.project_name.trim(),
        project_url: form.project_url.trim() || null,
        use_case: form.use_case.trim(),
        expected_requests: form.expected_requests,
        agree_terms: form.agree_terms,
      });
      if (error) throw error;
      toast.success(t("developers.applicationSubmitted"));
      fetchApplication();
    } catch (err: any) {
      toast.error(err.message || t("developers.applicationError"));
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!newKeyName.trim()) {
      toast.error(t("developers.nameRequired"));
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        method: "POST",
        body: { name: newKeyName },
      });
      if (error) throw error;
      setNewKey(data.key);
      setNewKeyName("");
      fetchKeys();
      toast.success(t("developers.keyCreated"));
    } catch (err: any) {
      toast.error(err.message || t("developers.keyError"));
    } finally {
      setLoading(false);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setKeys((k) => k.filter((key) => key.id !== id));
      toast.success(t("developers.keyDeleted"));
    } catch {
      toast.error(t("developers.keyError"));
    }
  };

  const cancelApplication = async () => {
    if (!application) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("api_applications")
        .delete()
        .eq("id", application.id);
      if (error) throw error;
      setApplication(null);
      toast.success(t("developers.applicationCancelled"));
    } catch (err: any) {
      toast.error(err.message || t("developers.applicationError"));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("developers.copied"));
  };

  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criticore-api-v3`;
  const apiBaseUrlV2 = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criticore-api-v2`;
  const isApproved = application?.status === "approved";
  const isPending = application?.status === "pending";
  const isRejected = application?.status === "rejected";

  // Render application status card
  const renderApplicationStatus = () => {
    if (isPending) {
      return (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex items-center gap-4 p-6">
            <HourglassTopTwoTone className="w-10 h-10 text-yellow-500 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-foreground">{t("developers.pendingTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("developers.pendingDesc")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("developers.projectLabel")}: <span className="text-foreground">{application?.project_name}</span>
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={cancelApplication}
                disabled={loading}
              >
                <CancelTwoTone className="w-4 h-4 mr-1" />
                {t("developers.cancelApplication")}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (isRejected) {
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-4 p-6">
            <CancelTwoTone className="w-10 h-10 text-destructive shrink-0" />
            <div>
              <h3 className="font-bold text-foreground">{t("developers.rejectedTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("developers.rejectedDesc")}</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ApiTwoTone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            {t("developers.title")}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {t("developers.subtitle")}
          </p>
        </div>

        <Tabs defaultValue="docs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="docs">
              <CodeTwoTone className="w-4 h-4 mr-1.5" />
              {t("developers.docsTab")}
            </TabsTrigger>
            <TabsTrigger value="keys">
              <KeyTwoTone className="w-4 h-4 mr-1.5" />
              {t("developers.keysTab")}
            </TabsTrigger>
            <TabsTrigger value="endpoints">
              <DataObjectTwoTone className="w-4 h-4 mr-1.5" />
              {t("developers.endpointsTab")}
            </TabsTrigger>
          </TabsList>

          {/* Documentation */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("developers.gettingStarted")}</CardTitle>
                <CardDescription>{t("developers.gettingStartedDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">{t("developers.step1Title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("developers.step1Desc")}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">{t("developers.step2Title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("developers.step2Desc")}</p>
                  <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto text-foreground">
{`curl "${apiBaseUrl}/v3/media/movie/550" \\
  -H "x-api-key: YOUR_API_KEY"`}
                  </pre>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">{t("developers.step3Title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("developers.step3Desc")}</p>
                  <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto text-foreground">
{`// JavaScript — API 3.0
const res = await fetch(
  "${apiBaseUrl}/v3/search?q=fight+club",
  { headers: { "x-api-key": "YOUR_API_KEY" } }
);
const { data, meta } = await res.json();
console.log(data);                                  // Combined movies/series/games
console.log(meta.version);                          // "3.0"
console.log(res.headers.get("X-Cache"));            // HIT or MISS
console.log(res.headers.get("X-RateLimit-Remaining"));`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SpeedTwoTone className="w-5 h-5 text-primary" />
                  {t("developers.rateLimitTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("developers.rateLimitIntro")}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th scope="col" className="py-2 pr-4 font-medium text-foreground">{t("developers.rateTier")}</th>
                        <th scope="col" className="py-2 pr-4 font-medium text-foreground">{t("developers.rateDaily")}</th>
                        <th scope="col" className="py-2 font-medium text-foreground">{t("developers.ratePerMinute")}</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><Badge variant="secondary">Starter</Badge></td>
                        <td className="py-2 pr-4 tabular-nums">{(1000).toLocaleString(i18n.language)}</td>
                        <td className="py-2 tabular-nums">30</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4"><Badge>Pro V3</Badge></td>
                        <td className="py-2 pr-4 tabular-nums">{(25000).toLocaleString(i18n.language)}</td>
                        <td className="py-2 tabular-nums">120</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4"><Badge variant="outline">Enterprise</Badge></td>
                        <td className="py-2 pr-4 tabular-nums">{(250000).toLocaleString(i18n.language)}</td>
                        <td className="py-2 tabular-nums">600</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 pt-2 text-xs text-muted-foreground">
                  {(["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Tier", "X-Cache"] as const).map((header) => (
                    <div key={header} className="contents">
                      <dt><code className="text-foreground">{header}</code></dt>
                      <dd>{t(`developers.header.${header}`)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Management */}
          <TabsContent value="keys" className="space-y-4">
            {/* Not logged in */}
            {!user ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <LoginTwoTone className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">{t("developers.loginRequired")}</p>
                  <Button asChild>
                    <Link to="/auth">{t("nav.login")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : appLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">{t("common.loadMore")}...</p>
                </CardContent>
              </Card>
            ) : !application ? (
              /* Application form - no application yet */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AssignmentTwoTone className="w-5 h-5 text-primary" />
                    {t("developers.applyTitle")}
                  </CardTitle>
                  <CardDescription>{t("developers.applyDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("developers.projectName")} *</label>
                    <Input
                      value={form.project_name}
                      onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))}
                      placeholder={t("developers.projectNamePlaceholder")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("developers.projectUrl")}</label>
                    <Input
                      value={form.project_url}
                      onChange={(e) => setForm((f) => ({ ...f, project_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("developers.useCase")} *</label>
                    <Textarea
                      value={form.use_case}
                      onChange={(e) => setForm((f) => ({ ...f, use_case: e.target.value }))}
                      placeholder={t("developers.useCasePlaceholder")}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("developers.expectedRequests")} *</label>
                    <Select
                      value={form.expected_requests}
                      onValueChange={(v) => setForm((f) => ({ ...f, expected_requests: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("developers.selectExpected")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="< 100/day">&lt; 100 / {t("developers.day")}</SelectItem>
                        <SelectItem value="100-1000/day">100 – 1.000 / {t("developers.day")}</SelectItem>
                        <SelectItem value="1000-10000/day">1.000 – 10.000 / {t("developers.day")}</SelectItem>
                        <SelectItem value="> 10000/day">&gt; 10.000 / {t("developers.day")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-primary flex items-center gap-1">
                      <CheckCircleTwoTone className="w-3.5 h-3.5" />
                      {t("developers.autoApproveHint")}
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="agree"
                      checked={form.agree_terms}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, agree_terms: !!v }))}
                    />
                    <label htmlFor="agree" className="text-sm text-muted-foreground leading-tight">
                      {t("developers.agreeTerms")}
                    </label>
                  </div>

                  <Button onClick={submitApplication} disabled={loading} className="w-full">
                    {loading ? "..." : t("developers.submitApplication")}
                  </Button>
                </CardContent>
              </Card>
            ) : !isApproved ? (
              /* Pending or rejected */
              renderApplicationStatus()
            ) : (
              /* Approved - show key management */
              <>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <CheckCircleTwoTone className="w-6 h-6 text-primary shrink-0" />
                    <p className="text-sm text-foreground">{t("developers.approvedInfo")}</p>
                  </CardContent>
                </Card>

                {/* Show new key banner */}
                {newKey && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-foreground mb-2">
                        ⚠️ {t("developers.saveKeyWarning")}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted/50 p-2 rounded text-xs break-all text-foreground">
                          {newKey}
                        </code>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(newKey)}>
                          <ContentCopyTwoTone className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewKey(null)}>
                        {t("developers.dismiss")}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Create key */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("developers.createKeyTitle")}</CardTitle>
                    <CardDescription>{t("developers.createKeyDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder={t("developers.keyNamePlaceholder")}
                        className="flex-1"
                      />
                      <Button onClick={createKey} disabled={loading}>
                        <AddCircleTwoTone className="w-4 h-4 mr-1" />
                        {loading ? "..." : t("developers.createButton")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Existing keys */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("developers.yourKeys")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {keys.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("developers.noKeys")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {keys.map((key) => (
                          <div
                            key={key.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground">{key.name}</span>
                                <Badge variant={key.active ? "default" : "secondary"} className="text-xs">
                                  {key.active ? t("developers.active") : t("developers.inactive")}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <code>{key.key_prefix}••••••••</code>
                                <span>{t("developers.requests")}: {key.requests_today}/{key.rate_limit} {t("developers.today")}</span>
                                <span>{t("developers.total")}: {key.requests_total}</span>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteKey(key.id)}
                            >
                              <DeleteTwoTone className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Endpoints Reference */}
          <TabsContent value="endpoints" className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Badge>v3.0</Badge>
                <p className="text-sm text-foreground">
                  API 3.0 adds aggregated metadata (TMDB + IGDB + OMDB), unified global search, and server-side caching.
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Badge variant="outline">v2.0</Badge>
                <p className="text-sm text-foreground">
                  v2 is <span className="font-semibold">deprecated</span> and will be sunset. Responses include
                  <code className="mx-1 text-foreground">Deprecation</code> and
                  <code className="mx-1 text-foreground">Sunset</code> headers — please migrate to v3.
                </p>
              </CardContent>
            </Card>

            <h3 className="text-sm font-semibold text-foreground pt-2">v3 Endpoints</h3>
            {[
              { method: "GET", path: "/v3/media/movie/:id", desc: "Full aggregated movie metadata (TMDB + OMDB ratings)", params: "id (TMDB id, in path), language (optional)", isNew: true },
              { method: "GET", path: "/v3/media/series/:id", desc: "Full aggregated series metadata (TMDB + OMDB ratings)", params: "id (TMDB id, in path), language (optional)", isNew: true },
              { method: "GET", path: "/v3/media/game/:id", desc: "Full aggregated game metadata (IGDB)", params: "id (IGDB id, in path)", isNew: true },
              { method: "GET", path: "/v3/search", desc: "Unified global search across movies, series and games", params: "q (required), limit (max 50)", isNew: true },
            ].map((ep: any) => (
              <Card key={ep.path}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs font-mono">{ep.method}</Badge>
                    <code className="text-sm font-semibold text-foreground">{ep.path}</code>
                    {ep.isNew && <Badge variant="default" className="text-[10px]">NEW</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{ep.desc}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Params:</span> {ep.params}
                  </p>
                </CardContent>
              </Card>
            ))}

            <h3 className="text-sm font-semibold text-muted-foreground pt-4">v2 Endpoints (deprecated)</h3>
            {[
              { method: "GET", path: "/v2/reviews", desc: t("developers.endpointReviews"), params: "media_type, media_id, limit (max 100), cursor, sort, min_score, max_score, critic_only" },
              { method: "GET", path: "/v2/reviews/:id", desc: t("developers.endpointReviewById"), params: "id (in path)" },
              { method: "GET", path: "/v2/scores", desc: t("developers.endpointScores"), params: "media_type (required), media_id (required)" },
              { method: "GET", path: "/v2/media-metadata", desc: t("developers.endpointMetadata"), params: "media_type, media_id, limit, cursor" },
              { method: "GET", path: "/v2/categories", desc: t("developers.endpointCategories"), params: "—" },
              { method: "GET", path: "/v2/tags", desc: t("developers.endpointTags"), params: "search, limit, cursor" },
              { method: "GET", path: "/v2/users", desc: "Search & list public user profiles", params: "search, limit, cursor" },
              { method: "GET", path: "/v2/users/:user_id", desc: "Get a single user profile", params: "user_id (in path)" },
              { method: "GET", path: "/v2/lists", desc: "Browse public lists", params: "user_id, limit, cursor" },
              { method: "GET", path: "/v2/lists/:id", desc: "Get a public list with its items", params: "id (in path)" },
              { method: "GET", path: "/v2/activity", desc: "Activity feed stream", params: "user_id, type, limit, cursor" },
            ].map((ep: any) => (
              <Card key={ep.path} className="opacity-70">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs font-mono">{ep.method}</Badge>
                    <code className="text-sm font-semibold text-foreground">{ep.path}</code>
                    <Badge variant="secondary" className="text-[10px]">DEPRECATED</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{ep.desc}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Params:</span> {ep.params} · <span className="font-medium">Base:</span> <code>{apiBaseUrlV2}</code>
                  </p>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("developers.responseFormat")} — v3.0 Envelope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto text-foreground">
{`{
  "data": { ... },
  "meta": {
    "version": "3.0",
    "timestamp": "2026-05-04T14:30:00.000Z",
    "sources": ["tmdb", "omdb"],
    "cached": false
  }
}`}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Aggregated responses are cached for 120 minutes. Check the
                  <code className="mx-1 text-foreground">X-Cache</code> header to see whether the response was served from cache.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default DeveloperPage;
