import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "@/lib/locale-router";
import { LANG_TO_LOCALE, stripLocalePrefix } from "@/lib/localeRouting";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import Footer from "@/components/Footer";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LayoutSettings from "@/components/settings/LayoutSettings";
import { useTheme } from "@/hooks/useTheme";
import type { NavStyle, FontScale, RadiusScale, BadgeStyle, FontFamilyChoice, PosterFit } from "@/hooks/useTheme";
import { supportedLanguages, changeLanguage } from "@/i18n";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { Eye as EyeIcon, Zap as ZapIcon, Image as ImageIcon, Contrast as ContrastIcon, EyeOff as EyeOffIcon, Type as TypeIcon, Menu as MenuTwoTone, PanelTop, PanelBottom, Palette as PaletteTwoTone, Settings as SettingsTwoTone, Languages as TranslateTwoTone, Brush as BrushTwoTone, Palette as ColorLensTwoTone, Type as FormatSizeTwoTone, RotateCcw as RestartAltTwoTone, Square as RoundedCornerTwoTone, LayoutGrid as ViewCompactTwoTone } from "lucide-react";
// Self-hosted previews of the optional body fonts (this page is loaded on demand)
import "@fontsource/dm-sans/400.css";
import "@fontsource/jetbrains-mono/400.css";


const navStyleOptions: { value: NavStyle; label: string; icon: typeof PanelTop }[] = [
  { value: "navbar", label: "Navbar", icon: PanelTop },
  { value: "dock", label: "Dock", icon: PanelBottom },
];

const fontScaleOptions: { value: FontScale; labelKey: string }[] = [
  { value: "compact", labelKey: "settings.fontCompact" },
  { value: "normal", labelKey: "settings.fontNormal" },
  { value: "large", labelKey: "settings.fontLarge" },
];

const radiusOptions: { value: RadiusScale; labelKey: string; preview: string }[] = [
  { value: "none", labelKey: "settings.radiusNone", preview: "rounded-none" },
  { value: "small", labelKey: "settings.radiusSmall", preview: "rounded-sm" },
  { value: "medium", labelKey: "settings.radiusMedium", preview: "rounded-md" },
  { value: "large", labelKey: "settings.radiusLarge", preview: "rounded-xl" },
];

const PRESET_COLORS = [
  "#c2b7cf", "#1252c2", "#7c3aed", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f43f5e", "#84cc16", "#a855f7", "#0ea5e9", "#d946ef", "#64748b",
];

const fontFamilyOptions: { value: FontFamilyChoice; labelKey: string; fallback: string; css: string }[] = [
  { value: "default", labelKey: "settings.fontFamilyDefault", fallback: "Standard (Inter)", css: "'Inter', sans-serif" },
  { value: "serif", labelKey: "settings.fontFamilySerif", fallback: "Serif", css: "Georgia, serif" },
  { value: "mono", labelKey: "settings.fontFamilyMono", fallback: "Mono", css: "'JetBrains Mono', monospace" },
  { value: "rounded", labelKey: "settings.fontFamilyRounded", fallback: "DM Sans", css: "'DM Sans', sans-serif" },
];

