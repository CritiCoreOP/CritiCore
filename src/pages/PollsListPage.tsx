import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "@/lib/locale-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle as AddCircleTwoTone, BarChart2 as PollTwoTone } from "lucide-react";

interface Poll {
  id: string;
  title: string;
  description: string | null;
  status: string;
  multiple_choice: boolean;
  created_at: string;
}

const PollsListPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    document.title = t("polls.metaTitle", "Umfragen – CritiCore");
    loadPolls();
    if (user) checkRole();
  }, [user]);

  const checkRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .in("role", ["admin", "press"]);
    setCanCreate((data?.length ?? 0) > 0);
  };

  const loadPolls = async () => {
    const { data } = await supabase
      .from("polls")
      .select("*")
      .in("status", ["active", "closed"])
      .order("created_at", { ascending: false });
    if (data) setPolls(data as Poll[]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12 container mx-auto px-4 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <PollTwoTone className="h-7 w-7 text-accent-light" aria-hidden="true" />
            <h1 className="font-display text-3xl font-bold text-foreground">{t("polls.pageTitle", "Umfragen")}</h1>
          </div>
          {canCreate && (
            <Button onClick={() => navigate("/umfragen/erstellen")} className="gap-2">
              <AddCircleTwoTone className="h-4 w-4" aria-hidden="true" />
              {t("polls.create", "Erstellen")}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-6 py-14 text-center">
            <PollTwoTone className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
            <p className="font-display text-lg font-semibold text-foreground">{t("polls.noPolls", "Noch keine Umfragen vorhanden.")}</p>
            <p className="mx-auto mt-1 max-w-[45ch] text-sm text-muted-foreground">{t("polls.noPollsHint")}</p>
            {canCreate && (
              <Button onClick={() => navigate("/umfragen/erstellen")} className="mt-6 gap-2">
                <AddCircleTwoTone className="h-4 w-4" aria-hidden="true" />
                {t("polls.create", "Erstellen")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map(poll => (
              <Link key={poll.id} to={`/umfragen/${poll.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="border-border bg-card hover:border-primary/40 transition-colors">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="font-bold text-foreground text-lg">{poll.title}</h2>
                        {poll.description && <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{poll.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {poll.status === "closed" && <Badge variant="secondary">{t("polls.closed", "Beendet")}</Badge>}
                        {poll.multiple_choice && <Badge variant="outline">{t("polls.multi", "Mehrfach")}</Badge>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      {formatDate(poll.created_at)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PollsListPage;
