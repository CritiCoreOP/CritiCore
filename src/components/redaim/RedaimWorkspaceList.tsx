import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useRedaimWorkspaces } from "@/hooks/useRedaimWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import RedaimNavSidebar from "./RedaimNavSidebar";
import TwemojiImg from "./TwemojiImg";
import { Clock, Calendar, BookOpen, LayoutTemplate } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface RecentPage {
  id: string;
  title: string;
  icon: string;
  cover_url: string | null;
  workspace_id: string;
  updated_at: string;
}

const LEARN_CARDS = [
  { title: "Erste Schritte mit Redaim", desc: "Lerne die Grundlagen", time: "5 Min.", color: "#2383E2", slug: "erste-schritte" },
  { title: "Seiten & Bl\u00F6cke", desc: "Inhalte strukturieren", time: "8 Min.", color: "#6940A5", slug: "seiten-bloecke" },
  { title: "Zusammenarbeit im Team", desc: "Einladen & zusammenarbeiten", time: "6 Min.", color: "#448361", slug: "zusammenarbeit" },
  { title: "KI-Assistent nutzen", desc: "Produktiver schreiben", time: "3 Min.", color: "#CB7F2E", slug: "ki-assistent" },
];

const TEMPLATES = [
  {
    title: "Meeting Notes", by: "Redaim", icon: "📋",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Meeting Notes" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "📅 Datum" }] },
      { type: "paragraph", content: [{ type: "text", text: "TT.MM.JJJJ" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "👥 Teilnehmer" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Name 1" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Name 2" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "📝 Agenda" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Thema 1" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "✅ Action Items" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Aufgabe 1" }] }] },
      ]},
    ]},
  },
  {
    title: "Journal", by: "Redaim", icon: "📓",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "📓 Journal" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heute" }] },
      { type: "paragraph", content: [{ type: "text", text: "Was ist heute passiert?" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "🙏 Dankbarkeit" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Ich bin dankbar für..." }] }] },
      ]},
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "🎯 Ziele für morgen" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Ziel 1" }] }] },
      ]},
    ]},
  },
  {
    title: "To-Do Liste", by: "Redaim", icon: "✅",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "✅ To-Do Liste" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Priorität: Hoch" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Wichtige Aufgabe" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Priorität: Mittel" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Aufgabe" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Priorität: Niedrig" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Optionale Aufgabe" }] }] },
      ]},
    ]},
  },
  {
    title: "Projekt-Board", by: "Redaim", icon: "📊",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "📊 Projekt-Board" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Überblick" }] },
      { type: "paragraph", content: [{ type: "text", text: "Projektname: " }, { type: "text", marks: [{ type: "bold" }], text: "Mein Projekt" }] },
      { type: "paragraph", content: [{ type: "text", text: "Status: 🟢 Aktiv" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "📋 Backlog" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Feature 1" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "🚧 In Arbeit" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Aktuelle Aufgabe" }] }] },
      ]},
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "✅ Erledigt" }] },
      { type: "taskList", content: [
        { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Abgeschlossene Aufgabe" }] }] },
      ]},
    ]},
  },
];

