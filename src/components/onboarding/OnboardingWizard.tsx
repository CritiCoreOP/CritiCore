import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, AVATAR_IMAGE } from "@/lib/compressImage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateRandomUsername, getRandomDefaultAvatar } from "@/lib/defaultAvatars";
import { changeLanguage, supportedLanguages } from "@/i18n";
import {
  LANG_TO_LOCALE,
  canonicalizePath,
  getCurrentLocale,
  getLangFromLocale,
  getLocaleFromPath,
  stripLocalePrefix,
  translatePath,
} from "@/lib/localeRouting";
import { PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import criticoreLogo from "@/assets/criticore-full.png";
import { ArrowLeft, Camera, Check, CheckCircle2, Languages, Loader2 } from "lucide-react";

type Step = "profile" | "rules" | "done";
type NameState = "idle" | "short" | "checking" | "free" | "taken";

const USERNAME_MIN = 3;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
// Pages that must stay readable while the wizard is pending (the consent links open them in a new tab)
const HIDDEN_ON = ["/datenschutz", "/agb", "/impressum", "/onboarding-demo", "/newsletter"];

const normalizeUsername = (value: string) => value.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 30);
const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === "23505";

export default function OnboardingWizard({ demoMode }: { demoMode?: "new" | "returning" } = {}) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const isDemo = !!demoMode;
  const userId = user?.id;

  const [open, setOpen] = useState(isDemo);
  const [isReturning, setIsReturning] = useState(demoMode === "returning");
  const [step, setStep] = useState<Step>(demoMode === "returning" ? "rules" : "profile");
  const [direction, setDirection] = useState(1);

  const [username, setUsername] = useState("");
  const [nameState, setNameState] = useState<NameState>("idle");
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isPress, setIsPress] = useState(false);
  const [quickStart, setQuickStart] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const focusNextHeading = useRef(false);

  const lang = getLocaleFromPath(location.pathname) ? getLangFromLocale(getLocaleFromPath(location.pathname)!) || "de" : i18n.language;
  const canonicalPath = canonicalizePath(stripLocalePrefix(location.pathname), lang);
  const hiddenHere = !isDemo && HIDDEN_ON.some((p) => canonicalPath === p || canonicalPath.startsWith(`${p}/`));
  const visible = open && !hiddenHere;

  // Keyed on the id: Supabase hands out a new user object on every tab focus
  useEffect(() => {
    if (isDemo) return;
    if (!userId) { setOpen(false); return; }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("username, onboarding_completed_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data || data.onboarding_completed_at) return;
        const returning = !!data.username;
        setIsReturning(returning);
        setStep(returning ? "rules" : "profile");
        setOpen(true);
      });
    return () => { cancelled = true; };
  }, [userId, isDemo]);

  // The page behind stays put and out of reach while the wizard covers it: no scrolling, and Tab or a
  // screen reader cannot land on links hidden underneath (the wizard itself is portalled out of #root)
  useEffect(() => {
    if (!visible) return;
    const root = document.getElementById("root");
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root?.setAttribute("inert", "");
    return () => {
      document.body.style.overflow = previous;
      root?.removeAttribute("inert");
    };
  }, [visible]);

  // Object URLs for the preview are released when the file changes or the wizard closes
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const isNameFree = useCallback(
    async (name: string) => {
      if (isDemo || !userId) return true;
      const { data, error } = await supabase.from("profiles").select("id").eq("username", name).neq("user_id", userId).limit(1);
      // A failed check does not block; the unique constraint still catches duplicates on save
      return error ? true : data.length === 0;
    },
    [isDemo, userId],
  );

  // Live availability while typing
  useEffect(() => {
    if (step !== "profile") return;
    if (username.length < USERNAME_MIN) { setNameState(username ? "short" : "idle"); return; }
    setNameState("checking");
    let cancelled = false;
    const id = setTimeout(async () => {
      const free = await isNameFree(username);
      if (!cancelled) setNameState(free ? "free" : "taken");
    }, 400);
    return () => { cancelled = true; clearTimeout(id); };
  }, [username, step, isNameFree]);

  // After a step change, focus lands on the new heading. It only mounts once the old step has animated
  // out, hence a ref callback instead of an effect. Not on first open: the username field has focus then.
  const focusHeading = useCallback((el: HTMLHeadingElement | null) => {
    if (!el || !focusNextHeading.current) return;
    focusNextHeading.current = false;
    el.focus({ preventScroll: true });
  }, []);

  const close = useCallback(() => {
    if (isDemo) {
      // The demo page replays the flow instead of ending up empty
      setStep(demoMode === "returning" ? "rules" : "profile");
      setUsername(""); setDisplayName(""); setAvatarFile(null); setIsPress(false);
      setQuickStart(false); setAcceptRules(false);
      return;
    }
    setOpen(false);
  }, [isDemo, demoMode]);

  useEffect(() => {
    if (step !== "done") return;
    const id = setTimeout(close, 1400);
    return () => clearTimeout(id);
  }, [step, close]);

  if (!visible) return null;

  const currentLang = supportedLanguages.find((l) => l.code === i18n.language) ?? supportedLanguages[0];
  const steps: Step[] = isReturning ? ["rules"] : ["profile", "rules"];
  const stepIndex = steps.indexOf(step);

  const goTo = (next: Step) => {
    setDirection(steps.indexOf(next) >= stepIndex ? 1 : -1);
    focusNextHeading.current = true;
    setStep(next);
  };

  const switchLanguage = (code: string) => {
    changeLanguage(code);
    const locale = getLocaleFromPath(location.pathname);
    // LocaleLayout syncs the language from the URL, so the URL has to change too or it switches back
    if (!locale) return;
    const rest = canonicalPath === "/" ? "" : translatePath(canonicalPath, code);
    navigate(`/${LANG_TO_LOCALE[code]}${rest}${location.search}${location.hash}`, { replace: true });
  };

  const legalHref = (path: string) => `/${getLocaleFromPath(location.pathname) || getCurrentLocale()}${translatePath(path, lang)}`;

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // choosing the same file again still fires onChange
    if (!file) return;
    if (!AVATAR_EXT[file.type]) { toast.error(t("onboarding.avatarInvalid")); return; }
    if (file.size > AVATAR_MAX_BYTES) { toast.error(t("onboarding.avatarTooLarge")); return; }
    setAvatarFile(file);
  };

  const submitProfile = async () => {
    if (username.length < USERNAME_MIN) { setNameState("short"); return; }
    setNameState("checking");
    const free = await isNameFree(username);
    setNameState(free ? "free" : "taken");
    if (!free) return;
    setQuickStart(false);
    goTo("rules");
  };

  const startQuick = () => {
    setQuickStart(true);
    goTo("rules");
  };

  const finish = async () => {
    if (!acceptRules || saving) return;
    setSaving(true);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 600));
      } else if (isReturning) {
        const { error } = await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("user_id", userId!);
        if (error) throw error;
      } else if (quickStart) {
        // Random names can collide; try a few before giving up
        let error: unknown = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          ({ error } = await supabase
            .from("profiles")
            .update({ username: generateRandomUsername(), avatar_url: getRandomDefaultAvatar(), onboarding_completed_at: new Date().toISOString() })
            .eq("user_id", userId!));
          if (!isUniqueViolation(error)) break;
        }
        if (error) throw error;
      } else {
        if (!(await isNameFree(username))) {
          toast.error(t("profile.usernameTaken"));
          setNameState("taken");
          goTo("profile");
          return;
        }

        let avatarUrl: string | null = null;
        if (avatarFile) {
          const avatar = await compressImage(avatarFile, AVATAR_IMAGE);
          const path = `${userId}/avatar.${AVATAR_EXT[avatar.type]}`;
          const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatar, { upsert: true, contentType: avatar.type });
          if (upErr) throw new Error(t("onboarding.avatarUploadError"));
          // Same path on every upload: the version parameter keeps browsers from showing a cached old picture
          avatarUrl = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
        }

        const now = new Date().toISOString();
        const { error } = await supabase
          .from("profiles")
          .update({
            username,
            username_changed_at: now,
            onboarding_completed_at: now,
            ...(displayName.trim() ? { display_name: displayName.trim() } : {}),
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          })
          .eq("user_id", userId!);
        if (isUniqueViolation(error)) {
          toast.error(t("profile.usernameTaken"));
          setNameState("taken");
          goTo("profile");
          return;
        }
        if (error) throw error;

        if (isPress) {
          const { error: pressErr } = await supabase.from("press_profiles").insert({ user_id: userId! });
          if (pressErr && !isUniqueViolation(pressErr)) console.error("Press profile:", pressErr);
        }
      }
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      setDirection(1);
      focusNextHeading.current = true;
      setStep("done");
    } catch (err) {
      toast.error(t("profile.saveError"), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const slide = reduceMotion ? 0 : 24;
  const nameHint = {
    idle: { text: t("usernameRequired.rules"), tone: "text-muted-foreground" },
    short: { text: t("usernameRequired.tooShort"), tone: "text-muted-foreground" },
    checking: { text: t("onboarding.usernameChecking"), tone: "text-muted-foreground" },
    free: { text: t("onboarding.usernameFree"), tone: "text-emerald-500" },
    taken: { text: t("profile.usernameTaken"), tone: "text-destructive" },
  }[nameState];

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-heading"
      // Opts out of the global centred-dialog styles (translate(-50%), rounded corners, mobile max size)
      data-fullscreen-overlay=""
      className="fixed inset-0 z-[9999] overflow-y-auto bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
    >
      {/* Static light from the top in the brand colour; no looping animation behind a form */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.14),transparent_70%)]" />

      <div className="relative flex min-h-[100dvh] flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-8">
          <img src={criticoreLogo} alt="CritiCore" width={150} height={40} className="h-8 w-auto" />
          <div className="flex items-center gap-1">
            <Select value={currentLang.code} onValueChange={switchLanguage}>
              <SelectTrigger aria-label={t("profile.languageLabel")} className="h-9 w-auto gap-2 border-none bg-transparent px-2.5 text-sm text-muted-foreground hover:text-foreground focus:ring-1">
                {/* Short code on phones so logo, language and logout fit in one row. Wrapped in a div:
                    the trigger clamps direct span children, which would override `hidden` */}
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 shrink-0" />
                  <span className="uppercase sm:hidden">{currentLang.code}</span>
                  <span className="hidden sm:inline">{currentLang.label}</span>
                </div>
              </SelectTrigger>
              <SelectContent align="end" className="z-[10000]">
                {supportedLanguages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isDemo && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground" onClick={() => signOut()}>
                {t("nav.logout")}
              </Button>
            )}
          </div>
        </header>

        <main className="flex flex-1 justify-center px-4 pb-10 pt-4 sm:items-center sm:pt-0">
          <div className="w-full max-w-[440px]">
            {steps.length > 1 && step !== "done" && (
              <div className="mb-8">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t("onboarding.step", { current: stepIndex + 1, total: steps.length })}
                </p>
                <div className="flex gap-1.5" aria-hidden>
                  {steps.map((s, i) => (
                    <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= stepIndex ? "bg-primary" : "bg-muted")} />
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: direction * slide }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * slide }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === "profile" && (
                  <form
                    noValidate
                    onSubmit={(e) => { e.preventDefault(); submitProfile(); }}
                    className="space-y-7"
                  >
                    <div className="space-y-2">
                      <h1 id="onboarding-heading" ref={focusHeading} tabIndex={-1} className="font-display text-3xl font-bold tracking-tight text-foreground outline-none">
                        {t("onboarding.welcomeTitle")}
                      </h1>
                      <p className="text-muted-foreground">{t("onboarding.profileSubtitle")}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={handleAvatar} />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        aria-label={t("onboarding.avatarChoose")}
                        className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
                      >
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Camera className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                        )}
                      </button>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground">{t("onboarding.avatarLabel")}</p>
                        <p className="text-xs text-muted-foreground">{t("onboarding.avatarHint")}</p>
                        {avatarFile && (
                          <button type="button" onClick={() => setAvatarFile(null)} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-destructive hover:underline">
                            {t("onboarding.avatarRemove")}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="onboarding-username">{t("onboarding.usernameLabel")}</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                        <Input
                          id="onboarding-username"
                          value={username}
                          onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                          placeholder={t("profile.usernamePlaceholder")}
                          autoComplete="username"
                          autoCapitalize="none"
                          spellCheck={false}
                          maxLength={30}
                          // No keyboard popping up over half the screen on phones before anything is read
                          autoFocus={typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches}
                          aria-invalid={nameState === "taken"}
                          aria-describedby="onboarding-username-hint"
                          className="h-11 pl-7 pr-9"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
                          {nameState === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          {nameState === "free" && <Check className="h-4 w-4 text-emerald-500" />}
                        </span>
                      </div>
                      <p id="onboarding-username-hint" aria-live="polite" className={cn("text-xs", nameHint.tone)}>{nameHint.text}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="onboarding-display-name">{t("onboarding.displayNameTitle")}</Label>
                      <Input
                        id="onboarding-display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t("onboarding.displayNamePlaceholder")}
                        autoComplete="nickname"
                        maxLength={50}
                        className="h-11"
                      />
                    </div>

                    <label htmlFor="onboarding-press" className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border">
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-foreground">{t("onboarding.pressLabel")}</span>
                        <span className="block text-xs text-muted-foreground">{t("onboarding.pressSubtitle")}</span>
                      </span>
                      <Switch id="onboarding-press" checked={isPress} onCheckedChange={setIsPress} className="mt-0.5" />
                    </label>

                    <div className="space-y-3 pt-1">
                      <Button type="submit" size="lg" className="h-11 w-full active:scale-[0.98]" disabled={nameState === "taken" || nameState === "checking" || username.length < USERNAME_MIN}>
                        {t("onboarding.next")}
                      </Button>
                      <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={startQuick}>
                        {t("onboarding.quickStart")}
                      </Button>
                    </div>
                  </form>
                )}

                {step === "rules" && (
                  <form noValidate onSubmit={(e) => { e.preventDefault(); finish(); }} className="space-y-7">
                    <div className="space-y-2">
                      <h1 id="onboarding-heading" ref={focusHeading} tabIndex={-1} className="font-display text-3xl font-bold tracking-tight text-foreground outline-none">
                        {isReturning ? t("onboarding.returningTitle") : t("onboarding.rulesTitle")}
                      </h1>
                      <p className="text-muted-foreground">{isReturning ? t("onboarding.returningBody") : t("onboarding.rulesSubtitle")}</p>
                    </div>

                    <ul className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
                      {[1, 2, 3, 4].map((n) => (
                        <li key={n} className="flex gap-3 text-sm text-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                          {t(`onboarding.rule${n}`)}
                        </li>
                      ))}
                    </ul>

                    {quickStart && <p className="text-sm text-muted-foreground">{t("onboarding.quickLoginDesc")}</p>}

                    <div className="flex items-start gap-3">
                      <Checkbox id="onboarding-consent" checked={acceptRules} onCheckedChange={(v) => setAcceptRules(v === true)} className="mt-0.5" />
                      <Label htmlFor="onboarding-consent" className="text-sm font-normal leading-relaxed text-foreground">
                        <Trans
                          i18nKey="onboarding.consent"
                          components={{
                            privacy: <a href={legalHref("/datenschutz")} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline" />,
                            terms: <a href={legalHref("/agb")} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline" />,
                          }}
                        />
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      {!isReturning && (
                        <Button type="button" variant="ghost" size="lg" className="h-11 gap-1.5 px-4" onClick={() => goTo("profile")} disabled={saving}>
                          <ArrowLeft className="h-4 w-4" />
                          {t("onboarding.back")}
                        </Button>
                      )}
                      <Button type="submit" size="lg" className="h-11 flex-1 active:scale-[0.98]" disabled={!acceptRules || saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("onboarding.finish")}
                      </Button>
                    </div>
                  </form>
                )}

                {step === "done" && (
                  <div className="flex flex-col items-center py-10 text-center" aria-live="polite">
                    <motion.div
                      initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
                    >
                      <CheckCircle2 className="h-10 w-10 text-primary" />
                    </motion.div>
                    <h1 id="onboarding-heading" ref={focusHeading} tabIndex={-1} className="font-display text-3xl font-bold tracking-tight text-foreground outline-none">
                      {t("onboarding.doneTitle")}
                    </h1>
                    <p className="mt-2 text-muted-foreground">{t("onboarding.doneSubtitle")}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </motion.div>,
    document.body,
  );
}
