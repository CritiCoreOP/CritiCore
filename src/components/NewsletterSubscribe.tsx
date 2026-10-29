import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDataOptOut } from "@/hooks/useDataOptOut";
import { Mail as MailOutlineTwoTone } from "lucide-react";
import { cn } from "@/lib/utils";

/** compact: stacked for narrow places like the portal side rail */
const NewsletterSubscribe = ({ compact = false }: { compact?: boolean }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { guardOptOut } = useDataOptOut();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (guardOptOut()) return;
    const subEmail = user?.email || email;
    if (!subEmail || !subEmail.includes("@")) {
      toast.error(t("newsletter.invalidEmail"));
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-newsletter-confirm", {
        body: { email: subEmail, lang: i18n.language },
      });

      if (error) {
        toast.error(t("newsletter.error"));
      } else {
        toast.success(t("newsletter.confirmSent"));
        setEmail("");
      }
    } catch {
      toast.error(t("newsletter.error"));
    }

    setLoading(false);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-primary/[0.06] via-card to-card", compact ? "p-5" : "p-6 md:p-8")}>
      {/* Decorative glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className={cn("relative flex flex-col gap-6", compact ? "gap-4" : "md:flex-row md:items-center")}>
        {/* Text */}
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15">
              <MailOutlineTwoTone className="w-4 h-4 text-primary" />
            </span>
            <h3 className="font-display font-bold text-lg text-foreground">{t("newsletter.title")}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{t("newsletter.description")}</p>
        </div>

        {/* Input */}
        {/* Stacked on phones: side by side the placeholder was cut to "Deine E-Mail-Adres" */}
        <div className={cn("flex flex-col gap-2 w-full", !compact && "sm:flex-row md:w-auto md:min-w-[340px]")}>
          {user ? (
            <Button onClick={handleSubscribe} disabled={loading} className="w-full rounded-xl">
              {loading ? t("newsletter.subscribing") : t("newsletter.subscribeButton")}
            </Button>
          ) : (
            <>
              <Input
                type="email"
                autoComplete="email"
                enterKeyHint="send"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubscribe(); }}
                placeholder={t("newsletter.emailPlaceholder")}
                aria-label={t("newsletter.emailPlaceholder")}
                className="flex-1 rounded-xl bg-background/60 border-border/50"
              />
              <Button onClick={handleSubscribe} disabled={loading} className="rounded-xl px-6">
                {loading ? "..." : t("newsletter.subscribeButton")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsletterSubscribe;