export default function RedaimWorkspaceList() {
  const { user } = useAuth();
  const { locale } = useParams();
  const navigate = useNavigate();
  const { workspaces, createWorkspace } = useRedaimWorkspaces();
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ["rw-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, username").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
  const displayName = profileData?.display_name || profileData?.username || user?.email?.split("@")[0] || "";

  const { data: recentPages = [] } = useQuery({
    queryKey: ["rw-recent-pages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rw_pages" as any)
        .select("id, title, icon, cover_url, workspace_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(8);
      return (data as any[] || []).map((p) => ({
        id: p.id,
        title: p.title || "Untitled",
        icon: p.icon || "📄",
        cover_url: p.cover_url || null,
        workspace_id: p.workspace_id,
        updated_at: p.updated_at,
      })) as RecentPage[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const getGreeting = () => {
    const h = new Date().getHours();
    const lang = (locale || "de-DE").slice(0, 2);
    const greetings: Record<string, [string, string, string]> = {
      de: ["Guten Morgen", "Guten Tag", "Guten Abend"],
      en: ["Good Morning", "Good Afternoon", "Good Evening"],
      fr: ["Bonjour", "Bon après-midi", "Bonsoir"],
      es: ["Buenos días", "Buenas tardes", "Buenas noches"],
      th: ["สวัสดีตอนเช้า", "สวัสดีตอนบ่าย", "สวัสดีตอนเย็น"],
    };
    const g = greetings[lang] || greetings.de;
    if (h < 12) return g[0];
    if (h < 18) return g[1];
    return g[2];
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: de });
    } catch {
      return "";
    }
  };

  const handleUseTemplate = async (template: typeof TEMPLATES[number]) => {
    if (creatingTemplate || !user) return;
    setCreatingTemplate(true);
    try {
      let ws = workspaces[0];
      if (!ws) {
        const created = await createWorkspace("Mein Workspace");
        if (!created) { setCreatingTemplate(false); return; }
        ws = created;
      }
      const { data, error } = await supabase
        .from("rw_pages" as any)
        .insert({
          workspace_id: ws.id,
          title: template.title,
          icon: template.icon,
          created_by: user.id,
          sort_order: 0,
          content: template.content,
        } as any)
        .select()
        .single();
      if (!error && data) {
        navigate(`/${locale}/rw/${ws.id}/${(data as any).id}`);
      }
    } finally {
      setCreatingTemplate(false);
    }
  };

  if (!user) {
    return (
      <div className="redaim-workspace">
        <RedaimNavSidebar />
        <div className="redaim-workspace-container">
          <div className="redaim-hero">
            <h1 className="redaim-hero-title">Redaim.</h1>
            <p className="redaim-hero-subtitle">Kollaborativer Workspace</p>
            <p className="redaim-hero-desc">Melde dich an, um loszulegen.</p>
            <Button onClick={() => navigate(`/${locale}/auth`)} className="redaim-btn-primary mt-6">
              Anmelden
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="redaim-workspace">
      <RedaimNavSidebar />
      <div className="redaim-workspace-container">
        <div className="rw-home">
          {/* Greeting */}
          <h1 className="rw-home-greeting">{getGreeting()}, {displayName || "there"}</h1>

          {/* Recently visited */}
          {recentPages.length > 0 && (
            <section className="rw-home-section">
              <div className="rw-home-section-header">
                <Clock size={15} />
                <span>Recently visited</span>
              </div>
              <div className="rw-home-cards-scroll">
                {recentPages.map((page) => (
                  <button
                    key={page.id}
                    className="rw-home-card"
                    onClick={() => navigate(`/${locale}/rw/${page.workspace_id}/${page.id}`)}
                  >
                    <div
                      className="rw-home-card-cover"
                      style={page.cover_url ? { backgroundImage: `url(${page.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                    >
                      <span className="rw-home-card-icon">
                        <TwemojiImg emoji={page.icon} size={24} />
                      </span>
                    </div>
                    <div className="rw-home-card-body">
                      <span className="rw-home-card-title">{page.title}</span>
                      <span className="rw-home-card-time">{formatTime(page.updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming events */}
          <section className="rw-home-section">
            <div className="rw-home-section-header">
              <Calendar size={15} />
              <span>Upcoming events</span>
            </div>
            <div className="rw-home-events">
              <div className="rw-home-events-cta">
                <div className="rw-home-events-icon">
                  <Calendar size={28} strokeWidth={1.5} />
                </div>
                <h3>Meetings & Events</h3>
                <p>Plane Meetings und verfolge Termine direkt in Redaim.</p>
                <button className="rw-home-link" onClick={() => navigate(`/${locale}/rw/meetings`)}>
                  Meetings öffnen →
                </button>
              </div>
              <div className="rw-home-events-list">
                <div className="rw-home-event-item">
                  <div className="rw-home-event-date">
                    <span className="rw-home-event-day">Heute</span>
                    <span className="rw-home-event-month">
                      {new Date().toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="rw-home-event-info">
                    <span className="rw-home-event-title">Keine geplanten Events</span>
                    <span className="rw-home-event-meta">Erstelle ein Meeting, um loszulegen</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Learn */}
          <section className="rw-home-section">
            <div className="rw-home-section-header">
              <BookOpen size={15} />
              <span>Learn</span>
            </div>
            <div className="rw-home-cards-scroll">
              {LEARN_CARDS.map((card) => (
                <button
                  key={card.title}
                  className="rw-home-learn-card"
                  onClick={() => navigate(`/${locale}/rw/learn/${card.slug}`)}
                >
                  <div className="rw-home-learn-cover" style={{ background: card.color }} />
                  <div className="rw-home-learn-body">
                    <span className="rw-home-learn-title">{card.title}</span>
                    <span className="rw-home-learn-meta">
                      <BookOpen size={12} /> {card.time}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Featured templates */}
          <section className="rw-home-section">
            <div className="rw-home-section-header">
              <LayoutTemplate size={15} />
              <span>Featured templates</span>
            </div>
            <div className="rw-home-cards-scroll">
              {TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  className="rw-home-template-card"
                  onClick={() => handleUseTemplate(t)}
                  disabled={creatingTemplate}
                  style={{ cursor: creatingTemplate ? "wait" : "pointer" }}
                >
                  <div className="rw-home-template-header">
                    <span className="rw-home-template-icon">
                      <TwemojiImg emoji={t.icon} size={20} />
                    </span>
                    <div>
                      <span className="rw-home-template-title">{t.title}</span>
                      <span className="rw-home-template-by">By {t.by}</span>
                    </div>
                  </div>
                  <div className="rw-home-template-preview" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
