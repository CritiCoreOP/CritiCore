import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import FlairBadge from "./FlairBadge";
import { cn } from "@/lib/utils";
import { ArrowLeft as ArrowBackTwoTone, ArrowRight as ArrowForwardTwoTone, CheckCircle2 as CheckCircleTwoTone, MessagesSquare as ForumTwoTone, Gavel as GavelTwoTone, User as PersonTwoTone, Palette as StyleTwoTone } from "lucide-react";
interface Flair {
  id: string;
  name: string;
  color: string;
  bg_color: string;
  emoji: string | null;
  icon_url: string | null;
}

const FORUM_RULES = [
  { key: "respect", icon: "🤝", text: "Respektiere andere Mitglieder – keine Beleidigungen oder Hassrede." },
  { key: "spam", icon: "🚫", text: "Kein Spam, keine Eigenwerbung ohne Genehmigung." },
  { key: "nsfw", icon: "🔞", text: "Kennzeichne NSFW-Inhalte entsprechend." },
  { key: "privacy", icon: "🔒", text: "Teile keine persönlichen Daten anderer Nutzer." },
  { key: "ontopic", icon: "🎯", text: "Bleibe beim Thema der jeweiligen Community." },
  { key: "fake", icon: "❌", text: "Keine Fake-News oder absichtliche Fehlinformationen." },
];

const ForumWelcomeDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [step, setStep] = useState(0); // 0=welcome, 1=username, 2=rules, 3=flair, 4=done
  const [username, setUsername] = useState("");
  const [existingUsername, setExistingUsername] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Flair state
  const [availableFlairs, setAvailableFlairs] = useState<Flair[]>([]);
  const [selectedFlairId, setSelectedFlairId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setOpen(false); setChecked(false); return; }
    supabase
      .from("profiles")
      .select("username, forum_onboarded_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setChecked(true);
        if (data?.forum_onboarded_at) return; // already onboarded
        setExistingUsername(data?.username || null);
        setUsername(data?.username || "");
        setOpen(true);
      });
  }, [user]);

  // Load some popular community flairs for flair step
  useEffect(() => {
    if (step !== 3) return;
    supabase
      .from("forum_flairs")
      .select("id, name, color, bg_color, emoji, icon_url")
      .eq("flair_type", "user")
      .order("sort_order")
      .limit(20)
      .then(({ data }) => setAvailableFlairs((data as Flair[]) || []));
  }, [step]);

  if (!user || !checked || !open) return null;

  const handleUsernameNext = async () => {
    const trimmed = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    if (trimmed.length < 3) {
      toast.error("Username muss mindestens 3 Zeichen lang sein.");
      return;
    }
    if (trimmed.length > 30) {
      toast.error("Username darf maximal 30 Zeichen lang sein.");
      return;
    }

    // Only update if different from existing
    if (trimmed !== existingUsername) {
      setSaving(true);
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", trimmed)
        .neq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("Dieser Username ist bereits vergeben.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed, username_changed_at: new Date().toISOString() })
        .eq("user_id", user.id);

      setSaving(false);
      if (error) {
        toast.error("Fehler beim Speichern.");
        return;
      }
    }
    setStep(2);
  };

  const handleFinish = async () => {
    setSaving(true);

    // Save flair assignment if selected
    if (selectedFlairId) {
      const flair = availableFlairs.find(f => f.id === selectedFlairId);
      if (flair) {
        // Get community_id for this flair
        const { data: flairData } = await supabase
          .from("forum_flairs")
          .select("community_id")
          .eq("id", selectedFlairId)
          .single();

        if (flairData) {
          await supabase.from("forum_user_flair_assignments").upsert({
            user_id: user.id,
            flair_id: selectedFlairId,
            community_id: flairData.community_id,
          } as any, { onConflict: "user_id,community_id" });
        }
      }
    }

    // Mark forum onboarded
    await supabase
      .from("profiles")
      .update({ forum_onboarded_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);

    setSaving(false);
    setStep(4);
    setTimeout(() => setOpen(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md gap-0 p-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center px-6 py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <ForumTwoTone className="!text-4xl text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Willkommen im Forum! 🎉
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Bevor du loslegen kannst, richten wir kurz deinen Account ein. Dauert nur einen Moment!
            </p>
            <Button onClick={() => setStep(1)} className="w-full">
              Los geht's <ArrowForwardTwoTone className="!text-lg ml-1" />
            </Button>
          </div>
        )}

        {/* Step 1: Username */}
        {step === 1 && (
          <div className="px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <PersonTwoTone className="!text-2xl text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Wähle deinen Username</h2>
                <p className="text-xs text-muted-foreground">So wirst du im Forum angezeigt</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">u/</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                  placeholder="dein_username"
                  className="pl-8"
                  maxLength={30}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                3–30 Zeichen · Buchstaben, Zahlen, Unterstriche, Punkte, Bindestriche
              </p>

              {username.length >= 3 && (
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Vorschau:</span>
                  <span className="text-sm font-semibold text-foreground">u/{username}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="outline" onClick={() => setStep(0)} size="sm">
                <ArrowBackTwoTone className="!text-base mr-1" /> Zurück
              </Button>
              <Button
                onClick={handleUsernameNext}
                disabled={saving || username.trim().length < 3}
                size="sm"
                className="flex-1"
              >
                {saving ? "Speichern..." : "Weiter"} <ArrowForwardTwoTone className="!text-base ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Rules */}
        {step === 2 && (
          <div className="px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <GavelTwoTone className="!text-2xl text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Community-Regeln</h2>
                <p className="text-xs text-muted-foreground">Bitte lies und akzeptiere unsere Regeln</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
              {FORUM_RULES.map((rule) => (
                <div
                  key={rule.key}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/50"
                >
                  <span className="text-base mt-0.5 shrink-0">{rule.icon}</span>
                  <p className="text-xs text-foreground leading-relaxed">{rule.text}</p>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <Checkbox
                checked={rulesAccepted}
                onCheckedChange={(v) => setRulesAccepted(!!v)}
              />
              <span className="text-xs text-foreground">
                Ich habe die Regeln gelesen und akzeptiere sie.
              </span>
            </label>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} size="sm">
                <ArrowBackTwoTone className="!text-base mr-1" /> Zurück
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!rulesAccepted}
                size="sm"
                className="flex-1"
              >
                Weiter <ArrowForwardTwoTone className="!text-base ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: User Flair */}
        {step === 3 && (
          <div className="px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <StyleTwoTone className="!text-2xl text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Wähle dein Flair</h2>
                <p className="text-xs text-muted-foreground">Optional – zeige anderen, was dich ausmacht</p>
              </div>
            </div>

            {availableFlairs.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4 max-h-40 overflow-y-auto p-1">
                {availableFlairs.map((flair) => (
                  <button
                    key={flair.id}
                    onClick={() => setSelectedFlairId(flair.id === selectedFlairId ? null : flair.id)}
                    className={cn(
                      "rounded-full transition-all",
                      flair.id === selectedFlairId && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  >
                    <FlairBadge
                      name={flair.name}
                      color={flair.color}
                      bgColor={flair.bg_color}
                      emoji={flair.emoji}
                      iconUrl={flair.icon_url}
                      size="md"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 mb-4">
                <p className="text-sm text-muted-foreground">
                  Noch keine User-Flairs verfügbar. Du kannst später in Communities Flairs auswählen.
                </p>
              </div>
            )}

            {selectedFlairId && (
              <div className="bg-muted/50 rounded-lg p-3 mb-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Dein Flair:</span>
                {(() => {
                  const f = availableFlairs.find(fl => fl.id === selectedFlairId);
                  return f ? (
                    <FlairBadge name={f.name} color={f.color} bgColor={f.bg_color} emoji={f.emoji} iconUrl={f.icon_url} size="md" />
                  ) : null;
                })()}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} size="sm">
                <ArrowBackTwoTone className="!text-base mr-1" /> Zurück
              </Button>
              <Button
                onClick={handleFinish}
                disabled={saving}
                size="sm"
                className="flex-1"
              >
                {saving ? "Speichern..." : (selectedFlairId ? "Fertig!" : "Überspringen")}
                <CheckCircleTwoTone className="!text-base ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center px-6 py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <CheckCircleTwoTone className="!text-4xl text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Alles bereit! 🚀
            </h2>
            <p className="text-sm text-muted-foreground">
              Viel Spaß im Forum, <span className="font-semibold text-foreground">u/{username}</span>!
            </p>
          </div>
        )}

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-1.5 pb-4">
            {[0, 1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  s === step ? "bg-primary w-5" : s < step ? "bg-primary/40" : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForumWelcomeDialog;
