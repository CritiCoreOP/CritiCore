import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper as NewspaperTwoTone } from "lucide-react";

const MAX_APPLICATIONS = 3;

interface PressApplicationDialogProps {
  userId: string;
  onSubmitted: () => void;
}

const PressApplicationDialog = ({ userId, onSubmitted }: PressApplicationDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [organization, setOrganization] = useState("");
  const [pressIdNumber, setPressIdNumber] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [intention, setIntention] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const loadCount = async () => {
      const { count } = await supabase
        .from("press_profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      setApplicationCount(count ?? 0);
    };
    loadCount();
  }, [userId]);

  const remainingAttempts = MAX_APPLICATIONS - applicationCount;
  const canApply = remainingAttempts > 0;

  const handleSubmit = async () => {
    if (!canApply) {
      toast({ title: t("save.error"), description: t("press.errorMaxReached"), variant: "destructive" });
      return;
    }
    if (!fullName.trim() || !organization.trim() || !mediaType.trim() || !intention.trim()) {
      toast({ title: t("save.error"), description: t("press.errorRequired"), variant: "destructive" });
      return;
    }
    if (!agreeTerms || !agreeRules) {
      toast({ title: t("save.error"), description: t("press.errorAgree"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("press_profiles").insert({
      user_id: userId,
      organization: organization.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("save.error"), description: t("press.errorSubmit"), variant: "destructive" });
      return;
    }
    toast({ title: t("press.successTitle"), description: t("press.successDesc") });
    setOpen(false);
    resetForm();
    setApplicationCount((c) => c + 1);
    onSubmitted();
  };

  const resetForm = () => {
    setFullName("");
    setBirthDate("");
    setOrganization("");
    setPressIdNumber("");
    setMediaType("");
    setIntention("");
    setAgreeTerms(false);
    setAgreeRules(false);
  };

  if (!canApply) {
    return (
      <div className="text-sm text-muted-foreground italic">
        {t("press.maxReached")}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <NewspaperTwoTone className="w-4 h-4" />
          {t("press.apply")}
          {applicationCount > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              ({t("press.attemptsLeft", { count: remainingAttempts })})
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t("press.title")}</DialogTitle>
          <DialogDescription>{t("press.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4 py-2">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="press-fullname">{t("press.fullNameLabel")}</Label>
              <Input id="press-fullname" placeholder={t("press.fullNamePlaceholder")} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            {/* Birth Date */}
            <div className="space-y-2">
              <Label htmlFor="press-birthdate">{t("press.birthDateLabel")}</Label>
              <Input id="press-birthdate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="press-org">{t("press.organizationLabel")}</Label>
              <Input id="press-org" placeholder={t("press.organizationPlaceholder")} value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>

            {/* Press ID (optional) */}
            <div className="space-y-2">
              <Label htmlFor="press-id">{t("press.pressIdLabel")}</Label>
              <Input id="press-id" placeholder={t("press.pressIdPlaceholder")} value={pressIdNumber} onChange={(e) => setPressIdNumber(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("press.pressIdHint")}</p>
            </div>

            {/* Media Type */}
            <div className="space-y-2">
              <Label htmlFor="press-media">{t("press.mediaTypeLabel")}</Label>
              <Input id="press-media" placeholder={t("press.mediaTypePlaceholder")} value={mediaType} onChange={(e) => setMediaType(e.target.value)} />
            </div>

            {/* Intention */}
            <div className="space-y-2">
              <Label htmlFor="press-intention">{t("press.intentionLabel")}</Label>
              <Textarea id="press-intention" placeholder={t("press.intentionPlaceholder")} value={intention} onChange={(e) => setIntention(e.target.value)} rows={3} />
            </div>

            {/* Agreements */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-start gap-3">
                <Checkbox id="press-agree-terms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v === true)} className="mt-0.5" />
                <Label htmlFor="press-agree-terms" className="text-sm font-normal leading-snug cursor-pointer">
                  {t("press.agreeTerms")}
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="press-agree-rules" checked={agreeRules} onCheckedChange={(v) => setAgreeRules(v === true)} className="mt-0.5" />
                <Label htmlFor="press-agree-rules" className="text-sm font-normal leading-snug cursor-pointer">
                  {t("press.agreeRules")}
                </Label>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("press.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={submitting || !agreeTerms || !agreeRules}>
            {submitting ? t("press.submitting") : t("press.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PressApplicationDialog;
