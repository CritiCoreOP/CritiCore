import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2 as CheckCircleTwoTone, Gavel as GavelTwoTone } from "lucide-react";

const DMCAPage = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    content_url: "",
    original_work_url: "",
    description: "",
    sworn_statement: false,
  });

  useEffect(() => {
    document.title = `${t("dmca.title")} – CritiCore`;
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.content_url.trim() || !form.description.trim()) {
      toast.error(t("dmca.requiredFields"));
      return;
    }
    if (!form.sworn_statement) {
      toast.error(t("dmca.swornRequired"));
      return;
    }

    setLoading(true);
    const clientId = crypto.randomUUID();
    try {
      const { error } = await supabase.from("dmca_requests").insert({
        id: clientId,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        content_url: form.content_url.trim(),
        original_work_url: form.original_work_url.trim() || null,
        description: form.description.trim(),
        sworn_statement: form.sworn_statement,
      });
      if (error) throw error;
      setTicketId(clientId);
      setSubmitted(true);

      // Send confirmation email (fire-and-forget)
      supabase.functions.invoke("send-ticket-email", {
        body: {
          email: form.email.trim(),
          ticketId: clientId,
          ticketType: "dmca",
          lang: i18n.language,
        },
      }).catch(() => {});
    } catch {
      toast.error(t("dmca.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        {submitted ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <CheckCircleTwoTone className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">{t("dmca.successTitle")}</h2>
              <p className="text-muted-foreground">{t("dmca.successDesc")}</p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                {t("support.emailDelayHint", "Die Bestätigungs-E-Mail kann einige Minuten dauern. Bitte prüfe auch deinen Spam-Ordner.")}
              </p>
              {ticketId && (
                <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border inline-block mx-auto">
                  <p className="text-xs text-muted-foreground mb-1">{t("dmca.ticketIdLabel")}</p>
                  <code className="text-sm font-mono font-bold text-primary select-all">{ticketId.slice(0, 8).toUpperCase()}</code>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <GavelTwoTone className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">{t("dmca.title")}</h1>
                <p className="text-muted-foreground">{t("dmca.subtitle")}</p>
              </div>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{t("dmca.infoTitle")}</CardTitle>
                <CardDescription>{t("dmca.infoText")}</CardDescription>
              </CardHeader>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t("dmca.fullName")} *</label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder={t("dmca.fullNamePlaceholder")}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t("dmca.email")} *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={t("dmca.emailPlaceholder")}
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("dmca.contentUrl")} *</label>
                <Input
                  value={form.content_url}
                  onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                  placeholder={t("dmca.contentUrlPlaceholder")}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("dmca.originalUrl")}</label>
                <Input
                  value={form.original_work_url}
                  onChange={(e) => setForm({ ...form, original_work_url: e.target.value })}
                  placeholder={t("dmca.originalUrlPlaceholder")}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("dmca.description")} *</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("dmca.descriptionPlaceholder")}
                  rows={5}
                  className="resize-none"
                  maxLength={5000}
                />
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
                <Checkbox
                  id="sworn"
                  checked={form.sworn_statement}
                  onCheckedChange={(checked) => setForm({ ...form, sworn_statement: checked === true })}
                />
                <label htmlFor="sworn" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  {t("dmca.swornText")}
                </label>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t("dmca.submitting") : t("dmca.submit")}
              </Button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DMCAPage;
