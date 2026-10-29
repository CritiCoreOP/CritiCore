import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/locale-router";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDataOptOut } from "@/hooks/useDataOptOut";
import { PlusCircle as AddCircleTwoTone, BarChart2 as PollTwoTone, MinusCircle as RemoveCircleTwoTone } from "lucide-react";

const CreatePollPage = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { guardOptOut } = useDataOptOut();
  const [canCreate, setCanCreate] = useState(false);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [textPrompt, setTextPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      checkRole();
    }
  }, [user, authLoading]);

  const checkRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .in("role", ["admin", "press"]);
    setCanCreate((data?.length ?? 0) > 0);
    setChecking(false);
  };

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardOptOut()) return;
    const trimmedOptions = options.map(o => o.trim()).filter(Boolean);
    if (!title.trim() || trimmedOptions.length < 2) {
      toast.error(t("polls.validationError", "Titel und mindestens 2 Optionen sind erforderlich."));
      return;
    }

    setSubmitting(true);
    const { data: poll, error } = await supabase
      .from("polls")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        created_by: user!.id,
        multiple_choice: multipleChoice,
        text_prompt: textPrompt.trim() || null,
      })
      .select("id")
      .single();

    if (error || !poll) {
      toast.error(t("polls.createError", "Fehler beim Erstellen der Umfrage."));
      setSubmitting(false);
      return;
    }

    const optionRows = trimmedOptions.map((label, i) => ({
      poll_id: poll.id,
      label,
      sort_order: i,
    }));

    const { error: optErr } = await supabase.from("poll_options").insert(optionRows);
    if (optErr) {
      toast.error(t("polls.createError", "Fehler beim Erstellen der Optionen."));
      setSubmitting(false);
      return;
    }

    toast.success(t("polls.created", "Umfrage erstellt!"));
    navigate(`/umfragen/${poll.id}`);
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-24 pb-12 container mx-auto px-4 max-w-2xl text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("polls.accessDenied", "Zugriff verweigert")}</h1>
          <p className="text-muted-foreground mt-2">{t("polls.accessDeniedDesc", "Nur Admins und Presse können Umfragen erstellen.")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12 container mx-auto px-4 max-w-2xl">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <PollTwoTone className="!text-2xl text-primary" />
              {t("polls.createTitle", "Umfrage erstellen")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-foreground">{t("polls.titleLabel", "Titel")}</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t("polls.titlePlaceholder", "Worum geht es in der Umfrage?")}
                  maxLength={200}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">{t("polls.descLabel", "Beschreibung (optional)")}</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t("polls.descPlaceholder", "Zusätzliche Details...")}
                  maxLength={1000}
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-foreground">{t("polls.optionsLabel", "Antwortmöglichkeiten")}</Label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={e => updateOption(idx, e.target.value)}
                      placeholder={`${t("polls.option", "Option")} ${idx + 1}`}
                      maxLength={200}
                    />
                    {options.length > 2 && (
                      <button type="button" onClick={() => removeOption(idx)} className="text-destructive hover:text-destructive/80 transition-colors">
                        <RemoveCircleTwoTone className="!text-xl" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1">
                    <AddCircleTwoTone className="!text-base" />
                    {t("polls.addOption", "Option hinzufügen")}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">{t("polls.textPromptLabel", "Textfrage nach Abstimmung (optional)")}</Label>
                <Input
                  value={textPrompt}
                  onChange={e => setTextPrompt(e.target.value)}
                  placeholder={t("polls.textPromptPlaceholder", "z.B. Wieso hast du das ausgewählt?")}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">{t("polls.textPromptHint", "Wird nach der Abstimmung als Freitextfeld angezeigt.")}</p>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={multipleChoice} onCheckedChange={setMultipleChoice} />
                <Label className="text-foreground">{t("polls.multipleChoice", "Mehrfachauswahl erlauben")}</Label>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? t("common.loading") : t("polls.publish", "Umfrage veröffentlichen")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default CreatePollPage;
