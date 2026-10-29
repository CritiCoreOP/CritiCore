import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Flag as FlagTwoTone, Gavel as GavelTwoTone } from "lucide-react";

interface ReportDialogProps {
  targetId: string;
  targetType: "game" | "movie" | "series" | "comment" | "article" | "review";
  targetTitle?: string;
}

export default function ReportDialog({ targetId, targetType, targetTitle }: ReportDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const REPORT_REASONS = [
    { value: "spam", label: t("report.spam") },
    { value: "insult", label: t("report.insult") },
    { value: "misinformation", label: t("report.misinformation") },
    ...(targetType === "article" ? [{ value: "wrong_information", label: t("report.wrongInformation") }] : []),
    { value: "adult_content", label: t("report.adultContent") },
    { value: "copyright", label: t("report.copyright") },
    { value: "other", label: t("report.other") },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error(t("report.loginRequired")); return; }
    if (!reason) { toast.error(t("report.reasonRequired")); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from("reports").insert({
        target_id: targetId, target_type: targetType, reason,
        description: description || null, reporter_id: user.id, status: "open",
      });
      if (error) throw error;
      toast.success(t("report.success"));
      setOpen(false); setReason(""); setDescription("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error(t("report.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" title={t("report.buttonTitle")} aria-label={t("report.buttonTitle")}>
          <FlagTwoTone className="w-4 h-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("report.title")}</DialogTitle>
          <DialogDescription>
            {targetTitle ? t("report.reportTarget", { title: targetTitle }) : t("report.defaultDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label id="report-reason-label" className="text-sm font-medium">{t("report.reason")}</label>
            <Select name="reason" value={reason} onValueChange={setReason}>
              <SelectTrigger aria-labelledby="report-reason-label"><SelectValue placeholder={t("report.reasonPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="report-description" className="text-sm font-medium">{t("report.descriptionLabel")}</label>
            <Textarea id="report-description" name="description" placeholder={t("report.descriptionPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" rows={4} />
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
            <GavelTwoTone className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <p>
              {t("report.dmcaHint")}{" "}
              <Link to="/dmca" className="text-primary hover:underline font-medium" onClick={() => setOpen(false)}>
                {t("report.dmcaLink")}
              </Link>
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("report.cancel")}</Button>
            <Button type="submit" disabled={loading || !reason} className="bg-destructive hover:bg-destructive/90">
              {loading ? t("report.submitting") : t("report.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
