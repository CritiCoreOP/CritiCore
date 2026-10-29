import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import type { AuthError } from "@supabase/supabase-js";
import { Link, useNavigate, useSearchParams } from "@/lib/locale-router";
import { getCurrentLocale, getLocaleFromPath } from "@/lib/localeRouting";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountActions, useSavedAccounts } from "@/hooks/useSavedAccounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTrendingMovies, getTrendingSeries, tmdbImage } from "@/lib/api";
import { iwdFullLogo } from "@/hooks/useIwdLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Github, Loader2, MailCheck } from "lucide-react";

type Mode = "signin" | "signup" | "otp" | "forgot" | "reset";
// "form" collects email (and password); "code" waits for the code from the mail
type Step = "form" | "code";

const PASSWORD_MIN = 8;
const RESEND_SECONDS = 60;
const MODES: Mode[] = ["signin", "signup", "otp", "forgot", "reset"];

// Supabase error codes → texts; anything unknown falls back to the server message
const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: "auth.errors.invalidCredentials",
  email_not_confirmed: "auth.errors.emailNotConfirmed",
  user_already_exists: "auth.errors.userExists",
  email_exists: "auth.errors.userExists",
  weak_password: "auth.errors.weakPassword",
  over_email_send_rate_limit: "auth.errors.rateLimit",
  over_request_rate_limit: "auth.errors.rateLimit",
  otp_expired: "auth.errors.codeInvalid",
  otp_disabled: "auth.errors.noAccount",
  signup_disabled: "auth.errors.noAccount",
  email_address_invalid: "auth.errors.emailInvalid",
  validation_failed: "auth.errors.emailInvalid",
  same_password: "auth.errors.samePassword",
};

