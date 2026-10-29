import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MailX, MailCheck, TriangleAlert } from "lucide-react";

type Status = "loading" | "ready" | "done" | "already" | "invalid";

// The function answers with JSON; the unsubscribe link in mails and the List-Unsubscribe header
// both lead here, because Supabase does not serve HTML pages from edge functions
const call = async (token: string, action: "status" | "unsubscribe") => {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ token, action }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body: body as { email?: string; unsubscribed?: boolean; error?: string } };
};

const NewsletterUnsubscribePage = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    let cancelled = false;
    call(token, "status")
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok || !body.email) { setStatus("invalid"); return; }
        setEmail(body.email);
        setStatus(body.unsubscribed ? "already" : "ready");
      })
      .catch(() => !cancelled && setStatus("invalid"));
    return () => { cancelled = true; };
  }, [token]);

  const unsubscribe = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { ok } = await call(token, "unsubscribe");
      if (ok) setStatus("done"); else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const icon = {
    loading: <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />,
    ready: <MailX className="h-6 w-6 text-primary" />,
    done: <MailCheck className="h-6 w-6 text-primary" />,
    already: <MailCheck className="h-6 w-6 text-primary" />,
    invalid: <TriangleAlert className="h-6 w-6 text-destructive" />,
  }[status];

  const title = {
    loading: t("newsletter.unsub.title"),
    ready: t("newsletter.unsub.title"),
    done: t("newsletter.unsub.doneTitle"),
    already: t("newsletter.unsub.alreadyTitle"),
    invalid: t("newsletter.unsub.invalidTitle"),
  }[status];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-28">
        <div className="w-full max-w-md" aria-live="polite">
          <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${status === "invalid" ? "bg-destructive/15" : "bg-primary/15"}`}>
            {icon}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{title}</h1>

          {status === "ready" && (
            <>
              <p className="mt-3 text-muted-foreground">{t("newsletter.unsub.question", { email })}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("newsletter.unsub.note")}</p>
              {failed && (
                <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {t("newsletter.unsub.error")}
                </p>
              )}
              <Button size="lg" onClick={unsubscribe} disabled={busy} className="mt-8 h-11 w-full active:scale-[0.98]">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("newsletter.unsub.button")}
              </Button>
            </>
          )}
          {status === "done" && <p className="mt-3 text-muted-foreground">{t("newsletter.unsub.doneText", { email })}</p>}
          {status === "already" && <p className="mt-3 text-muted-foreground">{t("newsletter.unsub.alreadyText", { email })}</p>}
          {status === "invalid" && <p className="mt-3 text-muted-foreground">{t("newsletter.unsub.invalidText")}</p>}

          {status !== "loading" && (
            <Link to="/" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              {t("common.backHome")}
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NewsletterUnsubscribePage;
