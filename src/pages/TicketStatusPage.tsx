import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@/lib/locale-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { formatDateTime } from "@/lib/locale";
import { Clock as AccessTimeTwoTone, CheckCircle2 as CheckCircleTwoTone, AlertCircle as ErrorTwoTone, Search as SearchTwoTone, Headphones as SupportAgentTwoTone, Hourglass as HourglassTopTwoTone } from "lucide-react";

interface TicketInfo {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: {
    icon: <HourglassTopTwoTone className="w-12 h-12 text-warning" />,
    badgeVariant: "secondary",
  },
  in_progress: {
    icon: <M3LoadingIndicator size={48} />,
    badgeVariant: "default",
  },
  resolved: {
    icon: <CheckCircleTwoTone className="w-12 h-12 text-primary" />,
    badgeVariant: "outline",
  },
  closed: {
    icon: <ErrorTwoTone className="w-12 h-12 text-destructive" />,
    badgeVariant: "destructive",
  },
};

const TicketStatusPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    document.title = `Ticketstatus – CritiCore`;
  }, []);

  useEffect(() => {
    if (id) {
      lookupTicket(id);
    }
  }, [id]);

  const lookupTicket = async (ticketId: string) => {
    setLoading(true);
    setError(false);
    setTicket(null);

    // Normalize: user may paste "AB12CD34" (short) or full UUID
    const normalized = ticketId.trim().toLowerCase();

    try {
      const { data, error: rpcError } = await supabase.rpc("lookup_ticket_status", {
        ticket_id: normalized,
      });

      if (rpcError || !data || data.length === 0) {
        setError(true);
      } else {
        setTicket(data[0] as TicketInfo);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/ticket/${searchInput.trim()}`);
    }
  };

  const statusConfig = ticket ? STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open : null;

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      open: "Offen",
      in_progress: "In Bearbeitung",
      resolved: "Gelöst",
      closed: "Geschlossen",
    };
    return map[status] || status;
  };

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      general: "Allgemein",
      bug: "Bug",
      account: "Account",
      content: "Inhalt",
      dmca: "DMCA",
      other: "Sonstiges",
    };
    return map[cat] || cat;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-xl">
        <div className="flex items-center gap-3 mb-8">
          <SupportAgentTwoTone className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ticketstatus</h1>
            <p className="text-muted-foreground text-sm">Gib deine Ticket-ID ein, um den Status zu prüfen.</p>
          </div>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <SearchTwoTone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ticket-ID eingeben (z.B. vollständige UUID)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={!searchInput.trim()}>
            Suchen
          </Button>
        </form>

        {/* Loading */}
        {loading && (
          <Card className="text-center py-12">
            <CardContent>
              <M3LoadingIndicator size={48} className="mx-auto mb-4" />
              <p className="text-muted-foreground">Ticket wird gesucht…</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && !loading && (
          <Card className="text-center py-12">
            <CardContent className="space-y-3">
              <ErrorTwoTone className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-lg font-bold text-foreground">Ticket nicht gefunden</h2>
              <p className="text-muted-foreground text-sm">
                Die eingegebene Ticket-ID existiert nicht. Bitte überprüfe deine Eingabe.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Ticket found */}
        {ticket && !loading && statusConfig && (
          <Card>
            <CardContent className="pt-8 pb-8 space-y-6">
              {/* Status icon & badge */}
              <div className="flex flex-col items-center gap-3">
                {statusConfig.icon}
                <Badge variant={statusConfig.badgeVariant} className="text-sm px-4 py-1 capitalize">
                  {statusLabel(ticket.status)}
                </Badge>
              </div>

              {/* Ticket details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Ticket-ID</p>
                    <p className="font-mono text-sm font-bold text-foreground select-all">
                      {ticket.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Kategorie</p>
                    <Badge variant="outline" className="capitalize text-xs">
                      {categoryLabel(ticket.category)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs mb-1">Betreff</p>
                  <p className="font-medium text-foreground">{ticket.subject}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AccessTimeTwoTone className="w-4 h-4" />
                  <span>Erstellt am {formatDateTime(ticket.created_at)}</span>
                </div>
              </div>

              {/* Info text */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                {ticket.status === "open" && (
                  <p>Dein Ticket wurde empfangen und wartet auf Bearbeitung. Wir melden uns so bald wie möglich.</p>
                )}
                {ticket.status === "in_progress" && (
                  <p>Dein Ticket wird gerade von unserem Team bearbeitet. Du erhältst eine Benachrichtigung bei Änderungen.</p>
                )}
                {ticket.status === "resolved" && (
                  <p>Dein Ticket wurde gelöst. Falls du weitere Hilfe benötigst, erstelle bitte ein neues Ticket.</p>
                )}
                {ticket.status === "closed" && (
                  <p>Dieses Ticket wurde geschlossen. Bei weiteren Fragen erstelle bitte ein neues Ticket.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No ID provided yet */}
        {!id && !loading && !error && !ticket && (
          <Card className="text-center py-12">
            <CardContent className="space-y-3">
              <SearchTwoTone className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <p className="text-muted-foreground">
                Gib oben deine Ticket-ID ein, um den aktuellen Status einzusehen.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TicketStatusPage;
