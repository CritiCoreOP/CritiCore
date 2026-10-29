import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "@/lib/locale-router";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban as BlockTwoTone, CheckCircle2 as CheckCircleTwoTone, Heart as FavoriteTwoTone, HandHeart as VolunteerActivismTwoTone } from "lucide-react";

const presetAmounts = [3, 5, 10, 25, 50];

const DonatePage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    document.title = t("donate.pageTitle");
  }, [t]);

  const handleDonate = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      toast.error(t("donate.minError"));
      return;
    }
    if (numAmount > 1000) {
      toast.error(t("donate.maxError"));
      return;
    }

    setLoading(true);
    try {
      const cents = Math.round(numAmount * 100);
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: {
          amount: cents,
          currency: "eur",
          successUrl: `${origin}/spenden?success=true`,
          cancelUrl: `${origin}/spenden?canceled=true`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Donation error:", err);
      toast.error(t("donate.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        {/* Success state */}
        {success && (
          <Card className="mb-8 border-green-500/30 bg-green-500/5">
            <CardContent className="flex items-center gap-3 p-6">
              <CheckCircleTwoTone className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-bold text-foreground">{t("donate.successTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("donate.successMessage")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {canceled && (
          <Card className="mb-8 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="flex items-center gap-3 p-6">
              <BlockTwoTone className="w-8 h-8 text-yellow-500" />
              <div>
                <h3 className="font-bold text-foreground">{t("donate.canceledTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("donate.canceledMessage")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FavoriteTwoTone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            {t("donate.title")}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t("donate.subtitle")}
          </p>
        </div>

        {/* Why donate */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FavoriteTwoTone className="w-5 h-5 text-accent-light" aria-hidden="true" />
              {t("donate.whyTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {(["reason1", "reason2", "reason3", "reason4"] as const).map((key) => (
                <li key={key} className="flex items-start gap-2.5">
                  <CheckCircleTwoTone className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
                  <span>{t(`donate.${key}`)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Donation form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <VolunteerActivismTwoTone className="w-5 h-5 text-primary" />
              {t("donate.formTitle")}
            </CardTitle>
            <CardDescription>{t("donate.formDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === String(preset) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(String(preset))}
                >
                  {preset} €
                </Button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  step="0.5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("donate.amountPlaceholder")}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              </div>
              <Button onClick={handleDonate} disabled={loading || !amount} className="min-w-[140px]">
                {loading ? "..." : t("donate.donateButton")}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {t("donate.stripeNote")}
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default DonatePage;
