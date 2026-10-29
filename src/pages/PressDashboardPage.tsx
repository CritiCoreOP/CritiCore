import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@/lib/locale-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePressDashboard } from "@/hooks/usePressDashboard";
import { deadlineInfo } from "@/lib/press";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import RedaktionTour from "@/components/RedaktionTour";
import ContinueWriting from "@/components/press/ContinueWriting";
import PipelineSection from "@/components/press/PipelineSection";
import ResonanceSection from "@/components/press/ResonanceSection";
import IdeasPanel from "@/components/press/IdeasPanel";
import DeadlinesPanel from "@/components/press/DeadlinesPanel";
import FeedbackPanel from "@/components/press/FeedbackPanel";
import { focusRing } from "@/components/press/styles";
import { AlertCircle, CalendarClock, FileText, KanbanSquare, MessageSquare, PenLine, Plus, Send, ShieldCheck } from "lucide-react";

/**
 * Home of the press area: what to continue, what is due, what came back from the desk, ideas for
 * the next article, and how readers responded. Works the same on phones (one column) and desktop.
 */
const PressDashboardPage = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [access, setAccess] = useState<{ ok: boolean; admin: boolean; name: string | null } | null>(null);

  useEffect(() => {
    document.title = `${t("redaktion.dash.title")} | CritiCore`;
  }, [t]);

  // Same rule as the press menu: press or admin role
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      ]);
      const admin = !!roles?.some((r) => r.role === "admin");
      setAccess({ ok: admin || !!roles?.some((r) => r.role === "press"), admin, name: profile?.display_name ?? null });
    })();
  }, [user, loading, navigate]);

  const dash = usePressDashboard(user?.id, !!access?.admin, !!access?.ok);
  const data = dash.data;

  const derived = useMemo(() => {
    if (!data) return null;
    const titles = Object.fromEntries(data.mine.map((a) => [a.id, a.title]));
    const drafts = data.mine.filter((a) => !a.published && a.status !== "idea");
    const ideas = data.mine.filter((a) => a.status === "idea" && !a.published);
    const published = data.mine.filter((a) => a.published);
    const urgent = data.briefings
      .filter((b) => b.deadline && deadlineInfo(b.deadline).state !== "later")
      .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
    const reviewQueue = access?.admin ? data.pipeline.filter((a) => a.status === "review" && a.user_id !== user?.id) : [];
    return { titles, drafts, ideas, published, urgent, reviewQueue };
  }, [data, access?.admin, user?.id]);

  if (loading || access === null || (access.ok && dash.isLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-6xl px-4 pb-32 pt-24" aria-busy="true">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <Skeleton className="h-56 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!access.ok) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="container mx-auto flex-1 px-4 pt-24 text-center">
          <div className="mx-auto max-w-md rounded-2xl border border-border/50 bg-card/40 p-8">
            <h1 className="font-display text-2xl font-bold text-foreground">{t("article.noAccess")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("article.noAccessDesc")}</p>
            <Button className="mt-6" onClick={() => navigate("/profil")}>
              {t("article.applyPress")}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (dash.isError || !data || !derived) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-6xl px-4 pt-24">
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">{t("redaktion.dash.loadError")}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => dash.refresh()}>
                {t("redaktion.dash.retry")}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { titles, drafts, ideas, published, urgent, reviewQueue } = derived;
  const summary = [
    drafts.length ? t("redaktion.dash.summary.drafts", { count: drafts.length }) : null,
    ideas.length ? t("redaktion.dash.summary.ideas", { count: ideas.length }) : null,
    urgent.length ? t("redaktion.dash.summary.deadlines", { count: urgent.length }) : null,
  ].filter(Boolean);

  const attention = [
    ...urgent.slice(0, 3).map((b) => {
      const { days, state } = deadlineInfo(b.deadline!);
      return {
        key: b.id,
        icon: CalendarClock,
        tone: state === "overdue" ? "text-destructive" : "text-amber-400",
        text:
          state === "overdue"
            ? t("redaktion.dash.attention.overdue", { title: titles[b.article_id] || t("workflow.untitled"), count: -days })
            : state === "today"
              ? t("redaktion.dash.attention.today", { title: titles[b.article_id] || t("workflow.untitled") })
              : t("redaktion.dash.attention.soon", { title: titles[b.article_id] || t("workflow.untitled"), count: days }),
        to: `/news/schreiben?edit=${b.article_id}`,
      };
    }),
    ...(data.feedback.length
      ? [{ key: "feedback", icon: MessageSquare, tone: "text-accent-light", text: t("redaktion.dash.attention.feedback", { count: data.feedback.length }), to: `/news/schreiben?edit=${data.feedback[0].article_id}` }]
      : []),
    ...(reviewQueue.length
      ? [{ key: "review", icon: KanbanSquare, tone: "text-accent-light", text: t("redaktion.dash.attention.review", { count: reviewQueue.length }), to: "/news/board" }]
      : []),
  ];

  const quick = [
    { to: "/news/einreichen", icon: Send, label: t("redaktion.quick.submit") },
    { to: "/news/board", icon: KanbanSquare, label: t("redaktion.quick.board") },
    { to: "/news/entwuerfe", icon: FileText, label: t("redaktion.quick.drafts") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-6xl px-4 pb-32 pt-24 md:pb-16">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {access.name ? t("redaktion.dash.greeting", { name: access.name }) : t("redaktion.dash.title")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {summary.length ? summary.join(", ") : t("redaktion.dash.summary.none")}
            </p>
          </div>
          <nav aria-label={t("redaktion.section.quick")} className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" data-tour="quick">
            <Button asChild className="col-span-3 gap-1.5 sm:col-span-1">
              <Link to="/news/schreiben">
                <PenLine className="h-4 w-4" aria-hidden="true" />
                {t("redaktion.dash.newArticle")}
              </Link>
            </Button>
            {quick.map(({ to, icon: Icon, label }) => (
              <Button key={to} asChild variant="outline" className="gap-1.5 max-sm:px-2">
                <Link to={to}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
        </header>

        {attention.length > 0 && (
          <section aria-labelledby="dash-attention" className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
            <h2 id="dash-attention" className="sr-only">{t("redaktion.dash.attention.title")}</h2>
            <ul className="divide-y divide-border/30">
              {attention.map(({ key, icon: Icon, tone, text, to }) => (
                <li key={key}>
                  <Link to={to} className={`flex items-center gap-3 rounded py-2 text-sm text-foreground hover:underline ${focusRing}`}>
                    <Icon className={cn("h-4 w-4 shrink-0", tone)} aria-hidden="true" />
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Below lg the two columns dissolve into one list, ordered by urgency */}
        <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="flex flex-col gap-6 max-lg:contents">
            <div className="max-lg:order-1">
              <ContinueWriting drafts={drafts} words={data.continueWords} />
            </div>
            <div className="max-lg:order-4">
              <PipelineSection
                articles={data.pipeline}
                all={!!access.admin}
                onMoved={(id, status) =>
                  dash.patch((d) => {
                    const move = (list: typeof d.mine) => list.map((a) => (a.id === id ? { ...a, status, published: status === "published" } : a));
                    return { ...d, mine: move(d.mine), pipeline: move(d.pipeline) };
                  })
                }
              />
            </div>
            <div className="max-lg:order-6">
              <ResonanceSection published={published} reactions={data.reactions} />
            </div>
          </div>
          <div className="flex flex-col gap-6 max-lg:contents">
            <div className="max-lg:order-3">
              <IdeasPanel ideas={ideas} userId={user!.id} onChanged={() => dash.refresh()} />
            </div>
            <div className="max-lg:order-2">
              <DeadlinesPanel briefings={data.briefings} titles={titles} />
            </div>
            <div className="max-lg:order-5">
              <FeedbackPanel comments={data.feedback} titles={titles} />
            </div>
            <p className="flex gap-2 px-1 text-xs leading-relaxed text-muted-foreground max-lg:order-7">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {data.canPublish ? t("redaktion.dash.publishDirect") : t("redaktion.dash.publishReview")}
            </p>
          </div>
        </div>
      </main>

      {/* Phones: new article within thumb reach; desktop has the button in the header */}
      <Link
        to="/news/schreiben"
        data-tour="fab"
        aria-label={t("redaktion.newArticle")}
        className={`fixed bottom-24 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 md:hidden ${focusRing}`}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Link>

      <RedaktionTour ready={!dash.isLoading} />
      <Footer />
    </div>
  );
};

export default PressDashboardPage;
