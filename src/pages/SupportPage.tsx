import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "@/lib/locale-router";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { Copyright as CopyrightTwoTone, CheckCircle2 as CheckCircleTwoTone, Mail as EmailTwoTone, Ticket as TicketTwoTone, Headphones as SupportAgentTwoTone } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LEGAL_ENTITY } from "@/lib/legalEntity";

/** FAQ entries, answered in support.faqItems.<key>.q / .a */
const FAQ_KEYS = ["login", "redaim", "deleteAccount", "myData", "newsletter", "ticket"] as const;

const SupportPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "general",
    message: "",
  });

  useEffect(() => {
    setSeo({
      title: t("meta.support.title"),
      description: t("meta.support.description"),
      url: "/support",
    });
    return () => cleanupSeo();
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast.error(t("support.requiredFields"));
      return;
    }

    setLoading(true);
    try {
      const ticketId = crypto.randomUUID();
      const { error } = await supabase.from("support_tickets").insert({
        id: ticketId,
        user_id: user?.id || null,
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        category: form.category,
        message: form.message.trim(),
      });
      if (error) throw error;
      setSubmitted(true);

      // Send confirmation email (fire-and-forget)
      supabase.functions.invoke("send-ticket-email", {
        body: {
          email: form.email.trim(),
          ticketId,
          ticketType: "support",
          subject: form.subject.trim(),
          lang: i18n.language,
        },
      }).catch(() => {});
    } catch {
      toast.error(t("support.error"));
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "general", label: t("support.catGeneral") },
    { value: "bug", label: t("support.catBug") },
    { value: "account", label: t("support.catAccount") },
    { value: "content", label: t("support.catContent") },
    { value: "dmca", label: t("support.catDmca") },
    { value: "other", label: t("support.catOther") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <SupportAgentTwoTone className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("support.title")}</h1>
            <p className="text-muted-foreground">{t("support.subtitle")}</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 mb-8">
          <Card className="relative transition-colors hover:border-primary/50 focus-within:border-primary/50">
            <CardContent className="flex items-center gap-4 p-4 sm:flex-col sm:gap-2 sm:p-6 sm:text-center">
              <EmailTwoTone className="h-7 w-7 shrink-0 text-accent-light sm:h-8 sm:w-8" aria-hidden="true" />
              <div className="min-w-0 sm:space-y-1">
                <h2 className="font-semibold text-foreground text-sm">{t("support.contactEmail")}</h2>
                <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-xs text-accent-light hover:underline after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">{LEGAL_ENTITY.email}</a>
              </div>
            </CardContent>
          </Card>
          <Card className="relative transition-colors hover:border-primary/50 focus-within:border-primary/50">
            <CardContent className="flex items-center gap-4 p-4 sm:flex-col sm:gap-2 sm:p-6 sm:text-center">
              <TicketTwoTone className="h-7 w-7 shrink-0 text-accent-light sm:h-8 sm:w-8" aria-hidden="true" />
              <div className="min-w-0 sm:space-y-1">
                <h2 className="font-semibold text-foreground text-sm">{t("support.ticketStatus")}</h2>
                <Link to="/ticket" className="text-xs text-accent-light hover:underline after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">{t("support.checkTicket")}</Link>
              </div>
            </CardContent>
          </Card>
          <Card className="relative transition-colors hover:border-primary/50 focus-within:border-primary/50">
            <CardContent className="flex items-center gap-4 p-4 sm:flex-col sm:gap-2 sm:p-6 sm:text-center">
              <CopyrightTwoTone className="h-7 w-7 shrink-0 text-accent-light sm:h-8 sm:w-8" aria-hidden="true" />
              <div className="min-w-0 sm:space-y-1">
                <h2 className="font-semibold text-foreground text-sm">{t("support.dmcaLink")}</h2>
                <Link to="/dmca" className="text-xs text-accent-light hover:underline after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">{t("support.fileDmca")}</Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {submitted ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <CheckCircleTwoTone className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">{t("support.successTitle")}</h2>
              <p className="text-muted-foreground">{t("support.successDesc")}</p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                {t("support.emailDelayHint", "Die Bestätigungs-E-Mail kann einige Minuten dauern. Bitte prüfe auch deinen Spam-Ordner.")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle as="h2">{t("support.formTitle")}</CardTitle>
              <CardDescription>{t("support.formDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="support-name" className="text-sm font-medium text-foreground">{t("support.name")} *</label>
                    <Input
                      id="support-name"
                      name="name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t("support.namePlaceholder")}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="support-email" className="text-sm font-medium text-foreground">{t("support.email")} *</label>
                    <Input
                      id="support-email"
                      name="email"
                      autoComplete="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={t("support.emailPlaceholder")}
                      maxLength={255}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="support-subject" className="text-sm font-medium text-foreground">{t("support.subject")} *</label>
                    <Input
                      id="support-subject"
                      name="subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder={t("support.subjectPlaceholder")}
                      maxLength={300}
                    />
                  </div>
                  <div className="space-y-2">
                    <label id="support-category-label" className="text-sm font-medium text-foreground">{t("support.category")}</label>
                    <Select name="category" value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger aria-labelledby="support-category-label"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="support-message" className="text-sm font-medium text-foreground">{t("support.message")} *</label>
                  <Textarea
                    id="support-message"
                    name="message"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={t("support.messagePlaceholder")}
                    rows={6}
                    className="resize-none"
                    maxLength={5000}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? t("support.submitting") : t("support.submit")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <section aria-labelledby="support-faq" className="mt-12">
          <h2 id="support-faq" className="font-display text-2xl font-bold text-foreground mb-4">{t("support.faqTitle")}</h2>
          <Accordion type="single" collapsible className="rounded-xl border border-border/60 bg-card px-5">
            {FAQ_KEYS.map((key) => (
              <AccordionItem key={key} value={key} className="last:border-b-0">
                <AccordionTrigger as="h3" className="text-left text-sm font-semibold">
                  {t(`support.faqItems.${key}.q`)}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {t(`support.faqItems.${key}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SupportPage;
