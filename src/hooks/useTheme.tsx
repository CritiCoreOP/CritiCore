import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type ThemeName = "classic" | "glass" | "md3" | "old";
export type NavStyle = "navbar" | "dock";
export type FontScale = "compact" | "normal" | "large";
export type RadiusScale = "none" | "small" | "medium" | "large";
export type BadgeStyle = "new" | "old";
export type FontFamilyChoice = "default" | "serif" | "mono" | "rounded";
export type PosterFit = "cover" | "contain";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  customCSS: string;
  setCustomCSS: (css: string) => void;
  navStyle: NavStyle;
  setNavStyle: (style: NavStyle) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  radiusScale: RadiusScale;
  setRadiusScale: (scale: RadiusScale) => void;
  compactMode: boolean;
  setCompactMode: (v: boolean) => void;
  badgeStyle: BadgeStyle;
  setBadgeStyle: (v: BadgeStyle) => void;
  fontFamilyChoice: FontFamilyChoice;
  setFontFamilyChoice: (v: FontFamilyChoice) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  dimPosters: boolean;
  setDimPosters: (v: boolean) => void;
  posterFit: PosterFit;
  setPosterFit: (v: PosterFit) => void;
  showSpoilerBlur: boolean;
  setShowSpoilerBlur: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "criticore-theme";
const CUSTOM_CSS_KEY = "criticore-custom-css";
const NAV_STYLE_KEY = "criticore-nav-style";
const ACCENT_KEY = "criticore-accent";
const FONT_SCALE_KEY = "criticore-font-scale";
const RADIUS_KEY = "criticore-radius";
const COMPACT_KEY = "criticore-compact";
const BADGE_STYLE_KEY = "criticore-badge-style";
const FONT_FAMILY_KEY = "criticore-font-family";
const REDUCE_MOTION_KEY = "criticore-reduce-motion";
const HIGH_CONTRAST_KEY = "criticore-high-contrast";
const DIM_POSTERS_KEY = "criticore-dim-posters";
const POSTER_FIT_KEY = "criticore-poster-fit";
const SPOILER_BLUR_KEY = "criticore-spoiler-blur";