/* ── Poster wall: the left half on large screens, real covers from this week's trends ── */
function PosterWall() {
  const { data } = useQuery({
    queryKey: ["auth-poster-wall"],
    queryFn: async () => {
      const [movies, series] = await Promise.all([getTrendingMovies(), getTrendingSeries()]);
      return [...movies.results, ...series.results]
        .map((m) => tmdbImage(m.poster_path, "w342"))
        .filter((src): src is string => !!src)
        .slice(0, 15);
    },
    staleTime: 60 * 60 * 1000,
  });
  const posters = data ?? [];
  // Three columns, the middle one shifted down, so the wall does not read as a grid
  const columns = [0, 1, 2].map((c) => posters.filter((_, i) => i % 3 === c));

  return (
    <div aria-hidden className="absolute inset-0 grid grid-cols-3 gap-4 p-4 opacity-60">
      {columns.map((col, c) => (
        <div key={c} className={cn("flex flex-col gap-4", c === 1 && "-mt-24", c === 2 && "-mt-10")}>
          {(col.length ? col : Array.from({ length: 5 }, () => null)).map((src, i) =>
            src ? (
              <img
                key={src}
                src={src}
                alt=""
                loading="lazy"
                className="aspect-[2/3] w-full rounded-xl object-cover opacity-0 transition-opacity duration-700 motion-reduce:transition-none"
                onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
              />
            ) : (
              <div key={i} className="aspect-[2/3] w-full rounded-xl bg-muted/40" />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

const Logo = () => (
  <Link to="/" aria-label="CritiCore" className="inline-flex w-fit">
    <img src={iwdFullLogo} alt="CritiCore" width="184" height="40" className="h-8 w-auto select-none" draggable={false} />
  </Link>
);

function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background text-foreground">
      <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="relative hidden overflow-hidden border-r border-border/60 bg-card lg:block">
          <PosterWall />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/30" />
          <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
            <Logo />
            <div className="max-w-md">
              <h2 className="font-display text-4xl font-bold leading-[1.08] tracking-tight xl:text-5xl">{t("auth.brandHeadline")}</h2>
              <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">{t("auth.brandDesc")}</p>
            </div>
          </div>
        </aside>

        <main className="flex min-h-[100dvh] flex-col px-5 py-8 sm:px-10">
          <div className="lg:hidden"><Logo /></div>
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-sm">{children}</div>
          </div>
          <p className="mx-auto w-full max-w-sm text-xs leading-relaxed text-muted-foreground">
            <Trans
              i18nKey="auth.legalNotice"
              components={{
                terms: <Link to="/agb" className="underline underline-offset-4 hover:text-foreground" />,
                privacy: <Link to="/datenschutz" className="underline underline-offset-4 hover:text-foreground" />,
              }}
            />
          </p>
        </main>
      </div>
    </div>
  );
}

function GoogleMark() {
  // Google's brand mark, which has to be shown in its own colours
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type OAuthProvider = "google" | "github";

const OAUTH: Record<OAuthProvider, { name: string; labelKey: string; icon: React.ReactNode }> = {
  google: { name: "Google", labelKey: "auth.continueWithGoogle", icon: <GoogleMark /> },
  github: { name: "GitHub", labelKey: "auth.continueWithGithub", icon: <Github className="h-5 w-5" aria-hidden /> },
};

/**
 * Social logins that are switched on in Supabase (Authentication → Providers), read from the public
 * auth settings. A provider only gets a button once it works; until the answer is in, Google shows
 * as before and GitHub stays hidden.
 */
function useOAuthProviders(): OAuthProvider[] {
  const { data } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      if (!res.ok) throw new Error(`auth settings ${res.status}`);
      return ((await res.json()).external ?? null) as Record<string, boolean> | null;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  return (Object.keys(OAUTH) as OAuthProvider[]).filter((p) => (data ? !!data[p] : p === "google"));
}

function PasswordInput({
  id, value, onChange, autoComplete, invalid, describedBy,
}: {
  id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean; describedBy?: string;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="h-11 pr-11"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label htmlFor="auth-code">{t("auth.codeLabel")}</Label>
      <Input
        id="auth-code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        className="h-14 text-center font-mono text-2xl tracking-[0.4em] placeholder:tracking-[0.4em] placeholder:text-muted-foreground/40 md:text-2xl"
        required
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
   ───────────────────────────────────────────── */
const AuthPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  // ?add=1 from the account menu: sign in a second account while the current one stays signed in
  const adding = searchParams.get("add") === "1";
  const addingFrom = useRef<string | null | undefined>(undefined);
  const savedAccounts = useSavedAccounts(user?.id);
  const { switchTo } = useAccountActions();

  const initialMode = searchParams.get("mode") as Mode | null;
  const [mode, setMode] = useState<Mode>(initialMode && MODES.includes(initialMode) ? initialMode : "signin");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);
  const oauthProviders = useOAuthProviders();
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Set while a recovery code has been accepted but the new password is not saved yet: the session
  // exists already, and the usual "logged in → leave the page" would skip the password step
  const holdRedirect = useRef(mode === "reset");
  const recoveryVerified = useRef(false);

  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");
  const [tgnBusy, setTgnBusy] = useState(!!(token && emailParam));

  // Only targets on this origin; "/\evil.com" resolves to "//evil.com" in browsers, so the prefix alone is not enough.
  // `redirect` is what invite links use, `next` everything else.
  const nextParam = searchParams.get("next") ?? searchParams.get("redirect");
  const safeNext = (() => {
    if (!nextParam?.startsWith("/")) return null;
    const url = new URL(nextParam, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : null;
  })();

  const leave = () => {
    if (safeNext) window.location.href = safeNext;
    else navigate("/", { replace: true });
  };

  useEffect(() => {
    if (authLoading) return;
    if (adding && addingFrom.current === undefined) addingFrom.current = user?.id ?? null;
    // While adding, only the new account's sign-in counts, not the account that opened the page
    const signedIn = adding ? !!user && user.id !== addingFrom.current : !!user;
    if (signedIn && !holdRedirect.current) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Partner login (TGN) hands over a one-time token in the URL
  useEffect(() => {
    if (!token || !emailParam) return;
    (async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("validate-tgn-token", {
          body: { email: emailParam, token, redirect_uri: window.location.origin },
        });
        if (invokeError) throw invokeError;
        if (!data.success) throw new Error(data.error || t("auth.tokenValidationFailed"));
        if (data.token_hash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: data.token_hash });
          if (verifyError) throw verifyError;
        }
        navigate("/", { replace: true });
      } catch (err) {
        console.error("TGN login error:", err);
        setError(err instanceof Error ? err.message : t("auth.loginFailed"));
        setTgnBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, emailParam]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep("form");
    setError(null);
    setUnconfirmed(false);
    setCode("");
    setPassword("");
    holdRedirect.current = next === "reset";
    const params = new URLSearchParams(searchParams);
    if (next === "signin") params.delete("mode"); else params.set("mode", next);
    setSearchParams(params, { replace: true });
  };

  const showError = (err: AuthError | Error | null, fallbackKey = "auth.errors.generic") => {
    if (!err) return;
    const key = "code" in err && err.code ? ERROR_KEYS[err.code] : undefined;
    setError(key ? t(key) : err.message || t(fallbackKey));
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await action(); } finally { setBusy(false); }
  };

  const locale = getLocaleFromPath(window.location.pathname) || getCurrentLocale();
  const userMeta = { locale: i18n.language };

  /* ── actions ── */
  const signIn = () => run(async () => {
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setUnconfirmed(err.code === "email_not_confirmed");
      showError(err);
    }
  });

  const signUp = () => run(async () => {
    if (password.length < PASSWORD_MIN) { setError(t("auth.errors.passwordTooShort")); return; }
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // The confirmation link lands on the start page, which is always an allowed redirect
      options: { emailRedirectTo: window.location.origin, data: userMeta },
    });
    if (err) { showError(err); return; }
    // Existing addresses also end up here (Supabase does not reveal them); the mail explains the rest
    setStep("code");
    setCooldown(RESEND_SECONDS);
  });

  const sendOtp = () => run(async () => {
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Login only: new accounts go through the registration with a password
      options: { shouldCreateUser: false, data: userMeta },
    });
    if (err) { showError(err); return; }
    setStep("code");
    setCooldown(RESEND_SECONDS);
  });

  const sendRecovery = () => run(async () => {
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/${locale}/auth?mode=reset`,
    });
    if (err) { showError(err); return; }
    setStep("code");
    setCooldown(RESEND_SECONDS);
  });

  const verifyCode = (type: "email" | "signup") => run(async () => {
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type });
    if (err) showError(err);
    // success: the session arrives through useAuth and the redirect effect takes over
  });

  const saveNewPassword = () => run(async () => {
    if (password.length < PASSWORD_MIN) { setError(t("auth.errors.passwordTooShort")); return; }
    holdRedirect.current = true;
    if (mode === "forgot" && !recoveryVerified.current) {
      const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "recovery" });
      if (err) { holdRedirect.current = false; showError(err); return; }
      recoveryVerified.current = true;
    }
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { showError(err); return; }
    toast.success(t("auth.passwordSaved"));
    holdRedirect.current = false;
    leave();
  });

  const resend = () => run(async () => {
    let err: AuthError | null = null;
    if (mode === "signup" || (mode === "signin" && unconfirmed)) {
      ({ error: err } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: window.location.origin } }));
    } else if (mode === "otp") {
      ({ error: err } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } }));
    } else if (mode === "forgot") {
      ({ error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/${locale}/auth?mode=reset` }));
    }
    if (err) { showError(err); return; }
    setCooldown(RESEND_SECONDS);
    toast.success(t("auth.codeSentAgain"));
  });

  const resendConfirmation = async () => {
    await resend();
    setMode("signup");
    setStep("code");
    setUnconfirmed(false);
  };

  const signInWithProvider = async (provider: OAuthProvider) => {
    setOauthBusy(provider);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (err) { showError(err); setOauthBusy(null); }
  };

  /* ── render ── */
  if (tgnBusy) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 py-8">
          <M3LoadingIndicator size={64} />
          <p className="text-sm text-muted-foreground">{t("auth.tgnValidating")}</p>
        </div>
      </AuthShell>
    );
  }

  const disabled = busy || !!oauthBusy;
  const errorBox = error && (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      {error}
      {unconfirmed && (
        <button type="button" onClick={resendConfirmation} disabled={disabled || cooldown > 0} className="mt-1 block font-medium underline underline-offset-4 disabled:opacity-60">
          {t("auth.resendConfirmation")}
        </button>
      )}
    </div>
  );
  const submitButton = (label: string) => (
    <Button type="submit" size="lg" disabled={disabled} className="h-11 w-full active:scale-[0.98]">
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
  const heading = (title: string, subtitle: React.ReactNode) => (
    <header className="mb-8 space-y-2">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
    </header>
  );
  const backLink = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
  const emailField = (
    <div className="space-y-2">
      <Label htmlFor="auth-email">{t("auth.email")}</Label>
      <Input
        id="auth-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        inputMode="email"
        autoFocus={!email}
        placeholder="name@beispiel.de"
        className="h-11"
        required
      />
    </div>
  );
  const resendRow = (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <button type="button" onClick={resend} disabled={disabled || cooldown > 0} className="font-medium text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline">
        {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("auth.resend")}
      </button>
      <button type="button" onClick={() => { setStep("form"); setCode(""); setError(null); }} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {t("auth.otherEmail")}
      </button>
    </div>
  );
  const submit = (fn: () => void) => (e: React.FormEvent) => { e.preventDefault(); if (!disabled) fn(); };

  // Codes: the account needs confirming, a login code or a password reset code is on its way
  if (step === "code" && (mode === "signup" || mode === "otp")) {
    const isSignup = mode === "signup";
    return (
      <AuthShell>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        {heading(isSignup ? t("auth.confirmTitle") : t("auth.codeTitle"), (
          <>
            <Trans i18nKey={isSignup ? "auth.confirmSubtitle" : "auth.codeSubtitle"} values={{ email: email.trim() }} components={{ b: <strong className="font-medium text-foreground" /> }} />{" "}
            {t("auth.checkSpam")}
          </>
        ))}
        <form onSubmit={submit(() => verifyCode(isSignup ? "signup" : "email"))} className="space-y-5" noValidate>
          <CodeInput value={code} onChange={setCode} />
          {errorBox}
          {submitButton(isSignup ? t("auth.confirmSubmit") : t("auth.signIn"))}
          {resendRow}
        </form>
      </AuthShell>
    );
  }

  if (mode === "otp") {
    return (
      <AuthShell>
        {backLink(t("auth.backToLogin"), () => switchMode("signin"))}
        {heading(t("auth.otpTitle"), t("auth.otpSubtitle"))}
        <form onSubmit={submit(sendOtp)} className="space-y-5" noValidate>
          {emailField}
          {errorBox}
          {submitButton(t("auth.sendCode"))}
        </form>
      </AuthShell>
    );
  }

  if (mode === "forgot") {
    return (
      <AuthShell>
        {backLink(t("auth.backToLogin"), () => switchMode("signin"))}
        {step === "form" ? (
          <>
            {heading(t("auth.resetPassword"), t("auth.forgotSubtitle"))}
            <form onSubmit={submit(sendRecovery)} className="space-y-5" noValidate>
              {emailField}
              {errorBox}
              {submitButton(t("auth.sendCode"))}
            </form>
          </>
        ) : (
          <>
            {heading(t("auth.resetPassword"), <Trans i18nKey="auth.forgotCodeSubtitle" values={{ email: email.trim() }} components={{ b: <strong className="font-medium text-foreground" /> }} />)}
            <form onSubmit={submit(saveNewPassword)} className="space-y-5" noValidate>
              <CodeInput value={code} onChange={setCode} />
              <div className="space-y-2">
                <Label htmlFor="auth-new-password">{t("auth.newPassword")}</Label>
                <PasswordInput id="auth-new-password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="auth-password-hint" />
                <p id="auth-password-hint" className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
              </div>
              {errorBox}
              {submitButton(t("auth.savePassword"))}
              {resendRow}
            </form>
          </>
        )}
      </AuthShell>
    );
  }

  if (mode === "reset") {
    // Arrived through the link in the reset mail: the link signs in, only the new password is missing
    const linkValid = !!user;
    return (
      <AuthShell>
        {heading(t("auth.resetTitle"), linkValid ? t("auth.resetNewPassDesc") : t("auth.linkExpired"))}
        {authLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : linkValid ? (
          <form onSubmit={submit(saveNewPassword)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="auth-new-password">{t("auth.newPassword")}</Label>
              <PasswordInput id="auth-new-password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="auth-password-hint" />
              <p id="auth-password-hint" className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
            </div>
            {errorBox}
            {submitButton(t("auth.savePassword"))}
          </form>
        ) : (
          <Button size="lg" className="h-11 w-full" onClick={() => switchMode("forgot")}>{t("auth.sendCode")}</Button>
        )}
      </AuthShell>
    );
  }

  // Sign in / sign up
  const isSignup = mode === "signup";
  const addingNow = adding && !!user;
  return (
    <AuthShell>
      {addingNow && backLink(t("account.cancelAdd"), leave)}
      {addingNow
        ? heading(t("account.addTitle"), t("account.addHint", { email: user.email }))
        : heading(isSignup ? t("auth.signUpTitle") : t("auth.signInTitle"), isSignup ? t("auth.signUpSubtitle") : t("auth.signInSubtitle"))}

      {/* Accounts already signed in on this device: one tap instead of email and password */}
      {!user && !isSignup && savedAccounts.length > 0 && (
        <section aria-labelledby="saved-accounts" className="mb-6">
          <h2 id="saved-accounts" className="mb-2 text-sm font-medium text-muted-foreground">{t("account.saved")}</h2>
          <ul className="space-y-2">
            {savedAccounts.map((account) => (
              <li key={account.userId}>
                <button
                  type="button"
                  onClick={() => switchTo(account)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-card active:scale-[0.99]"
                >
                  <Avatar className="h-9 w-9">
                    {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt="" />}
                    <AvatarFallback className="text-xs bg-primary/15 text-primary">{account.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{t("account.continueAs", { name: account.name })}</span>
                    {account.email && <span className="block truncate text-xs text-muted-foreground">{account.email}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* One provider: full label. Two: side by side with just the brand name, which is enough there */}
      <div className={cn("grid gap-3", oauthProviders.length > 1 && "grid-cols-2")}>
        {oauthProviders.map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="outline"
            size="lg"
            disabled={disabled}
            onClick={() => signInWithProvider(provider)}
            aria-label={t(OAUTH[provider].labelKey)}
            className="h-11 w-full gap-2.5 border-border bg-transparent font-medium hover:bg-muted active:scale-[0.98]"
          >
            {oauthBusy === provider ? <Loader2 className="h-4 w-4 animate-spin" /> : OAUTH[provider].icon}
            {oauthProviders.length > 1 ? OAUTH[provider].name : t(OAUTH[provider].labelKey)}
          </Button>
        ))}
      </div>

      <div className="my-6 flex items-center gap-4" role="separator">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t("auth.orEmail")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit(isSignup ? signUp : signIn)} className="space-y-5" noValidate>
        {emailField}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="auth-password">{t("auth.password")}</Label>
            {!isSignup && (
              <button type="button" onClick={() => switchMode("forgot")} className="py-2 -my-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {t("auth.forgotPassword")}
              </button>
            )}
          </div>
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={setPassword}
            autoComplete={isSignup ? "new-password" : "current-password"}
            describedBy={isSignup ? "auth-password-hint" : undefined}
          />
          {isSignup && <p id="auth-password-hint" className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>}
        </div>
        {errorBox}
        {submitButton(isSignup ? t("auth.signUpTitle") : t("auth.signIn"))}
      </form>

      {!isSignup && (
        <button type="button" onClick={() => switchMode("otp")} className="mt-2 -mb-2 w-full py-2 text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t("auth.useCode")}
        </button>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {isSignup ? t("auth.alreadyHaveAccount") : t("auth.noAccount")}{" "}
        <button type="button" onClick={() => switchMode(isSignup ? "signin" : "signup")} className="py-2 -my-2 font-semibold text-primary underline-offset-4 hover:underline">
          {isSignup ? t("auth.signIn") : t("auth.signUp")}
        </button>
      </p>

      {!isSignup && (
        <p className="mt-8 rounded-xl border border-border/60 bg-card/50 p-4 text-xs leading-relaxed text-muted-foreground">
          <Trans
            i18nKey="auth.redaimNote"
            components={{ otp: <button type="button" onClick={() => switchMode("otp")} className="font-medium text-foreground underline underline-offset-4" /> }}
          />
        </p>
      )}
    </AuthShell>
  );
};

export default AuthPage;
