import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Type, Zap, Box, TextCursorInput, Tag, ToggleRight, Navigation, MessageSquare, Loader2, Home, Film, Gamepad2, Tv, Settings, Search, Bell, MoreVertical, ArrowLeft, Plus, Share2, Trash2, Heart, Bookmark, Edit, Link, ChevronUp, Sparkles, MousePointer, LayoutGrid, Hash } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";
import { useTiltCard } from "@/hooks/useTiltCard";
import { useCountUp } from "@/hooks/useCountUp";
import { useTypewriter } from "@/hooks/useTypewriter";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";

/* ═══════ SIDEBAR NAV DATA ═══════ */
const SECTIONS = [
  { group: "Foundation", items: [
    { id: "tokens", label: "Farben & Tokens", icon: Palette },
    { id: "typography", label: "Typografie", icon: Type },
    { id: "motion", label: "Motion & Physik", icon: Zap },
  ]},
  { group: "Komponenten", items: [
    { id: "buttons", label: "Buttons & FABs", icon: Box },
    { id: "cards", label: "Cards", icon: Box },
    { id: "inputs", label: "Inputs", icon: TextCursorInput },
    { id: "chips", label: "Chips & Badges", icon: Tag },
    { id: "controls", label: "Controls", icon: ToggleRight },
  ]},
  { group: "Navigation & Feedback", items: [
    { id: "navigation", label: "Navigation", icon: Navigation },
    { id: "dialogs", label: "Dialogs & Sheets", icon: MessageSquare },
    { id: "loading", label: "Loading", icon: Loader2 },
  ]},
  { group: "Animationen", items: [
    { id: "scroll-reveal", label: "Scroll Reveal", icon: Sparkles },
    { id: "stagger", label: "Stagger", icon: LayoutGrid },
    { id: "tilt-cards", label: "3D Tilt Cards", icon: MousePointer },
    { id: "count-up", label: "Count-Up", icon: Hash },
    { id: "typewriter", label: "Typewriter", icon: Type },
    { id: "special-fx", label: "Spezialeffekte", icon: Zap },
  ]},
];

/* ═══════ COLOR SWATCHES ═══════ */
const PRIMARY_COLORS = [
  { name: "--primary", val: "hsl(217 83% 42%)", color: "hsl(217 83% 42%)" },
  { name: "--accent", val: "hsl(320 32% 58%)", color: "hsl(320 32% 58%)" },
  { name: "--primary/30", val: "30% opacity", color: "hsl(217 83% 42% / 0.3)" },
  { name: "--primary/15", val: "15% opacity", color: "hsl(217 83% 42% / 0.15)" },
];
const NEUTRAL_COLORS = [
  { name: "--bg", val: "hsl(260 8% 10%)", color: "hsl(260 8% 10%)" },
  { name: "--card", val: "hsl(260 7% 13%)", color: "hsl(260 7% 13%)" },
  { name: "--secondary", val: "hsl(260 7% 17%)", color: "hsl(260 7% 17%)" },
  { name: "--muted", val: "hsl(260 6% 19%)", color: "hsl(260 6% 19%)" },
  { name: "--foreground", val: "hsl(250 18% 94%)", color: "hsl(250 18% 94%)" },
  { name: "--muted-fg", val: "hsl(250 6% 50%)", color: "hsl(250 6% 50%)" },
  { name: "--border", val: "hsl(260 6% 20%)", color: "hsl(260 6% 20%)" },
];
const SEMANTIC_COLORS = [
  { name: "--score-high", val: "Erfolg", color: "hsl(158 42% 50%)" },
  { name: "--score-mid", val: "Warnung", color: "hsl(38 62% 56%)" },
  { name: "--score-low", val: "Fehler", color: "hsl(4 58% 56%)" },
];

/* ═══════ EASING CURVES ═══════ */
const EASINGS = [
  {
    name: "Ease Out", code: "0.22, 1.0, 0.36, 1.0",
    desc: "Für eintretende Elemente — organisch ausbremsen.",
    path: "M8,48 C48,48 62,8 172,8",
  },
  {
    name: "Ease In", code: "0.55, 0.0, 1.0, 0.45",
    desc: "Für austretende Elemente — sanft beschleunigen.",
    path: "M8,48 C98,48 172,10 172,8",
  },
  {
    name: "Standard", code: "0.25, 0.1, 0.25, 1.0",
    desc: "Für sich bewegende Elemente — natürliche Bewegung.",
    path: "M8,48 C52,44 44,8 172,8",
  },
  {
    name: "Spring", code: "0.34, 1.2, 0.64, 1.0",
    desc: "Sanftes Überschwingen — lebendig aber nicht aufdringlich.",
    path: "M8,48 C72,48 108,0 140,6 C156,10 164,8 172,8",
  },
];

const DURATIONS = [
  { name: "--t-fast", val: "140ms", pct: 20, desc: "Hover, Farb- und Opacity-Wechsel, Mikro-Interaktionen" },
  { name: "--t-mid", val: "240ms", pct: 40, desc: "Dialog öffnen, Card-Hover, Zustandswechsel" },
  { name: "--t-slow", val: "360ms", pct: 60, desc: "Sheets, Nav-Slider, große Layout-Änderungen" },
  { name: "--t-enter", val: "440ms", pct: 73, desc: "Seiteneintritte, Hero-Animationen" },
];

