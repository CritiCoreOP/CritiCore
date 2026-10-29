import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { MessageCircle as ChatBubbleTwoTone, FileText as DescriptionTwoTone, Users as GroupTwoTone, Star as StarTwoTone, TrendingDown as TrendingDownTwoTone, TrendingUp as TrendingUpTwoTone } from "lucide-react";

interface DailyCount { date: string; count: number; }
const COLORS = ["hsl(175, 80%, 50%)", "hsl(260, 70%, 60%)", "hsl(45, 90%, 55%)", "hsl(0, 72%, 51%)", "hsl(142, 70%, 45%)"];

const AdminStats = () => {
  const { t } = useTranslation();
  const [userGrowth, setUserGrowth] = useState<DailyCount[]>([]);
  const [reviewActivity, setReviewActivity] = useState<DailyCount[]>([]);
  const [commentActivity, setCommentActivity] = useState<DailyCount[]>([]);
  const [reportActivity, setReportActivity] = useState<DailyCount[]>([]);
  const [roleDist, setRoleDist] = useState<{ name: string; value: number }[]>([]);
  const [totals, setTotals] = useState({ users30d: 0, reviews30d: 0, comments30d: 0, reports30d: 0 });

  useEffect(() => { loadStats(); }, []);

  const aggregateByDay = (rows: { created_at: string }[]): DailyCount[] => {
    const dayMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - 29 + i); dayMap[d.toISOString().slice(0, 10)] = 0; }
    rows.forEach((r) => { const key = r.created_at.slice(0, 10); if (key in dayMap) dayMap[key]++; });
    return Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date: formatDate(date, { day: "2-digit", month: "2-digit" }), count }));
  };

  const loadStats = async () => {
    const since = new Date(); since.setDate(since.getDate() - 30); const sinceISO = since.toISOString();
    const [profilesRes, reviewsRes, commentsRes, reportsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("created_at").gte("created_at", sinceISO), supabase.from("reviews").select("created_at").gte("created_at", sinceISO),
      supabase.from("comments").select("created_at").gte("created_at", sinceISO), supabase.from("reports").select("created_at").gte("created_at", sinceISO), supabase.from("user_roles").select("role"),
    ]);
    const profiles = profilesRes.data || []; const reviews = reviewsRes.data || []; const comments = commentsRes.data || []; const reports = reportsRes.data || [];
    setUserGrowth(aggregateByDay(profiles)); setReviewActivity(aggregateByDay(reviews)); setCommentActivity(aggregateByDay(comments)); setReportActivity(aggregateByDay(reports));
    setTotals({ users30d: profiles.length, reviews30d: reviews.length, comments30d: comments.length, reports30d: reports.length });
    if (rolesRes.data) { const rc: Record<string, number> = {}; rolesRes.data.forEach((r) => { rc[r.role] = (rc[r.role] || 0) + 1; }); setRoleDist(Object.entries(rc).map(([name, value]) => ({ name, value }))); }
  };

  const kpis = [
    { label: t("admin.stats.newUsers"), value: totals.users30d, icon: GroupTwoTone, color: "text-primary" },
    { label: t("admin.stats.reviews"), value: totals.reviews30d, icon: StarTwoTone, color: "text-primary" },
    { label: t("admin.stats.comments"), value: totals.comments30d, icon: ChatBubbleTwoTone, color: "text-primary" },
    { label: t("admin.stats.reports"), value: totals.reports30d, icon: DescriptionTwoTone, color: "text-destructive" },
  ];
  const chartTooltipStyle = { contentStyle: { backgroundColor: "hsl(230, 12%, 16%)", border: "1px solid hsl(230, 10%, 22%)", borderRadius: "8px", color: "hsl(230, 30%, 94%)", fontSize: "12px" } };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">{t("admin.stats.title")}</h1><p className="text-muted-foreground text-sm">{t("admin.stats.subtitle")}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (<Card key={kpi.label}><CardHeader className="pb-2"><CardDescription className="flex items-center gap-2 text-xs"><kpi.icon className={`w-4 h-4 ${kpi.color}`} />{kpi.label}</CardDescription><CardTitle className="text-3xl">{kpi.value}</CardTitle></CardHeader></Card>))}
      </div>
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUpTwoTone className="w-5 h-5 text-primary" />{t("admin.stats.userGrowth")}</CardTitle><CardDescription>{t("admin.stats.userGrowthDesc")}</CardDescription></CardHeader>
        <CardContent><ResponsiveContainer width="100%" height={260}><AreaChart data={userGrowth}><defs><linearGradient id="gradUser" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(175, 80%, 50%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(175, 80%, 50%)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 10%, 22%)" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(230, 10%, 50%)" }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 11, fill: "hsl(230, 10%, 50%)" }} allowDecimals={false} /><Tooltip {...chartTooltipStyle} /><Area type="monotone" dataKey="count" stroke="hsl(175, 80%, 50%)" fill="url(#gradUser)" strokeWidth={2} name={t("admin.stats.newUsersChart")} /></AreaChart></ResponsiveContainer></CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><StarTwoTone className="w-5 h-5 text-primary" />{t("admin.stats.reviewActivity")}</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={220}><BarChart data={reviewActivity}><CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 10%, 22%)" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(230, 10%, 50%)" }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 10, fill: "hsl(230, 10%, 50%)" }} allowDecimals={false} /><Tooltip {...chartTooltipStyle} /><Bar dataKey="count" fill="hsl(175, 80%, 50%)" radius={[4, 4, 0, 0]} name={t("admin.stats.reviewsChart")} /></BarChart></ResponsiveContainer></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><ChatBubbleTwoTone className="w-5 h-5 text-primary" />{t("admin.stats.commentActivity")}</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={220}><BarChart data={commentActivity}><CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 10%, 22%)" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(230, 10%, 50%)" }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 10, fill: "hsl(230, 10%, 50%)" }} allowDecimals={false} /><Tooltip {...chartTooltipStyle} /><Bar dataKey="count" fill="hsl(260, 70%, 60%)" radius={[4, 4, 0, 0]} name={t("admin.stats.commentsChart")} /></BarChart></ResponsiveContainer></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingDownTwoTone className="w-5 h-5 text-destructive" />{t("admin.stats.reportActivity")}</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={220}><AreaChart data={reportActivity}><defs><linearGradient id="gradReport" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 10%, 22%)" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(230, 10%, 50%)" }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 10, fill: "hsl(230, 10%, 50%)" }} allowDecimals={false} /><Tooltip {...chartTooltipStyle} /><Area type="monotone" dataKey="count" stroke="hsl(0, 72%, 51%)" fill="url(#gradReport)" strokeWidth={2} name={t("admin.stats.reportsChart")} /></AreaChart></ResponsiveContainer></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><GroupTwoTone className="w-5 h-5 text-primary" />{t("admin.stats.roleDistribution")}</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-6"><ResponsiveContainer width="50%" height={220}><PieChart><Pie data={roleDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>{roleDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...chartTooltipStyle} /></PieChart></ResponsiveContainer>
            <div className="space-y-2">{roleDist.map((r, i) => <div key={r.name} className="flex items-center gap-2 text-sm"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="capitalize">{r.name}</span><Badge variant="secondary" className="text-xs">{r.value}</Badge></div>)}</div>
          </div></CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminStats;
