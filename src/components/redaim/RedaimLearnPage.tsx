import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, BookOpen, Sparkles, Users, Layers } from "lucide-react";
import RedaimNavSidebar from "./RedaimNavSidebar";

interface LearnSection {
  heading: string;
  content: string;
}

interface LearnTopic {
  slug: string;
  title: string;
  time: string;
  color: string;
  icon: typeof BookOpen;
  sections: LearnSection[];
}

const LEARN_TOPICS: LearnTopic[] = [
  {
    slug: "erste-schritte",
    title: "Erste Schritte mit Redaim",
    time: "5 Min.",
    color: "#2383E2",
    icon: BookOpen,
    sections: [
      {
        heading: "Willkommen bei Redaim",
        content: "Redaim ist dein kollaborativer Workspace \u2013 eine Plattform, mit der du Seiten erstellen, organisieren und gemeinsam mit deinem Team bearbeiten kannst.",
      },
      {
        heading: "Workspace erstellen",
        content: "Klicke in der Sidebar auf \u201ENeue Seite\u201C unter Private oder nutze den Shortcut Ctrl+N, um einen neuen Workspace zu erstellen. Jeder Workspace hat eigene Seiten, Mitglieder und Einstellungen.",
      },
      {
        heading: "Navigation",
        content: "Die linke Sidebar zeigt dir alle wichtigen Bereiche: Home, Search, Inbox, Library. Nutze Keyboard-Shortcuts f\u00FCr schnellen Zugriff.",
      },
      {
        heading: "Seiten erstellen",
        content: "In einem Workspace kannst du beliebig viele Seiten anlegen. Jede Seite hat einen eigenen Titel, ein Emoji-Icon und optional ein Cover-Bild. Der Inhalt wird automatisch gespeichert.",
      },
    ],
  },
  {
    slug: "seiten-bloecke",
    title: "Seiten & Bl\u00F6cke",
    time: "8 Min.",
    color: "#6940A5",
    icon: Layers,
    sections: [
      {
        heading: "Block-basiertes Editing",
        content: "Jeder Absatz, jede \u00DCberschrift und jedes Element ist ein Block. Du kannst Bl\u00F6cke per Drag & Drop verschieben, l\u00F6schen oder in andere Typen umwandeln.",
      },
      {
        heading: "Slash-Befehle",
        content: "Tippe / (Slash) in einer leeren Zeile, um das Men\u00FC zu \u00F6ffnen. Hier findest du alle verf\u00FCgbaren Block-Typen: \u00DCberschriften, Listen, Checklisten, Tabellen, Bilder, Code-Bl\u00F6cke und mehr.",
      },
      {
        heading: "Formatierung",
        content: "Markiere Text, um die Formatierungs-Toolbar zu \u00F6ffnen. Du kannst Text fett, kursiv, unterstrichen oder als Code formatieren.",
      },
      {
        heading: "Seiten-Metadaten",
        content: "Jede Seite kann ein individuelles Emoji-Icon und ein Cover-Bild haben. Klicke auf das Icon neben dem Titel, um es zu \u00E4ndern.",
      },
    ],
  },
  {
    slug: "zusammenarbeit",
    title: "Zusammenarbeit im Team",
    time: "6 Min.",
    color: "#448361",
    icon: Users,
    sections: [
      {
        heading: "Mitglieder einladen",
        content: "Als Workspace-Owner kannst du andere Nutzer einladen. Erstelle einen Einladungslink und teile ihn mit deinem Team.",
      },
      {
        heading: "Rollen & Berechtigungen",
        content: "Es gibt drei Rollen: Owner (volle Kontrolle), User (kann Seiten erstellen und bearbeiten) und Presse (kann nur \u00F6ffentliche Seiten lesen).",
      },
      {
        heading: "Echtzeit-Kollaboration",
        content: "Mehrere Nutzer k\u00F6nnen gleichzeitig an derselben Seite arbeiten. Ihr seht die Cursor und \u00C4nderungen der anderen in Echtzeit.",
      },
      {
        heading: "Ver\u00F6ffentlichen",
        content: "Fertige Dokumente k\u00F6nnen als Artikel auf der Hauptplattform ver\u00F6ffentlicht werden. Klicke auf Ver\u00F6ffentlichen im Editor.",
      },
    ],
  },
  {
    slug: "ki-assistent",
    title: "KI-Assistent nutzen",
    time: "3 Min.",
    color: "#CB7F2E",
    icon: Sparkles,
    sections: [
      {
        heading: "Redaim AI",
        content: "Der integrierte KI-Assistent hilft dir beim Schreiben, Zusammenfassen und Brainstormen. Nutze den Shortcut Ctrl+I oder die Sidebar-Navigation.",
      },
      {
        heading: "Texte generieren",
        content: "Beschreibe, was du brauchst, und die KI erstellt einen Entwurf. Zum Beispiel: Schreibe eine Zusammenfassung oder Erstelle eine Gliederung.",
      },
      {
        heading: "Texte verbessern",
        content: "Markiere bestehenden Text und lass ihn von der KI \u00FCberarbeiten: k\u00FCrzer, formeller, kreativer oder in einer anderen Sprache.",
      },
    ],
  },
];

export default function RedaimLearnPage() {
  const { locale, pageId: topicSlug } = useParams();
  const navigate = useNavigate();

  const topic = topicSlug ? LEARN_TOPICS.find((t) => t.slug === topicSlug) : null;

  return (
    <div className="redaim-workspace">
      <RedaimNavSidebar />
      <div className="redaim-workspace-container">
        <div className="rw-home" style={{ maxWidth: 720 }}>
          {topic ? (
            <>
              <button
                className="rw-learn-back"
                onClick={() => navigate(`/${locale}/rw/learn`)}
              >
                <ArrowLeft size={16} />
                <span>Alle Tutorials</span>
              </button>

              <div className="rw-learn-hero" style={{ background: topic.color }}>
                <topic.icon size={32} strokeWidth={1.5} color="white" />
                <h1>{topic.title}</h1>
                <div className="rw-learn-hero-meta">
                  <Clock size={13} /> {topic.time} Lesezeit
                </div>
              </div>

              <div className="rw-learn-content">
                {topic.sections.map((s, i) => (
                  <section key={i} className="rw-learn-section">
                    <h2>{s.heading}</h2>
                    <p>{s.content}</p>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="rw-home-greeting">
                <BookOpen size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                Learn
              </h1>
              <p className="rw-learn-subtitle">
                Lerne Redaim kennen &ndash; Schritt f&uuml;r Schritt.
              </p>

              <div className="rw-learn-grid">
                {LEARN_TOPICS.map((t) => (
                  <button
                    key={t.slug}
                    className="rw-learn-grid-card"
                    onClick={() => navigate(`/${locale}/rw/learn/${t.slug}`)}
                  >
                    <div className="rw-learn-grid-cover" style={{ background: t.color }}>
                      <t.icon size={28} strokeWidth={1.5} color="white" />
                    </div>
                    <div className="rw-learn-grid-body">
                      <span className="rw-learn-grid-title">{t.title}</span>
                      <span className="rw-learn-grid-meta">
                        <Clock size={12} /> {t.time}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