/* ═══════ TYPOGRAPHY DATA ═══════ */
const TYPE_ROWS = [
  { label: "Display", spec: "42px / 400", style: "text-[42px] font-normal tracking-tight leading-none" as const, sample: "Material CC" },
  { label: "Headline", spec: "30px / 400", style: "text-[30px] font-normal tracking-tight" as const, sample: "Design System" },
  { label: "Title", spec: "20px / 700", style: "text-[20px] font-bold" as const, sample: "Komponenten & Tokens" },
  { label: "Body", spec: "15px / 400", style: "text-[15px] text-muted-foreground" as const, sample: "Fließtext für lange Inhalte und Beschreibungen. Gut lesbar auf dunklem Hintergrund mit ausreichend Zeilenabstand." },
  { label: "Label", spec: "11px / 700", style: "text-[11px] font-bold tracking-wider uppercase text-muted-foreground" as const, sample: "Abschnitt · Kategorie · Status" },
  { label: "Mono", spec: "12px / mono", style: "font-mono text-xs text-primary" as const, sample: "--accent: #1252c2;" },
];

/* ═══════ SECTION WRAPPER ═══════ */
const Section = ({ id, eyebrow, title, desc, children }: { id: string; eyebrow: string; title: string; desc: string; children: React.ReactNode }) => {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.04 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "mb-16 transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.05,0.7,0.1,1)" }}
    >
      <p className="text-[11px] font-bold tracking-widest uppercase text-primary mb-1.5">{eyebrow}</p>
      <h2 className="text-[26px] font-normal tracking-tight mb-1.5">{title}</h2>
      <p className="text-[13.5px] text-muted-foreground max-w-[540px] mb-7 leading-relaxed">{desc}</p>
      {children}
    </section>
  );
};

