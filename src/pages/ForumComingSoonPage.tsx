import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { ArrowLeft, MessageSquare, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import forumsLogo from "@/assets/criticore-forums-logo.png";

const ForumComingSoonPage = () => {
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <img src={forumsLogo} alt="CritiCore Forums" className="h-10 mb-8 opacity-80" />

      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-10 h-10 text-primary" />
        <CalendarClock className="w-8 h-8 text-muted-foreground" />
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-3">
        {isDE ? "Forum kommt bald!" : "Forum Coming Soon!"}
      </h1>

      <p className="text-muted-foreground max-w-md mb-2">
        {isDE
          ? "Wir arbeiten hart am CritiCore Forum. Der Launch ist für Q2 2026 geplant."
          : "We're working hard on the CritiCore Forum. Launch is planned for Q2 2026."}
      </p>

      <p className="text-sm text-muted-foreground/70 mb-8">
        {isDE
          ? "Diskussionen, Communities und mehr – bald verfügbar."
          : "Discussions, communities and more – coming soon."}
      </p>

      <Link to="/">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          {isDE ? "Zurück zur Startseite" : "Back to Home"}
        </Button>
      </Link>
    </div>
  );
};

export default ForumComingSoonPage;
