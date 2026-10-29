import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { isPrideActive } from "@/hooks/useIwdLogo";
const prideBanner = { url: "/static/pride-banner.png" };
import { ArrowRight as ArrowForwardTwoTone, X as CloseTwoTone, Heart as FavoriteTwoTone } from "lucide-react";

const DISMISS_KEY = "pride-banner-dismissed-2026-06b";

const PrideBanner = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1"
  );

  if (!isPrideActive() || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="group relative isolate flex items-stretch overflow-hidden rounded-3xl bg-card text-card-foreground shadow-[var(--shadow-card)] ring-1 ring-border/60 transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]">
      {/* Animated rainbow aura that lives behind the frosted surface */}
      <div
        className="pointer-events-none absolute -inset-px -z-10 opacity-90 blur-2xl"
        style={{
          background:
            "conic-gradient(from 140deg at 30% 50%, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787, #e40303)",
        }}
      />

      {/* Frosted glass layer keeps the content crisp on top of the aura */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-card/85 backdrop-blur-2xl" />

      {/* Soft rainbow wash fading toward the center */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(228,3,3,0.12) 0%, rgba(255,140,0,0.10) 16%, rgba(255,237,0,0.08) 32%, rgba(0,128,38,0.08) 48%, rgba(0,77,255,0.08) 64%, rgba(117,7,135,0.06) 78%, transparent 92%)",
        }}
      />

      {/* Text content */}
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col justify-center gap-3 px-7 py-7 sm:px-9 sm:py-8">
        <span
          className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white shadow-sm"
          style={{
            background:
              "linear-gradient(90deg, #e40303, #ff8c00, #008026, #004dff, #750787)",
          }}
        >
          <FavoriteTwoTone className="!h-3.5 !w-3.5" />
          Pride Month 2026
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-foreground">
          {t("home.prideTitle")}
        </h2>
        <p className="max-w-xl text-sm sm:text-base leading-relaxed text-muted-foreground">
          {t("home.prideText")}
        </p>
        <Link
          to="/lists/Pride26"
          className="group/cta mt-1.5 inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm transition-all duration-200 hover:gap-3 hover:brightness-110 active:scale-[0.98]"
        >
          {t("home.prideCta")}
          <ArrowForwardTwoTone className="!h-4 !w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
        </Link>
      </div>

      {/* Image on the right – masked so it fades seamlessly into the colorful banner */}
      <div className="relative z-[1] hidden sm:block w-64 md:w-96 lg:w-[28rem] shrink-0">
        <img
          src={prideBanner.url}
          alt={t("home.prideTitle")}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 18%, #000 42%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 18%, #000 42%)",
          }}
        />
      </div>

      <button
        onClick={dismiss}
        aria-label={t("home.prideDismiss")}
        className="absolute top-3.5 right-3.5 z-10 rounded-full bg-background/50 p-1.5 text-muted-foreground backdrop-blur-md transition-colors hover:bg-background/80 hover:text-foreground"
      >
        <CloseTwoTone className="h-5 w-5" />
      </button>
    </div>
  );
};

export default PrideBanner;