const DSCard = ({ label, children, className }: { label?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-card border border-border rounded-2xl p-6 mb-3", className)}>
    {label && <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted-foreground mb-4">{label}</p>}
    {children}
  </div>
);

/* ═══════ EASING DEMO ═══════ */
const EasingDemo = ({ name, code, desc, path }: typeof EASINGS[0]) => {
  const [play, setPlay] = useState(false);
  return (
    <div className="bg-secondary border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-bold">{name}</span>
        <span className="text-[10px] font-mono text-primary">{code}</span>
      </div>
      <svg className="w-full h-[52px] mb-2.5" viewBox="0 0 180 56">
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="48" r="3.5" fill="hsl(var(--primary))" />
        <circle cx="172" cy="8" r="3.5" fill="hsl(var(--primary))" />
      </svg>
      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{desc}</p>
      <div
        className="h-7 bg-muted rounded-full relative overflow-hidden cursor-pointer"
        onClick={() => setPlay(p => !p)}
      >
        <div
          className="w-7 h-7 rounded-full bg-primary absolute top-0"
          style={{
            left: play ? "calc(100% - 28px)" : "0px",
            transition: `left 600ms cubic-bezier(${code})`,
          }}
        />
      </div>
    </div>
  );
};

/* ═══════ DRAWER DEMO ═══════ */
const DrawerDemo = () => {
  const items = [
    { icon: Home, label: "Übersicht" },
    { icon: Film, label: "Filme" },
    { icon: Tv, label: "Serien" },
    { icon: Gamepad2, label: "Spiele" },
    { icon: Settings, label: "Einstellungen" },
  ];
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderTop, setSliderTop] = useState(0);

  const updateSlider = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-idx="${active}"]`) as HTMLElement;
    if (el) {
      setSliderTop(el.offsetTop);
    }
  }, [active]);

  useEffect(() => { requestAnimationFrame(updateSlider); }, [updateSlider]);

  return (
    <div className="flex h-[280px] bg-card border border-border rounded-2xl overflow-hidden">
      <div ref={containerRef} className="w-[196px] shrink-0 border-r border-border py-2 relative">
        <div
          className="absolute left-0 right-3 h-10 rounded-r-full bg-primary/15 pointer-events-none z-0"
          style={{ top: sliderTop, transition: "top 400ms cubic-bezier(0.34,1.56,0.64,1)" }}
        />
        <p className="px-4 pt-2 pb-1.5 text-[13px] font-bold text-muted-foreground">Material CC</p>
        {items.map((item, i) => (
          <button
            key={item.label}
            data-idx={i}
            onClick={() => setActive(i)}
            className={cn(
              "flex items-center gap-2.5 mr-3 px-4 py-2.5 text-[13px] rounded-r-full relative z-[1] w-full text-left transition-colors",
              active === i ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="w-[17px] h-[17px]" />
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-muted-foreground">Seiteninhalt</p>
      </div>
    </div>
  );
};

/* ═══════ BOTTOM NAV DEMO ═══════ */
const BottomNavDemo = () => {
  const items = [
    { icon: Home, label: "Home" },
    { icon: Film, label: "Filme" },
    { icon: Gamepad2, label: "Spiele" },
    { icon: Settings, label: "Profil" },
  ];
  const [active, setActive] = useState(0);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="h-12 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Seiteninhalt</span>
      </div>
      <div className="flex h-[76px] border-t border-border relative">
        <div
          className="absolute top-2.5 h-8 w-16 rounded-full bg-primary/15 pointer-events-none z-0"
          style={{
            left: `calc(${active * 25}% + 12.5% - 32px)`,
            transition: "left 400ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
        {items.map((item, i) => (
          <button
            key={item.label}
            onClick={() => setActive(i)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-bold relative z-[1] transition-colors",
              active === i ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-[23px] h-[23px]" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══════ CHIP COMPONENT ═══════ */
const Chip = ({ children, defaultOn = false, icon: Icon }: { children: React.ReactNode; defaultOn?: boolean; icon?: any }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(o => !o)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold border-[1.5px] cursor-pointer transition-all active:scale-95",
        on
          ? "bg-primary/15 border-primary/30 text-primary scale-[1.02]"
          : "bg-transparent border-border text-foreground hover:bg-muted"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)", transitionDuration: "120ms" }}
    >
      {Icon && <Icon className="w-[15px] h-[15px]" />}
      {children}
    </button>
  );
};

/* ═══════ MAIN PAGE ═══════ */
const DesignSystemPage = () => {
  const [activeSection, setActiveSection] = useState("tokens");
  const navRef = useRef<HTMLElement>(null);
  const [sliderStyle, setSliderStyle] = useState<{ top: number; height: number } | null>(null);

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      let cur = "tokens";
      SECTIONS.forEach(g => g.items.forEach(s => {
        const el = document.getElementById(s.id);
        if (el && window.scrollY >= el.offsetTop - 120) cur = s.id;
      }));
      setActiveSection(cur);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Slider position
  useEffect(() => {
    if (!navRef.current) return;
    const el = navRef.current.querySelector(`[data-nav-id="${activeSection}"]`) as HTMLElement;
    if (el) {
      const containerRect = navRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setSliderStyle({
        top: elRect.top - containerRect.top + navRef.current.scrollTop,
        height: elRect.height,
      });
    }
  }, [activeSection]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">

      <div className="flex">
        {/* Sidebar */}
        <aside
          ref={navRef}
          className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-border h-[calc(100vh-60px)] sticky top-[60px] overflow-y-auto py-4 relative"
        >
          {sliderStyle && (
            <div
              className="absolute left-0 right-3 bg-primary/15 rounded-r-full pointer-events-none z-0"
              style={{
                top: sliderStyle.top,
                height: sliderStyle.height,
                transition: "top 400ms cubic-bezier(0.34,1.56,0.64,1), height 250ms cubic-bezier(0.05,0.7,0.1,1)",
              }}
            />
          )}
          <div className="px-4 pb-2 mb-1">
            <h1 className="text-[13px] font-bold">Material CC</h1>
            <span className="text-[10px] text-muted-foreground">Design System v3.0</span>
          </div>
          {SECTIONS.map(group => (
            <div key={group.group}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">{group.group}</p>
              {group.items.map(item => (
                <button
                  key={item.id}
                  data-nav-id={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 mr-3 px-4 py-2 text-[13px] rounded-r-full relative z-[1] w-full text-left transition-colors",
                    activeSection === item.id
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-[17px] h-[17px]" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 py-12 px-6 sm:px-10 max-w-[900px]">

          {/* ═══ TOKENS ═══ */}
          <Section id="tokens" eyebrow="Foundation" title="Farben & Tokens" desc="Alle Werte sind CSS Custom Properties — konsistent verwendbar in der gesamten Codebasis.">
            <DSCard label="Primäre Palette">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRIMARY_COLORS.map(c => (
                  <div key={c.name} className="rounded-xl overflow-hidden border border-border">
                    <div className="h-14" style={{ background: c.color }} />
                    <div className="p-2 bg-secondary">
                      <span className="text-[11px] font-bold block">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </DSCard>
            <DSCard label="Neutrale Palette">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {NEUTRAL_COLORS.map(c => (
                  <div key={c.name} className="rounded-xl overflow-hidden border border-border">
                    <div className="h-14" style={{ background: c.color }} />
                    <div className="p-2 bg-secondary">
                      <span className="text-[11px] font-bold block">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </DSCard>
            <DSCard label="Semantisch">
              <div className="grid grid-cols-3 gap-2.5">
                {SEMANTIC_COLORS.map(c => (
                  <div key={c.name} className="rounded-xl overflow-hidden border border-border">
                    <div className="h-14" style={{ background: c.color }} />
                    <div className="p-2 bg-secondary">
                      <span className="text-[11px] font-bold block">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </DSCard>
            <DSCard label="CSS Tokens">
              <pre className="bg-secondary border border-border rounded-xl p-4 text-xs text-muted-foreground font-mono overflow-x-auto leading-loose whitespace-pre-wrap">
{`/* Material CC 3.0 — Soft & Organic */
--primary:     217 83% 42%;    /* brand blue */
--accent:      320 32% 58%;    /* rose/mauve */
--background:  260 8% 10%;     /* warm dark */
--foreground:  250 18% 94%;    /* soft white */

/* Radius — pillowy */
--radius:      1.125rem;       /* 18px default */
--shape-xl:    28px;           /* dialogs, large cards */

/* Shadow — warm, diffused */
--shadow-card: 0 2px 8px -2px hsl(260 20% 6% / 0.30);

/* Motion — organic, gentle */
--ease-out:    cubic-bezier(0.22, 1, 0.36, 1);
--ease-spring: cubic-bezier(0.34, 1.2, 0.64, 1);
--t-fast:      140ms;
--t-mid:       240ms;`}
              </pre>
            </DSCard>
          </Section>

          {/* ═══ TYPOGRAPHY ═══ */}
          <Section id="typography" eyebrow="Foundation" title="Typografie" desc="Glacial Indifference als Hausschrift — geometrisch, klar und unverwechselbar.">
            <DSCard>
              {TYPE_ROWS.map((row, i) => (
                <div key={row.label} className={cn("flex items-baseline gap-6 py-4", i < TYPE_ROWS.length - 1 && "border-b border-border")}>
                  <div className="min-w-[130px] shrink-0">
                    <span className="text-[11px] text-muted-foreground block">{row.label}</span>
                    <span className="text-[10px] text-primary font-mono">{row.spec}</span>
                  </div>
                  <div className={row.style}>{row.sample}</div>
                </div>
              ))}
            </DSCard>
          </Section>

          {/* ═══ MOTION ═══ */}
          <Section id="motion" eyebrow="Foundation" title="Motion & Physik" desc="Jede Animation folgt einer physikalischen Logik. Klicke auf die Balken um die Kurven in Aktion zu sehen.">
            <DSCard label="Easing Kurven">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EASINGS.map(e => <EasingDemo key={e.name} {...e} />)}
              </div>
            </DSCard>
            <DSCard label="Dauer Tokens">
              <div className="flex flex-col gap-2.5">
                {DURATIONS.map(d => (
                  <div key={d.name} className="flex items-center gap-4 p-3 bg-secondary border border-border rounded-xl">
                    <div className="min-w-[90px]">
                      <b className="text-[13px] block">{d.name}</b>
                      <code className="text-[10px] text-primary font-mono">{d.val}</code>
                    </div>
                    <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${d.pct}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground min-w-[180px] leading-snug">{d.desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-primary/15 border border-primary/30 rounded-xl p-4 mt-3">
                <h4 className="text-[11.5px] font-bold text-primary mb-2.5">Faustregel</h4>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                  <div>→ Eintretend: <b className="text-foreground">Ease Out + t-mid</b></div>
                  <div>→ Austretend: <b className="text-foreground">Ease In + t-fast</b></div>
                  <div>→ Bewegend: <b className="text-foreground">Standard + t-mid</b></div>
                  <div>→ Interaktiv: <b className="text-foreground">Spring + t-fast</b></div>
                </div>
              </div>
            </DSCard>
          </Section>

          {/* ═══ BUTTONS ═══ */}
          <Section id="buttons" eyebrow="Komponenten" title="Buttons & FABs" desc="Fünf Varianten nach M3 mit Ripple-Effekt und Spring-Animation.">
            <DSCard label="Varianten">
              <div className="flex flex-wrap gap-2.5 mb-5">
                <Button>Filled</Button>
                <Button variant="secondary">Tonal</Button>
                <Button variant="outline">Outlined</Button>
                <Button variant="ghost">Text</Button>
                <Button variant="destructive"><Trash2 className="w-4 h-4 mr-1.5" />Löschen</Button>
              </div>
              <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Mit Icon</p>
              <div className="flex flex-wrap gap-2.5 mb-5">
                <Button><Plus className="w-4 h-4 mr-1.5" />Erstellen</Button>
                <Button variant="outline"><Share2 className="w-4 h-4 mr-1.5" />Teilen</Button>
              </div>
              <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Icon Buttons</p>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="icon" aria-label="Like"><Heart className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" aria-label="Bookmark" className="text-primary bg-primary/15"><Bookmark className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" aria-label="Share"><Share2 className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" aria-label="More options"><MoreVertical className="w-5 h-5" /></Button>
              </div>
            </DSCard>
            <DSCard label="FAB — Floating Action Button">
              <div className="flex items-end gap-4">
                <button className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform" style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}><Plus className="w-5 h-5" /></button>
                <button className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform" style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}><Plus className="w-6 h-6" /></button>
                <button className="w-24 h-24 rounded-[28px] bg-primary text-primary-foreground flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform" style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}><Plus className="w-9 h-9" /></button>
                <button className="w-14 h-14 rounded-2xl bg-secondary text-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform" style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}><Edit className="w-6 h-6" /></button>
                <button className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform" style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}><Heart className="w-6 h-6" /></button>
              </div>
            </DSCard>
          </Section>

          {/* ═══ CARDS ═══ */}
          <Section id="cards" eyebrow="Komponenten" title="Cards & Surfaces" desc="Filled, Outlined und Elevated — alle mit hover Lift-Animation.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "Filled", icon: Film, eye: "Film", bg: "bg-secondary border-transparent" },
                { type: "Outlined", icon: Gamepad2, eye: "Spiel", bg: "bg-transparent" },
                { type: "Elevated", icon: Tv, eye: "Serie", bg: "bg-card shadow-md border-transparent" },
              ].map(c => (
                <div
                  key={c.type}
                  className={cn(
                    "rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                    c.bg
                  )}
                  style={{ transitionTimingFunction: "cubic-bezier(0.05,0.7,0.1,1)" }}
                >
                  <div className="h-[130px] bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                    <c.icon className="w-11 h-11 text-muted-foreground/40" />
                  </div>
                  <div className="p-4">
                    <p className="text-[10.5px] font-bold tracking-wider uppercase text-primary mb-1">{c.eye}</p>
                    <p className="text-[15px] font-bold mb-1.5">{c.type} Card</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">Subtiler Hintergrund für sekundäre Inhalte.</p>
                  </div>
                  <div className="px-4 py-2.5 border-t border-border flex gap-1.5">
                    <Button variant="ghost" size="sm" className="text-xs">Mehr</Button>
                    <Button size="sm" className="text-xs">Öffnen</Button>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ═══ INPUTS ═══ */}
          <Section id="inputs" eyebrow="Komponenten" title="Inputs & Textfields" desc="Fokus-Animation mit Accent-Glow, Error-States und Icon-Support.">
            <DSCard>
              <div className="flex flex-wrap gap-5">
                <div className="w-[260px] space-y-1.5">
                  <Label>Benutzername</Label>
                  <Input placeholder="@username" />
                  <p className="text-[11px] text-muted-foreground">Mindestens 3 Zeichen</p>
                </div>
                <div className="w-[260px] space-y-1.5">
                  <Label>E-Mail</Label>
                  <Input type="email" placeholder="name@example.com" />
                </div>
                <div className="w-[260px] space-y-1.5">
                  <Label>Passwort</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div className="w-[260px] space-y-1.5">
                  <Label>Fehler-State</Label>
                  <Input defaultValue="Ungültige Eingabe" className="border-destructive" />
                  <p className="text-[11px] text-destructive">Dieses Feld ist erforderlich</p>
                </div>
                <div className="w-full max-w-[540px] space-y-1.5">
                  <Label>Beschreibung</Label>
                  <Textarea placeholder="Schreibe hier etwas…" />
                </div>
                <div className="w-[260px] space-y-1.5">
                  <Label>Kategorie</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="filme">Filme</SelectItem>
                      <SelectItem value="serien">Serien</SelectItem>
                      <SelectItem value="spiele">Spiele</SelectItem>
                      <SelectItem value="anime">Anime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DSCard>
          </Section>

          {/* ═══ CHIPS & BADGES ═══ */}
          <Section id="chips" eyebrow="Komponenten" title="Chips & Badges" desc="Filter-Chips mit Toggle-State, Badges für Statusanzeigen.">
            <DSCard label="Chips">
              <div className="flex flex-wrap gap-2.5 mb-5">
                <Chip>Standard</Chip>
                <Chip defaultOn>Aktiv</Chip>
                <Chip icon={Film}>Film</Chip>
                <Chip icon={Plus}>Hinzufügen</Chip>
              </div>
              <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Filter Chips</p>
              <div className="flex flex-wrap gap-2.5">
                <Chip>Alle</Chip>
                <Chip defaultOn>Filme</Chip>
                <Chip>Serien</Chip>
                <Chip>Spiele</Chip>
                <Chip>Anime</Chip>
                <Chip>Bücher</Chip>
              </div>
            </DSCard>
            <DSCard label="Badges">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Button variant="ghost" size="icon" aria-label="Notifications"><Bell className="w-5 h-5" /></Button>
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-[11px]">3</Badge>
                </div>
                <div className="relative">
                  <Button variant="ghost" size="icon" aria-label="Edit"><Edit className="w-5 h-5" /></Button>
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-primary" />
                </div>
                <Badge>12</Badge>
                <Badge variant="destructive">!</Badge>
                <Badge className="bg-emerald-600 text-primary-foreground">✓</Badge>
                <Badge className="bg-amber-500 text-background">99+</Badge>
              </div>
            </DSCard>
          </Section>

          {/* ═══ CONTROLS ═══ */}
          <Section id="controls" eyebrow="Komponenten" title="Controls" desc="Switch, Checkbox, Radio — alle mit Spring-Animationen.">
            <DSCard>
              <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Switch</p>
              <div className="flex gap-5 mb-6">
                <Switch />
                <Switch defaultChecked />
              </div>
              <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Checkbox</p>
              <div className="flex gap-6 mb-6">
                <div className="flex items-center gap-2.5">
                  <Checkbox id="cb1" />
                  <Label htmlFor="cb1" className="text-sm text-muted-foreground">Nicht gewählt</Label>
                </div>
                <div className="flex items-center gap-2.5">
                  <Checkbox id="cb2" defaultChecked />
                  <Label htmlFor="cb2" className="text-sm">Ausgewählt</Label>
                </div>
              </div>
              <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Radio</p>
              <RadioGroup defaultValue="b" className="flex gap-6">
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem value="a" id="ra" />
                  <Label htmlFor="ra" className="text-sm text-muted-foreground">Option A</Label>
                </div>
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem value="b" id="rb" />
                  <Label htmlFor="rb" className="text-sm">Option B</Label>
                </div>
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem value="c" id="rc" />
                  <Label htmlFor="rc" className="text-sm text-muted-foreground">Option C</Label>
                </div>
              </RadioGroup>
            </DSCard>
          </Section>

          {/* ═══ NAVIGATION ═══ */}
          <Section id="navigation" eyebrow="Navigation" title="Navigation" desc="Top App Bar, Bottom Nav mit slidender Pill, Navigation Drawer mit gleitendem Highlight.">
            <DSCard label="Top App Bar">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="h-[54px] flex items-center px-3 gap-1 border-b border-border">
                  <Button variant="ghost" size="icon" aria-label="Back"><ArrowLeft className="w-5 h-5" /></Button>
                  <span className="flex-1 text-[17px] pl-2">Material CC</span>
                  <Button variant="ghost" size="icon" aria-label="Search"><Search className="w-5 h-5" /></Button>
                  <div className="relative">
                    <Button variant="ghost" size="icon" aria-label="Notifications"><Bell className="w-5 h-5" /></Button>
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-[11px]">2</Badge>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="More options"><MoreVertical className="w-5 h-5" /></Button>
                </div>
                <div className="h-12 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Seiteninhalt</span>
                </div>
              </div>
            </DSCard>
            <DSCard label="Bottom Navigation">
              <BottomNavDemo />
            </DSCard>
            <DSCard label="Navigation Drawer">
              <DrawerDemo />
            </DSCard>
          </Section>

          {/* ═══ DIALOGS ═══ */}
          <Section id="dialogs" eyebrow="Feedback" title="Dialogs & Sheets" desc="Dialog mit Scale-Spring, Bottom Sheet mit Slide-up-Animation.">
            <DSCard label="Demo">
              <div className="flex flex-wrap gap-2.5">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Dialog öffnen</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <Trash2 className="w-6 h-6 text-primary mb-3" />
                      <DialogTitle>Eintrag löschen?</DialogTitle>
                      <DialogDescription>
                        Dieser Eintrag wird dauerhaft gelöscht und kann nicht wiederhergestellt werden.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="ghost">Abbrechen</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="destructive" onClick={() => toast("Gelöscht")}>Löschen</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Bottom Sheet</Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader>
                      <SheetTitle>Aktionen</SheetTitle>
                    </SheetHeader>
                    <div className="py-2 space-y-1">
                      {[
                        { icon: Edit, label: "Bearbeiten", msg: "Bearbeitet" },
                        { icon: Link, label: "Link kopieren", msg: "Link kopiert" },
                        { icon: Share2, label: "Teilen", msg: "Geteilt" },
                      ].map(a => (
                        <SheetClose key={a.label} asChild>
                          <button
                            onClick={() => toast(a.msg)}
                            className="flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full text-left transition-colors"
                          >
                            <a.icon className="w-5 h-5" />
                            {a.label}
                          </button>
                        </SheetClose>
                      ))}
                      <SheetClose asChild>
                        <button className="flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm text-destructive hover:bg-destructive/10 w-full text-left transition-colors">
                          <Trash2 className="w-5 h-5" />
                          Löschen
                        </button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>

                <Button variant="secondary" onClick={() => toast("Gespeichert!")}>Snackbar</Button>
              </div>
            </DSCard>
          </Section>

          {/* ═══ LOADING ═══ */}
          <Section id="loading" eyebrow="Feedback" title="Loading & Progress" desc="Linear, Circular, Skeleton und M3 Expressive Shape Indicator.">
            <DSCard label="Linear Progress">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Determiniert — 65%</p>
                  <Progress value={65} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Indeterminate</p>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden relative">
                    <div className="absolute h-full w-[40%] bg-primary rounded-full animate-[lin-slide_1.6s_cubic-bezier(0.2,0,0,1)_infinite]" />
                  </div>
                </div>
              </div>
            </DSCard>
            <DSCard label="Skeleton Loader">
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-[120px] rounded-2xl" />
                <Skeleton className="h-[18px] w-[55%]" />
                <Skeleton className="h-[13px] w-[75%]" />
                <Skeleton className="h-[13px] w-[40%]" />
              </div>
            </DSCard>
            <DSCard label="M3 Expressive Loading Indicator">
              <div className="flex gap-10 items-center justify-center py-6">
                <div className="flex flex-col items-center gap-2.5">
                  <M3LoadingIndicator size={72} />
                  <span className="text-[11px] text-muted-foreground">Ohne Hintergrund</span>
                </div>
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center">
                    <M3LoadingIndicator size={60} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Mit Hintergrund</span>
                </div>
              </div>
            </DSCard>
          </Section>

          {/* ═══ SCROLL REVEAL ═══ */}
          <ScrollRevealSection />

          {/* ═══ STAGGER ═══ */}
          <StaggerSection />

          {/* ═══ 3D TILT ═══ */}
          <TiltCardSection />

          {/* ═══ COUNT-UP ═══ */}
          <CountUpSection />

          {/* ═══ TYPEWRITER ═══ */}
          <TypewriterSection />

          {/* ═══ SPECIAL FX ═══ */}
          <SpecialFxSection />

        </main>
      </div>

      <Footer />
    </div>
  );
};

/* ═══════ ANIMATION DEMO SECTIONS ═══════ */

// Its own component: a hook inside the map callback broke the rules of hooks
const FadeUpTile = ({ label, delay }: { label: string; delay: number }) => {
  const r = useScrollReveal({ direction: "up", delay });
  return (
    <div ref={r.ref as any} className={cn("bg-secondary border border-border rounded-xl p-5 text-center", r.className)}>
      <Film className="w-6 h-6 text-primary mx-auto mb-2" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
};

const ScrollRevealSection = () => {
  const fadeUp = useScrollReveal({ direction: "up" });
  const fadeLeft = useScrollReveal({ direction: "left", delay: 100 });
  const fadeRight = useScrollReveal({ direction: "right", delay: 100 });
  const scaleIn = useScrollReveal({ direction: "scale", delay: 200 });

  return (
    <Section id="scroll-reveal" eyebrow="Animation" title="Scroll Reveal" desc="Elemente animieren sich beim Einblenden — Fade Up, Links/Rechts, Scale.">
      <DSCard label="Fade Up">
        <div className="grid grid-cols-3 gap-3">
          {["Filme", "Serien", "Spiele"].map((label, i) => (
            <FadeUpTile key={label} label={label} delay={i * 80} />
          ))}
        </div>
      </DSCard>
      <DSCard label="Links & Rechts">
        <div className="grid grid-cols-2 gap-3">
          <div ref={fadeLeft.ref as any} className={cn("bg-secondary border border-border rounded-xl p-5 text-center", fadeLeft.className)}>
            <ArrowLeft className="w-6 h-6 text-primary mx-auto mb-2" />
            <span className="text-sm font-bold">Slide Left</span>
          </div>
          <div ref={fadeRight.ref as any} className={cn("bg-secondary border border-border rounded-xl p-5 text-center", fadeRight.className)}>
            <Share2 className="w-6 h-6 text-primary mx-auto mb-2" />
            <span className="text-sm font-bold">Slide Right</span>
          </div>
        </div>
      </DSCard>
      <DSCard label="Scale">
        <div ref={scaleIn.ref as any} className={cn("bg-secondary border border-border rounded-xl p-8 text-center", scaleIn.className)}>
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
          <span className="text-lg font-bold">Scale In</span>
          <p className="text-xs text-muted-foreground mt-1">Element skaliert von 88% auf 100%</p>
        </div>
      </DSCard>
    </Section>
  );
};

const StaggerSection = () => {
  const { containerRef, revealed, getItemStyle, getItemClassName } = useStaggerReveal({ staggerDelay: 80 });
  const list = useStaggerReveal({ staggerDelay: 70 });

  const gridItems = [
    { icon: Film, label: "Filme", sub: "1.2k Einträge" },
    { icon: Tv, label: "Serien", sub: "840 Einträge" },
    { icon: Gamepad2, label: "Spiele", sub: "620 Einträge" },
    { icon: Bookmark, label: "Bücher", sub: "310 Einträge" },
  ];

  const listItems = [
    { num: "01", icon: Gamepad2, title: "Elden Ring", score: "★ 9.4" },
    { num: "02", icon: Film, title: "Oppenheimer", score: "★ 8.9" },
    { num: "03", icon: Tv, title: "The Last of Us", score: "★ 9.1" },
    { num: "04", icon: Gamepad2, title: "Baldur's Gate 3", score: "★ 9.7" },
    { num: "05", icon: Film, title: "Poor Things", score: "★ 8.6" },
  ];

  return (
    <Section id="stagger" eyebrow="Animation" title="Stagger" desc="Elemente erscheinen nacheinander mit zeitversetztem Delay — für Listen und Grids.">
      <DSCard label="Grid — Cards">
        <div ref={containerRef as any} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {gridItems.map((item, i) => (
            <div key={item.label} className={cn("bg-secondary border border-border rounded-xl p-5 text-center", getItemClassName())} style={getItemStyle(i)}>
              <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <span className="text-sm font-bold block">{item.label}</span>
              <span className="text-[11px] text-muted-foreground">{item.sub}</span>
            </div>
          ))}
        </div>
      </DSCard>
      <DSCard label="Liste — Rows">
        <div ref={list.containerRef as any} className="flex flex-col gap-1.5">
          {listItems.map((item, i) => (
            <div key={item.num} className={cn("flex items-center gap-3 bg-secondary border border-border rounded-xl px-4 py-3", list.getItemClassName())} style={list.getItemStyle(i)}>
              <span className="text-xs font-bold text-muted-foreground w-6">{item.num}</span>
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold flex-1">{item.title}</span>
              <span className="text-xs text-primary font-bold">{item.score}</span>
            </div>
          ))}
        </div>
      </DSCard>
    </Section>
  );
};

const TiltCardSection = () => {
  const tilt1 = useTiltCard();
  const tilt2 = useTiltCard();
  const tilt3 = useTiltCard();
  const cards = [
    { ref: tilt1, icon: Film, title: "Oppenheimer", sub: "Drama · 2023 · ★ 9.1" },
    { ref: tilt2, icon: Gamepad2, title: "Elden Ring", sub: "Action RPG · 2022 · ★ 9.4" },
    { ref: tilt3, icon: Tv, title: "The Last of Us", sub: "Serie · 2023 · ★ 9.2" },
  ];

  return (
    <Section id="tilt-cards" eyebrow="Animation" title="3D Tilt Cards" desc="Cards kippen der Maus entgegen — mit Licht-Reflexion und Perspektive.">
      <DSCard label="Hover für den 3D-Effekt">
        <div className="grid grid-cols-3 gap-3">
          {cards.map((c) => (
            <div
              key={c.title}
              ref={c.ref.ref as any}
              onMouseMove={c.ref.onMouseMove}
              onMouseLeave={c.ref.onMouseLeave}
              className="mcc-tilt-card bg-card border border-border rounded-2xl p-5 cursor-pointer relative overflow-hidden"
              style={{ transformStyle: "preserve-3d", perspective: "800px" }}
            >
              <div className="mcc-tilt-shine" />
              <c.icon className="w-7 h-7 text-primary mb-3" />
              <p className="text-sm font-bold mb-1">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </div>
          ))}
        </div>
      </DSCard>
    </Section>
  );
};

const CountUpSection = () => {
  const reviews = useCountUp({ target: 42600 });
  const users = useCountUp({ target: 8240 });
  const titles = useCountUp({ target: 1248 });
  const satisfaction = useCountUp({ target: 96, suffix: "%", formatK: false });

  const stats = [
    { ...reviews, label: "Reviews", icon: Edit },
    { ...users, label: "Nutzer", icon: Heart },
    { ...titles, label: "Titel", icon: Bookmark },
    { ...satisfaction, label: "Zufrieden", icon: ChevronUp },
  ];

  return (
    <Section id="count-up" eyebrow="Animation" title="Number Count-Up" desc="Zahlen zählen beim Einblenden hoch — zieht Aufmerksamkeit auf Stats und Metriken.">
      <DSCard label="CritiCore Stats">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} ref={s.ref as any} className={cn("mcc-count-card bg-secondary border border-border rounded-xl p-5 text-center relative overflow-hidden", s.started && "mcc-counted")}>
              <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="mcc-count-num text-2xl font-bold tabular-nums">{s.displayValue}</div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </DSCard>
    </Section>
  );
};

const TypewriterSection = () => {
  const { text, restart } = useTypewriter({
    phrases: ["Ehrliche Reviews.", "Eine Community.", "Deine Stimme zählt.", "Jetzt in Beta."],
  });

  return (
    <Section id="typewriter" eyebrow="Animation" title="Typewriter" desc="Text wird Zeichen für Zeichen eingetippt — mit blinkendem Cursor.">
      <DSCard>
        <div className="min-h-[40px] mb-4">
          <span className="text-[28px] font-bold tracking-tight">{text}</span>
          <span className="mcc-typewriter-cursor" />
        </div>
        <Button variant="secondary" size="sm" onClick={restart}>
          <Sparkles className="w-4 h-4 mr-1.5" />Neustart
        </Button>
      </DSCard>
    </Section>
  );
};

const SpecialFxSection = () => {
  const [confettiActive, setConfettiActive] = useState(false);

  const launchConfetti = () => {
    setConfettiActive(true);
    const colors = ["hsl(218,83%,51%)", "hsl(140,38%,54%)", "hsl(38,73%,58%)", "hsl(0,64%,65%)", "hsl(270,60%,60%)"];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement("div");
      piece.className = "mcc-confetti-piece";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (1.5 + Math.random() * 2) + "s";
      piece.style.width = (6 + Math.random() * 6) + "px";
      piece.style.height = (6 + Math.random() * 6) + "px";
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
    setTimeout(() => setConfettiActive(false), 4000);
  };

  return (
    <Section id="special-fx" eyebrow="Animation" title="Spezialeffekte" desc="Morphing Cards, Liquid Buttons, Floating Elements und Konfetti.">
      <DSCard label="Morphing Card">
        <div className="flex gap-4 flex-wrap">
          {["Filme", "Serien", "Spiele", "Bücher"].map((label) => (
            <div key={label} className="mcc-morph-card w-[120px] bg-secondary border border-border rounded-2xl p-5 text-center">
              <Film className="w-8 h-8 text-primary mx-auto mb-2" />
              <span className="text-xs font-bold">{label}</span>
            </div>
          ))}
        </div>
      </DSCard>
      <DSCard label="Liquid Button">
        <div className="flex gap-4 flex-wrap items-center">
          <button className="mcc-liquid-btn text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Jetzt starten</span>
          </button>
          <button className="mcc-liquid-btn text-sm" style={{ borderColor: "hsl(var(--score-high))", color: "hsl(var(--score-high))" }}>
            <Heart className="w-4 h-4" />
            <span>Bestätigen</span>
          </button>
        </div>
      </DSCard>
      <DSCard label="Floating Elements">
        <div className="flex gap-6 items-center justify-center py-6 relative" style={{ height: 120 }}>
          <div className="mcc-float-1 w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Film className="w-5 h-5 text-primary" />
          </div>
          <div className="mcc-float-2 w-16 h-16 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-primary" />
          </div>
          <div className="mcc-float-3 w-10 h-10 rounded-full bg-primary/25 border border-primary/30 flex items-center justify-center">
            <Tv className="w-4 h-4 text-primary" />
          </div>
        </div>
      </DSCard>
      <DSCard label="Konfetti">
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-4">Für Erfolgsmomente — Konfetti regnet von oben.</p>
          <Button onClick={launchConfetti} disabled={confettiActive}>
            <Sparkles className="w-4 h-4 mr-1.5" />Konfetti!
          </Button>
        </div>
      </DSCard>
    </Section>
  );
};

export default DesignSystemPage;
