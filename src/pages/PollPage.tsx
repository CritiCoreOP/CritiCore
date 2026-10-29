import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDataOptOut } from "@/hooks/useDataOptOut";
import { Ban as BlockTwoTone, CheckCircle2 as CheckCircleTwoTone, Trash as DeleteTwoTone, Vote as HowToVoteTwoTone, BarChart2 as PollTwoTone, Share2 as ShareTwoTone } from "lucide-react";

interface Poll {
  id: string;
  title: string;
  description: string | null;
  text_prompt: string | null;
  status: string;
  multiple_choice: boolean;
  created_by: string;
  created_at: string;
}

interface PollOption {
  id: string;
  label: string;
  sort_order: number;
}

interface VoteCount {
  option_id: string;
  count: number;
}

interface VoteReason {
  reason: string;
}

const PollPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { guardOptOut } = useDataOptOut();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<VoteCount[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [reasons, setReasons] = useState<VoteReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (id) loadPoll();
  }, [id, user]);

  const loadPoll = async () => {
    const [pollRes, optRes] = await Promise.all([
      supabase.from("polls").select("*").eq("id", id!).single(),
      supabase.from("poll_options").select("*").eq("poll_id", id!).order("sort_order"),
    ]);

    if (pollRes.data) {
      const p = pollRes.data as Poll;
      setPoll(p);
      setIsOwner(user?.id === p.created_by);
    }
    if (optRes.data) setOptions(optRes.data as PollOption[]);

    // Use aggregate function for vote counts (no user_id exposed)
    const { data: countData } = await supabase.rpc("get_poll_vote_counts", { p_poll_id: id! });
    if (countData) {
      setVotes(countData.map((v: any) => ({ option_id: v.option_id, count: Number(v.count) })));
    }

    // Use aggregate function for reasons (no user_id exposed)
    const { data: reasonData } = await supabase.rpc("get_poll_reasons", { p_poll_id: id! });
    if (reasonData) setReasons(reasonData.filter((r: any) => r.reason) as VoteReason[]);

    // Load own votes (RLS restricted to own user)
    if (user) {
      const { data: uv } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", id!)
        .eq("user_id", user.id);
      if (uv) setUserVotes(uv.map((v: any) => v.option_id));
    }

    setLoading(false);
  };

  const totalVotes = useMemo(() => votes.reduce((sum, v) => sum + v.count, 0), [votes]);
  const hasVoted = userVotes.length > 0;

  const toggleSelection = (optionId: string) => {
    if (poll?.multiple_choice) {
      setSelected(prev => prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]);
    } else {
      setSelected([optionId]);
    }
  };

  const handleVote = async () => {
    if (guardOptOut()) return;
    if (!user) {
      toast.error(t("polls.loginRequired", "Bitte melde dich an, um abzustimmen."));
      return;
    }
    if (selected.length === 0) return;

    setVoting(true);
    const rows = selected.map(option_id => ({
      poll_id: id!,
      option_id,
      user_id: user.id,
      reason: reason.trim() || null,
    }));
    const { error } = await supabase.from("poll_votes").insert(rows);

    if (error) {
      toast.error(t("polls.voteError", "Fehler beim Abstimmen."));
    } else {
      toast.success(t("polls.voted", "Stimme abgegeben!"));
      setReason("");
      loadPoll();
    }
    setVoting(false);
  };

  const handleClose = async () => {
    const { error } = await supabase.from("polls").update({ status: "closed" }).eq("id", id!);
    if (error) {
      toast.error(t("polls.closeError", "Fehler beim Schließen."));
    } else {
      toast.success(t("polls.closedSuccess", "Umfrage geschlossen."));
      loadPoll();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("polls").delete().eq("id", id!);
    if (error) {
      toast.error(t("polls.deleteError", "Fehler beim Löschen."));
    } else {
      toast.success(t("polls.deleted", "Umfrage gelöscht."));
      navigate("/umfragen");
    }
  };

  const getVoteCount = (optionId: string) => votes.find(v => v.option_id === optionId)?.count || 0;
  const getPercent = (optionId: string) => totalVotes === 0 ? 0 : Math.round((getVoteCount(optionId) / totalVotes) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-24 pb-12 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("polls.notFound", "Umfrage nicht gefunden")}</h1>
        </main>
        <Footer />
      </div>
    );
  }

  const isClosed = poll.status === "closed";

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12 container mx-auto px-4 max-w-2xl">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <PollTwoTone className="!text-2xl text-primary" />
                  {isClosed && <Badge variant="secondary">{t("polls.closed", "Beendet")}</Badge>}
                  {poll.multiple_choice && <Badge variant="outline">{t("polls.multipleChoice", "Mehrfachauswahl")}</Badge>}
                </div>
                <CardTitle className="text-foreground text-xl">{poll.title}</CardTitle>
                {poll.description && <CardDescription className="mt-2">{poll.description}</CardDescription>}
              </div>
              <button
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) {
                    navigator.share({ title: poll.title, url });
                  } else {
                    navigator.clipboard.writeText(url);
                    toast.success(t("polls.linkCopied", "Link kopiert!"));
                  }
                }}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0"
              >
                <ShareTwoTone className="!text-xl" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalVotes} {t("polls.votesCount", "Stimmen")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map(opt => {
              const percent = getPercent(opt.id);
              const count = getVoteCount(opt.id);
              const isUserVote = userVotes.includes(opt.id);
              const isSelected = selected.includes(opt.id);

              if (hasVoted || isClosed) {
                return (
                  <div key={opt.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`text-foreground ${isUserVote ? "font-bold" : ""}`}>
                        {isUserVote && <CheckCircleTwoTone className="!text-sm text-primary mr-1 -mt-0.5 inline" />}
                        {opt.label}
                      </span>
                      <span className="text-muted-foreground">{count} ({percent}%)</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleSelection(opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card hover:border-primary/50 text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}

            {/* Text prompt field before voting */}
            {!hasVoted && !isClosed && poll.text_prompt && selected.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-foreground">{poll.text_prompt}</p>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t("polls.reasonPlaceholder", "Deine Antwort (optional)...")}
                  maxLength={500}
                  rows={2}
                  className="bg-background"
                />
              </div>
            )}

            {!hasVoted && !isClosed && (
              <Button onClick={handleVote} disabled={voting || selected.length === 0} className="w-full gap-2 mt-4">
                <HowToVoteTwoTone className="!text-lg" />
                {voting ? t("common.loading") : t("polls.vote", "Abstimmen")}
              </Button>
            )}

            {/* Show text responses to owner after votes */}
            {isOwner && reasons.length > 0 && (
              <div className="pt-6 border-t border-border space-y-3">
                <h3 className="text-sm font-bold text-foreground">{t("polls.responses", "Antworten")} ({reasons.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reasons.map((r, i) => (
                    <div key={i} className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      "{r.reason}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                {!isClosed && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <BlockTwoTone className="!text-base" />
                        {t("polls.close", "Schließen")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("polls.closeConfirmTitle", "Umfrage schließen?")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("polls.closeConfirmDesc", "Danach kann niemand mehr abstimmen. Die Ergebnisse bleiben sichtbar.")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClose}>{t("polls.close", "Schließen")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1">
                      <DeleteTwoTone className="!text-base" />
                      {t("common.delete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("polls.deleteConfirmTitle", "Umfrage löschen?")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("polls.deleteConfirmDesc", "Die Umfrage und alle Stimmen werden unwiderruflich gelöscht.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PollPage;