const posterFitOptions: { value: PosterFit; labelKey: string; fallback: string }[] = [
  { value: "cover", labelKey: "settings.posterFitCover", fallback: "Zuschneiden" },
  { value: "contain", labelKey: "settings.posterFitContain", fallback: "Vollständig zeigen" },
];

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  
  const navigate = useNavigate();
  const location = useLocation();
  const defaultTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "appearance" ? "appearance" : "settings";
  }, []);
  const {
    accentColor, setAccentColor,
    fontScale, setFontScale,
    radiusScale, setRadiusScale,
    compactMode, setCompactMode,
    navStyle, setNavStyle,
    badgeStyle, setBadgeStyle,
    fontFamilyChoice, setFontFamilyChoice,
    reduceMotion, setReduceMotion,
    highContrast, setHighContrast,
    dimPosters, setDimPosters,
    posterFit, setPosterFit,
    showSpoilerBlur, setShowSpoilerBlur,
  } = useTheme();
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSeo({
      title: t("meta.settings.title"),
      description: t("meta.settings.description"),
      url: "/einstellungen",
    });
    return () => cleanupSeo();
  }, [t]);


  const resetAll = () => {
    setAccentColor("");
    setFontScale("normal");
    setRadiusScale("medium");
    setCompactMode(false);
    setBadgeStyle("new");
    setFontFamilyChoice("default");
    setReduceMotion(false);
    setHighContrast(false);
    setDimPosters(false);
    setPosterFit("cover");
    setShowSpoilerBlur(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 container mx-auto px-4 pt-24 pb-32 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t("profile.settingsTab", "Einstellungen")}</h1>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6 overflow-x-auto flex-nowrap scrollbar-none justify-start" tabIndex={0} aria-label={t("profile.settingsTab", "Einstellungen")}>
            <TabsTrigger value="settings" className="gap-1.5">
              <SettingsTwoTone className="h-4 w-4" aria-hidden="true" />
              {t("settings.tabGeneral", "Allgemein")}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5">
              <BrushTwoTone className="h-4 w-4" aria-hidden="true" />
              {t("settings.tabAppearance", "Darstellung")}
            </TabsTrigger>
          </TabsList>

          {/* ─── Settings Tab ─── */}
          <TabsContent value="settings" className="space-y-4">
            {/* Language */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <TranslateTwoTone className="!text-[20px] text-primary" />
                  {t("profile.languageLabel")}
                </CardTitle>
                <CardDescription>{t("settings.languageDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {supportedLanguages.map((lang) => {
                    const isActive = i18n.language === lang.code;
                    return (
                      <Button
                        key={lang.code}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          changeLanguage(lang.code);
                          const locale = LANG_TO_LOCALE[lang.code];
                          if (locale) {
                            const path = stripLocalePrefix(location.pathname) || "/einstellungen";
                            navigate(`/${locale}${path}` as any);
                          }
                        }}
                        className="gap-1.5"
                      >
                        {lang.flag} {lang.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Style */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <MenuTwoTone className="!text-[20px] text-primary" />
                  {t("profile.navStyleLabel")}
                </CardTitle>
                <CardDescription>{t("profile.navStyleDesc")}</CardDescription>
                {/* Below 1024px the dock is forced (see index.css), so the choice only applies on desktop */}
                <p className="text-xs text-muted-foreground lg:hidden">{t("settings.navMobileHint")}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {navStyleOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={navStyle === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNavStyle(opt.value)}
                      className="gap-1.5"
                    >
                      <opt.icon className="h-4 w-4" aria-hidden="true" />
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Front page, side rail, phone dock and navbar order */}
            <LayoutSettings />

          </TabsContent>

          {/* ─── Appearance Tab ─── */}
          <TabsContent value="appearance" className="space-y-4">
            {/* Theme */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <PaletteTwoTone className="!text-[20px] text-primary" />
                  {t("profile.themeLabel")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ThemeSwitcher />
              </CardContent>
            </Card>

            {/* Accent Color */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <ColorLensTwoTone className="!text-[20px] text-primary" />
                  {t("settings.accentColor", "Akzentfarbe")}
                </CardTitle>
                <CardDescription>{t("settings.accentColorDesc", "Wähle eine eigene Akzentfarbe für Buttons, Links und Highlights.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color === "#c2b7cf" ? "" : color)}
                      className="w-8 h-8 rounded-full border-2 transition-all duration-150 shrink-0"
                      style={{
                        backgroundColor: color,
                        borderColor: (accentColor === color || (!accentColor && color === "#c2b7cf")) ? "hsl(var(--foreground))" : "transparent",
                        transform: (accentColor === color || (!accentColor && color === "#c2b7cf")) ? "scale(1.15)" : "scale(1)",
                      }}
                      title={color}
                    />
                  ))}
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={accentColor || "#c2b7cf"}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                    title={t("settings.customColor", "Eigene Farbe")}
                  />
                </div>
                {accentColor && (
                  <Button variant="ghost" size="sm" className="mt-3 text-xs gap-1" onClick={() => setAccentColor("")}>
                    <RestartAltTwoTone className="w-3.5 h-3.5" />
                    {t("settings.resetColor", "Zurücksetzen")}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Font Scale */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <FormatSizeTwoTone className="!text-[20px] text-primary" />
                  {t("settings.fontSize", "Schriftgröße")}
                </CardTitle>
                <CardDescription>{t("settings.fontSizeDesc", "Passe die Textgröße an deine Vorlieben an.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {fontScaleOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={fontScale === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFontScale(opt.value)}
                    >
                      {t(opt.labelKey)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Border Radius */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <RoundedCornerTwoTone className="!text-[20px] text-primary" />
                  {t("settings.borderRadius", "Ecken")}
                </CardTitle>
                <CardDescription>{t("settings.borderRadiusDesc", "Bestimme wie rund die UI-Elemente erscheinen.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {radiusOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={radiusScale === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRadiusScale(opt.value)}
                      className="gap-2"
                    >
                      <span className={`w-4 h-4 border-2 border-current ${opt.preview}`} />
                      {t(opt.labelKey)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compact Mode */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <ViewCompactTwoTone className="!text-[20px] text-primary" />
                  {t("settings.compactMode", "Kompakte Ansicht")}
                </CardTitle>
                <CardDescription>{t("settings.compactModeDesc", "Weniger Abstände für ein dichteres Layout.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Switch checked={compactMode} onCheckedChange={setCompactMode} />
                  <Label className="text-sm text-muted-foreground">
                    {compactMode ? t("settings.compactOn", "Aktiv") : t("settings.compactOff", "Aus")}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Badge Style */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <BrushTwoTone className="!text-[20px] text-primary" />
                  {t("settings.badgeStyle", "Badge-Stil")}
                </CardTitle>
                <CardDescription>
                  {t("settings.badgeStyleDesc", "Wechsle zwischen dem neuen Glass-Design und den klassischen alten Badges.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(["new", "old"] as BadgeStyle[]).map((v) => (
                    <Button
                      key={v}
                      variant={badgeStyle === v ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBadgeStyle(v)}
                    >
                      {v === "new"
                        ? t("settings.badgeStyleNew", "Neu (Glass)")
                        : t("settings.badgeStyleOld", "Alt (Klassisch)")}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Font Family */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <TypeIcon className="!text-[20px] text-primary" />
                  {t("settings.fontFamily", "Schriftart")}
                </CardTitle>
                <CardDescription>{t("settings.fontFamilyDesc", "Wähle die Schriftart für Texte auf der ganzen Seite.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {fontFamilyOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={fontFamilyChoice === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFontFamilyChoice(opt.value)}
                      style={{ fontFamily: opt.css }}
                    >
                      {t(opt.labelKey, opt.fallback)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Poster Fit */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <ImageIcon className="!text-[20px] text-primary" />
                  {t("settings.posterFit", "Poster-Darstellung")}
                </CardTitle>
                <CardDescription>{t("settings.posterFitDesc", "Bestimme, ob Cover zugeschnitten oder komplett angezeigt werden.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {posterFitOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={posterFit === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPosterFit(opt.value)}
                    >
                      {t(opt.labelKey, opt.fallback)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reduce Motion */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <ZapIcon className="!text-[20px] text-primary" />
                  {t("settings.reduceMotion", "Animationen reduzieren")}
                </CardTitle>
                <CardDescription>{t("settings.reduceMotionDesc", "Deaktiviert Übergänge und Bewegungen für ein ruhigeres Erlebnis.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
                  <Label className="text-sm text-muted-foreground">
                    {reduceMotion ? t("settings.compactOn", "Aktiv") : t("settings.compactOff", "Aus")}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* High Contrast */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <ContrastIcon className="!text-[20px] text-primary" />
                  {t("settings.highContrast", "Hoher Kontrast")}
                </CardTitle>
                <CardDescription>{t("settings.highContrastDesc", "Stärkere Ränder und hellere Texte für bessere Lesbarkeit.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Switch checked={highContrast} onCheckedChange={setHighContrast} />
                  <Label className="text-sm text-muted-foreground">
                    {highContrast ? t("settings.compactOn", "Aktiv") : t("settings.compactOff", "Aus")}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Dim Posters */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <EyeIcon className="!text-[20px] text-primary" />
                  {t("settings.dimPosters", "Bilder abdunkeln")}
                </CardTitle>
                <CardDescription>{t("settings.dimPostersDesc", "Reduziert die Helligkeit von Bildern, bis du sie ansiehst.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Switch checked={dimPosters} onCheckedChange={setDimPosters} />
                  <Label className="text-sm text-muted-foreground">
                    {dimPosters ? t("settings.compactOn", "Aktiv") : t("settings.compactOff", "Aus")}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Spoiler Blur */}
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-base">
                  <EyeOffIcon className="!text-[20px] text-primary" />
                  {t("settings.spoilerBlur", "Spoiler unscharf")}
                </CardTitle>
                <CardDescription>{t("settings.spoilerBlurDesc", "Blende Spoiler-Inhalte aus, bis du sie anklickst.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Switch checked={showSpoilerBlur} onCheckedChange={setShowSpoilerBlur} />
                  <Label className="text-sm text-muted-foreground">
                    {showSpoilerBlur ? t("settings.compactOn", "Aktiv") : t("settings.compactOff", "Aus")}
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Reset All */}
            <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={resetAll}>
              <RestartAltTwoTone className="w-4 h-4" />
              {t("settings.resetAll", "Alle Anpassungen zurücksetzen")}
            </Button>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default SettingsPage;