function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const FONT_SCALE_VALUES: Record<FontScale, string> = { compact: "0.875", normal: "1", large: "1.125" };
const RADIUS_VALUES: Record<RadiusScale, string> = { none: "0rem", small: "0.25rem", medium: "0.5rem", large: "1rem" };
const FONT_FAMILY_VALUES: Record<FontFamilyChoice, string> = {
  default: "'Inter', system-ui, -apple-system, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace",
  rounded: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY) as ThemeName;
      return ["classic", "glass", "md3", "old"].includes(stored) ? stored : "classic";
    } catch { return "classic"; }
  });

  const [customCSS, setCustomCSSState] = useState(() => {
    try { return localStorage.getItem(CUSTOM_CSS_KEY) || ""; } catch { return ""; }
  });

  const [navStyle, setNavStyleState] = useState<NavStyle>(() => {
    try {
      const stored = localStorage.getItem(NAV_STYLE_KEY) as NavStyle;
      return stored === "navbar" || stored === "dock" ? stored : "navbar";
    } catch { return "navbar"; }
  });

  const [accentColor, setAccentColorState] = useState(() => {
    try { return localStorage.getItem(ACCENT_KEY) || ""; } catch { return ""; }
  });

  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    try {
      const v = localStorage.getItem(FONT_SCALE_KEY) as FontScale;
      return ["compact", "normal", "large"].includes(v) ? v : "normal";
    } catch { return "normal"; }
  });

  const [radiusScale, setRadiusScaleState] = useState<RadiusScale>(() => {
    try {
      const v = localStorage.getItem(RADIUS_KEY) as RadiusScale;
      return ["none", "small", "medium", "large"].includes(v) ? v : "medium";
    } catch { return "medium"; }
  });

  const [compactMode, setCompactModeState] = useState(() => {
    try { return localStorage.getItem(COMPACT_KEY) === "true"; } catch { return false; }
  });

  const [badgeStyle, setBadgeStyleState] = useState<BadgeStyle>(() => {
    try {
      const v = localStorage.getItem(BADGE_STYLE_KEY) as BadgeStyle;
      return v === "old" || v === "new" ? v : "new";
    } catch { return "new"; }
  });

  const [fontFamilyChoice, setFontFamilyChoiceState] = useState<FontFamilyChoice>(() => {
    try {
      const v = localStorage.getItem(FONT_FAMILY_KEY) as FontFamilyChoice;
      return ["default", "serif", "mono", "rounded"].includes(v) ? v : "default";
    } catch { return "default"; }
  });

  const [reduceMotion, setReduceMotionState] = useState(() => {
    try { return localStorage.getItem(REDUCE_MOTION_KEY) === "true"; } catch { return false; }
  });

  const [highContrast, setHighContrastState] = useState(() => {
    try { return localStorage.getItem(HIGH_CONTRAST_KEY) === "true"; } catch { return false; }
  });

  const [dimPosters, setDimPostersState] = useState(() => {
    try { return localStorage.getItem(DIM_POSTERS_KEY) === "true"; } catch { return false; }
  });

  const [posterFit, setPosterFitState] = useState<PosterFit>(() => {
    try {
      const v = localStorage.getItem(POSTER_FIT_KEY) as PosterFit;
      return v === "contain" || v === "cover" ? v : "cover";
    } catch { return "cover"; }
  });

  const [showSpoilerBlur, setShowSpoilerBlurState] = useState(() => {
    try { return localStorage.getItem(SPOILER_BLUR_KEY) !== "false"; } catch { return true; }
  });

  const setTheme = useCallback((t: ThemeName) => { setThemeState(t); try { localStorage.setItem(THEME_KEY, t); } catch {} }, []);
  const setCustomCSS = useCallback((css: string) => { setCustomCSSState(css); try { localStorage.setItem(CUSTOM_CSS_KEY, css); } catch {} }, []);
  const setNavStyle = useCallback((style: NavStyle) => { setNavStyleState(style); try { localStorage.setItem(NAV_STYLE_KEY, style); } catch {} }, []);
  const setAccentColor = useCallback((c: string) => { setAccentColorState(c); try { localStorage.setItem(ACCENT_KEY, c); } catch {} }, []);
  const setFontScale = useCallback((s: FontScale) => { setFontScaleState(s); try { localStorage.setItem(FONT_SCALE_KEY, s); } catch {} }, []);
  const setRadiusScale = useCallback((s: RadiusScale) => { setRadiusScaleState(s); try { localStorage.setItem(RADIUS_KEY, s); } catch {} }, []);
  const setCompactMode = useCallback((v: boolean) => { setCompactModeState(v); try { localStorage.setItem(COMPACT_KEY, String(v)); } catch {} }, []);
  const setBadgeStyle = useCallback((v: BadgeStyle) => { setBadgeStyleState(v); try { localStorage.setItem(BADGE_STYLE_KEY, v); } catch {} }, []);
  const setFontFamilyChoice = useCallback((v: FontFamilyChoice) => { setFontFamilyChoiceState(v); try { localStorage.setItem(FONT_FAMILY_KEY, v); } catch {} }, []);
  const setReduceMotion = useCallback((v: boolean) => { setReduceMotionState(v); try { localStorage.setItem(REDUCE_MOTION_KEY, String(v)); } catch {} }, []);
  const setHighContrast = useCallback((v: boolean) => { setHighContrastState(v); try { localStorage.setItem(HIGH_CONTRAST_KEY, String(v)); } catch {} }, []);
  const setDimPosters = useCallback((v: boolean) => { setDimPostersState(v); try { localStorage.setItem(DIM_POSTERS_KEY, String(v)); } catch {} }, []);
  const setPosterFit = useCallback((v: PosterFit) => { setPosterFitState(v); try { localStorage.setItem(POSTER_FIT_KEY, v); } catch {} }, []);
  const setShowSpoilerBlur = useCallback((v: boolean) => { setShowSpoilerBlurState(v); try { localStorage.setItem(SPOILER_BLUR_KEY, String(v)); } catch {} }, []);

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-classic", "theme-white-modern", "theme-glass", "theme-sunset", "theme-dark-sunset", "theme-md3", "theme-old");
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  // Apply nav style class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("nav-navbar", "nav-dock");
    root.classList.add(`nav-${navStyle}`);
  }, [navStyle]);

  // Apply custom CSS
  useEffect(() => {
    let styleEl = document.getElementById("criticore-custom-css") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "criticore-custom-css";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = customCSS;
  }, [customCSS]);

  // Apply accent color override
  useEffect(() => {
    const root = document.documentElement;
    if (accentColor) {
      const hsl = hexToHSL(accentColor);
      if (hsl) {
        root.style.setProperty("--primary", hsl);
        root.style.setProperty("--accent", hsl);
        root.style.setProperty("--ring", hsl);
        root.style.setProperty("--glow", hsl);
        root.style.setProperty("--sidebar-primary", hsl);
        root.style.setProperty("--sidebar-ring", hsl);
      }
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--glow");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-ring");
    }
  }, [accentColor, theme]);

  // Apply font scale
  useEffect(() => {
    document.documentElement.style.fontSize = `${parseFloat(FONT_SCALE_VALUES[fontScale]) * 16}px`;
  }, [fontScale]);

  // Apply radius
  useEffect(() => {
    document.documentElement.style.setProperty("--radius", RADIUS_VALUES[radiusScale]);
  }, [radiusScale]);

  // Apply compact mode
  useEffect(() => {
    document.documentElement.classList.toggle("compact-mode", compactMode);
  }, [compactMode]);

  // Apply body font family. The optional fonts are self-hosted and only loaded when chosen.
  useEffect(() => {
    if (fontFamilyChoice === "mono") {
      import("@fontsource/jetbrains-mono/400.css");
      import("@fontsource/jetbrains-mono/500.css");
    } else if (fontFamilyChoice === "rounded") {
      import("@fontsource/dm-sans/400.css");
      import("@fontsource/dm-sans/500.css");
      import("@fontsource/dm-sans/700.css");
    }
    document.documentElement.style.setProperty("--font-body", FONT_FAMILY_VALUES[fontFamilyChoice]);
  }, [fontFamilyChoice]);

  // Accessibility / visual toggles
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle("dim-posters", dimPosters);
  }, [dimPosters]);

  useEffect(() => {
    document.documentElement.classList.toggle("poster-contain", posterFit === "contain");
  }, [posterFit]);

  useEffect(() => {
    document.documentElement.classList.toggle("no-spoiler-blur", !showSpoilerBlur);
  }, [showSpoilerBlur]);

  // Apply badge style class (allows CSS-scoped legacy fallbacks if needed)
  useEffect(() => {
    document.documentElement.classList.toggle("badge-old", badgeStyle === "old");
  }, [badgeStyle]);

  return (
    <ThemeContext.Provider value={{
      theme, setTheme, customCSS, setCustomCSS, navStyle, setNavStyle,
      accentColor, setAccentColor, fontScale, setFontScale, radiusScale, setRadiusScale,
      compactMode, setCompactMode,
      badgeStyle, setBadgeStyle,
      fontFamilyChoice, setFontFamilyChoice,
      reduceMotion, setReduceMotion,
      highContrast, setHighContrast,
      dimPosters, setDimPosters,
      posterFit, setPosterFit,
      showSpoilerBlur, setShowSpoilerBlur,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
