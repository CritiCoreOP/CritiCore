import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "@/lib/locale-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useEditorHistory } from "@/hooks/useEditorHistory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  Loader2, ArrowLeft, Package, ImageDown, Play, Square, Film, FileVideo, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
  Share2, Keyboard, LayoutTemplate, Type, Clapperboard, Upload, BadgeCheck, Shapes, X, SlidersHorizontal, Layers, GalleryHorizontal, FilePlus2, MoreHorizontal, ScanLine,
} from "lucide-react";
import { Slide, CanvasElement } from "@/components/social-creator/types";
import { getFormat } from "@/components/social-creator/formats";
import { newSlide, uid } from "@/components/social-creator/templates";
import { slideDurationMs } from "@/components/social-creator/animations";
import { slideFromArticle, summaryLength } from "@/components/social-creator/articleSlide";
import { clipText, summarizeArticle } from "@/components/social-creator/articleSummary";
import { loadAuthors } from "@/lib/articleAuthor";
import SocialCanvas from "@/components/social-creator/SocialCanvas";
import Inspector from "@/components/social-creator/Inspector";
import { BrandPanel, ElementsPanel, MediaPanel, TemplatesPanel, TextPanel, UploadsLibrary } from "@/components/social-creator/LibraryPanels";
import { Filmstrip, LayersPanel, MultiPanel, SelectionBar, type CanvasAlign, type SelectionActions } from "@/components/social-creator/EditorParts";
import { alignUnits, cloneElements, distributeUnits, idsInRect, restack, selectionInfo, stylePatches, toggleIds, type Patches, type Rect } from "@/components/social-creator/selection";
import { exportNodeAsPng, exportPackAsZip, exportSlideAsVideo, exportSlideAsTransparentVideo } from "@/components/social-creator/exportUtils";

const DRAFT_KEY = "socialCreator.draft.v2";
const NAME_KEY = "socialCreator.name";

type Tool = "templates" | "text" | "media" | "uploads" | "brand" | "elements";

const TOOLS: { id: Tool; icon: typeof Type }[] = [
  { id: "templates", icon: LayoutTemplate },
  { id: "text", icon: Type },
  { id: "media", icon: Clapperboard },
  { id: "uploads", icon: Upload },
  { id: "brand", icon: BadgeCheck },
  { id: "elements", icon: Shapes },
];

const SHORTCUTS: [string, string][] = [
  ["⇧ Klick", "multiSelect"],
  ["⌘/Strg A", "selectAll"],
  ["⌘/Strg G", "group"],
  ["⌘/Strg Z", "undo"],
  ["⌘/Strg ⇧ Z", "redo"],
  ["⌘/Strg C · X · V", "copyPaste"],
  ["⌘/Strg ⌥ C · V", "style"],
  ["⌘/Strg D", "duplicate"],
  ["⌘/Strg ] · [", "layer"],
  ["⌘/Strg S", "export"],
  ["Enter", "editText"],
  ["Pfeiltasten", "nudge"],
  ["Alt", "noSnap"],
  ["⌘/Strg Mausrad", "zoom"],
  ["Leertaste", "preview"],
  ["Entf", "delete"],
];

const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Strg ";

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "criticore";

export default function SocialPackCreatorPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  const history = useEditorHistory<Slide[]>([newSlide("ig-post", 1080, 1080, "review")]);
  const slides = history.state;
  const setSlides = history.set;

  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool | null>("templates");
  const [rightTab, setRightTab] = useState<"design" | "layers">("design");
  const [sheet, setSheet] = useState<"tool" | "design" | "slides" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [transparentExport, setTransparentExport] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [safeZones, setSafeZones] = useState(false);
  const [restored, setRestored] = useState(false);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) || "";
    } catch {
      return "";
    }
  });
  const rafRef = useRef<number>();
  const clipboard = useRef<{ els: CanvasElement[]; slideId: string; pastes: number } | null>(null);
  const styleClipboard = useRef<CanvasElement | null>(null);

  const refs = useRef<Map<string, HTMLDivElement>>(new Map());
  const viewportRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 600, h: 600 });

  useEffect(() => {
    document.title = `${name || t("socialCreator.title", "Social Pack Creator")} | CritiCore`;
  }, [t, name]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (user) {
      (async () => {
        // The press role is given when an admin verifies a press profile; an unverified application is not enough
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        setAllowed((roles || []).some((r) => r.role === "admin" || r.role === "press"));
        setChecking(false);
      })();
    }
  }, [user, authLoading, navigate]);

  /* ---------- draft persistence ---------- */
  useEffect(() => {
    if (!allowed || restored) return;
    setRestored(true);
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Slide[];
      if (Array.isArray(parsed) && parsed.length && parsed[0]?.elements) {
        history.reset(parsed);
        if (!params.get("article")) toast.success(t("socialCreator.draftRestored", "Entwurf wiederhergestellt"));
      }
    } catch { /* ignore malformed drafts */ }
  }, [allowed, restored, history, t, params]);

  useEffect(() => {
    if (!restored) return;
    const id = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(slides)); } catch { /* quota */ }
    }, 600);
    return () => clearTimeout(id);
  }, [slides, restored]);

  useEffect(() => {
    try { localStorage.setItem(NAME_KEY, name); } catch { /* storage blocked */ }
  }, [name]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBox({ w: Math.max(120, el.clientWidth - 64), h: Math.max(120, el.clientHeight - 96) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [allowed]);

  const active = slides[Math.min(activeIdx, slides.length - 1)];
  const selectedEls = useMemo(() => (active?.elements || []).filter((e) => selectedIds.includes(e.id)), [active, selectedIds]);
  const selectedEl = selectedEls.length === 1 ? selectedEls[0] : null;
  const duration = useMemo(() => slideDurationMs(active?.elements || []), [active]);
  const hasAnimations = useMemo(() => (active?.elements || []).some((e) => e.anim && e.anim.type !== "none"), [active]);
  const tall = active ? active.height / active.width > 1.6 : false;

  const fitScale = active ? Math.min(box.w / active.width, box.h / active.height) : 1;
  const effectiveScale = zoom === "fit" ? fitScale : zoom;
  // Zoom from the keyboard and the wheel starts at the fitted size; their handlers live longer than one render
  const fitScaleRef = useRef(1);
  fitScaleRef.current = fitScale;
  const canvasBox = active ? { w: active.width * effectiveScale, h: active.height * effectiveScale } : { w: 0, h: 0 };

  const updateSlide = useCallback((idx: number, patch: Partial<Slide>) => {
    setSlides((s) => s.map((sl, i) => (i === idx ? { ...sl, ...patch } : sl)));
  }, [setSlides]);

  const changeElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    history.setTransient((s) => s.map((sl, i) =>
      i === activeIdx ? { ...sl, elements: sl.elements.map((e) => (e.id === id ? { ...e, ...patch } as CanvasElement : e)) } : sl,
    ));
  }, [activeIdx, history]);

  // One history entry per change, not per pixel: everything until the pointer or key is released
  useEffect(() => {
    const onUp = () => history.commit();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keyup", onUp);
    };
  }, [history]);

  const selectIds = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    if (ids.length) setRightTab("design");
  }, []);

  /** Elements of the active slide through one function; `transient` while a pointer or slider is held */
  const mapElements = useCallback((fn: (els: CanvasElement[]) => CanvasElement[], transient = false) => {
    (transient ? history.setTransient : setSlides)((s) => s.map((sl, i) => (i === activeIdx ? { ...sl, elements: fn(sl.elements) } : sl)));
  }, [activeIdx, history, setSlides]);

  const applyPatches = useCallback((patches: Patches, transient = false) => {
    if (!Object.keys(patches).length) return;
    mapElements((els) => els.map((e) => (patches[e.id] ? ({ ...e, ...patches[e.id] } as CanvasElement) : e)), transient);
  }, [mapElements]);
  const changeMany = useCallback((patches: Patches) => applyPatches(patches, true), [applyPatches]);

  const addElements = useCallback((els: CanvasElement[]) => {
    mapElements((cur) => [...cur, ...els]);
    selectIds(els.map((e) => e.id));
    setSheet(null);
  }, [mapElements, selectIds]);
  const addElement = useCallback((el: CanvasElement) => addElements([el]), [addElements]);

  const patchElement = useCallback((id: string, patch: Partial<CanvasElement>) => applyPatches({ [id]: patch }), [applyPatches]);

  const deleteElement = useCallback(() => {
    if (!selectedIds.length) return;
    mapElements((els) => els.filter((e) => !selectedIds.includes(e.id)));
    setSelectedIds([]);
  }, [selectedIds, mapElements]);

  const duplicateElement = useCallback(() => {
    if (selectedEls.length) addElements(cloneElements(selectedEls, 24, 24));
  }, [selectedEls, addElements]);

  const copySelection = useCallback(() => {
    if (selectedEls.length) clipboard.current = { els: selectedEls.map((e) => ({ ...e })), slideId: active.id, pastes: 0 };
  }, [selectedEls, active]);

  /** On the slide it came from each paste lands a bit further down and right; on another slide in place first */
  const paste = useCallback(() => {
    const c = clipboard.current;
    if (!c) return;
    c.pastes += 1;
    const offset = 24 * (c.slideId === active.id ? c.pastes : c.pastes - 1);
    addElements(cloneElements(c.els, offset, offset));
  }, [active, addElements]);

  const nudge = useCallback((dx: number, dy: number) => {
    const movable = selectedEls.filter((e) => !e.locked);
    changeMany(Object.fromEntries(movable.map((e) => [e.id, { x: e.x + dx, y: e.y + dy }])));
  }, [selectedEls, changeMany]);

  /** To the very front/back, or one step; several selected keep their order among each other */
  const layerElements = useCallback((ids: string[], dir: "front" | "back" | 1 | -1) => {
    if (ids.length) mapElements((els) => restack(els, ids, dir));
  }, [mapElements]);

  const alignElements = (a: CanvasAlign) => applyPatches(alignUnits(selectedEls, a, { w: active.width, h: active.height }));
  const distributeElements = (axis: "h" | "v") => applyPatches(distributeUnits(selectedEls, axis));

  const groupSelection = useCallback(() => {
    if (!selectionInfo(selectedEls).canGroup) return;
    const groupId = `g_${uid()}`;
    applyPatches(Object.fromEntries(selectedEls.map((e) => [e.id, { groupId }])));
  }, [selectedEls, applyPatches]);

  const ungroupSelection = useCallback(() => {
    if (!selectedEls.some((e) => e.groupId)) return;
    applyPatches(Object.fromEntries(selectedEls.map((e) => [e.id, { groupId: undefined }])));
  }, [selectedEls, applyPatches]);

  const toggleLock = () => {
    const locked = !selectedEls.every((e) => e.locked);
    applyPatches(Object.fromEntries(selectedEls.map((e) => [e.id, { locked }])));
  };

  const selectAll = useCallback(() => selectIds(active.elements.filter((e) => !e.hidden && !e.locked).map((e) => e.id)), [active, selectIds]);

  const copyStyle = useCallback(() => {
    if (!selectedEl) return;
    styleClipboard.current = { ...selectedEl };
    toast(t("socialCreator.selection.styleCopied"));
  }, [selectedEl, t]);
  const pasteStyle = useCallback(() => {
    if (styleClipboard.current && selectedEls.length) applyPatches(stylePatches(styleClipboard.current, selectedEls));
  }, [selectedEls, applyPatches]);

  const selectionActions: SelectionActions = {
    onAlign: alignElements,
    onDistribute: distributeElements,
    onGroup: groupSelection,
    onUngroup: ungroupSelection,
    onLayer: (dir) => layerElements(selectedIds, dir),
    onDuplicate: duplicateElement,
    onToggleLock: toggleLock,
    onDelete: deleteElement,
  };

  /** Drag on the empty workspace: a frame that selects what it touches; a plain click clears the selection */
  const startMarquee = (e: React.PointerEvent) => {
    if (playing || exporting || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-element-id], [role=toolbar], button, input, [data-testid=selection-box]")) return;
    const surface = refs.current.get(active.id);
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const base = additive ? selectedIds : [];
    if (!surface || e.pointerType === "touch") {
      if (!additive) setSelectedIds([]);
      return;
    }
    const toSlide = (cx: number, cy: number) => {
      const r = surface.getBoundingClientRect();
      const k = r.width / active.width;
      return { x: (cx - r.left) / k, y: (cy - r.top) / k };
    };
    const a = toSlide(e.clientX, e.clientY);
    const px = e.clientX;
    const py = e.clientY;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - px, ev.clientY - py) < 4) return;
      moved = true;
      const b = toSlide(ev.clientX, ev.clientY);
      const rect = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
      setMarquee(rect);
      const hit = idsInRect(active.elements, rect);
      setSelectedIds([...base, ...hit.filter((id) => !base.includes(id))]);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setMarquee(null);
      if (!moved) setSelectedIds(base);
      else setRightTab("design");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const changeFormat = (formatId: string) => {
    const f = getFormat(formatId);
    updateSlide(activeIdx, { formatId, width: f.width, height: f.height });
  };

  const applyTemplate = (templateId: string) => {
    const fresh = newSlide(active.formatId, active.width, active.height, templateId);
    updateSlide(activeIdx, { background: fresh.background, elements: fresh.elements });
    setSelectedIds([]);
    setSheet(null);
    toast(t("socialCreator.templates.applied"), { action: { label: t("socialCreator.undo"), onClick: () => history.undo() } });
  };

  const insertSlide = useCallback((slide: Slide) => {
    setSlides((s) => [...s.slice(0, activeIdx + 1), slide, ...s.slice(activeIdx + 1)]);
    setActiveIdx(activeIdx + 1);
    setSelectedIds([]);
    setSheet(null);
  }, [activeIdx, setSlides]);

  const addSlide = () => insertSlide(newSlide(active.formatId, active.width, active.height, "blank"));
  const addTemplateSlide = (templateId: string) => insertSlide(newSlide(active.formatId, active.width, active.height, templateId));

  const duplicateSlide = () => insertSlide({ ...active, id: uid(), elements: active.elements.map((e) => ({ ...e, id: uid() })) });

  const deleteSlide = () => {
    if (slides.length === 1) return;
    setSlides((s) => s.filter((_, i) => i !== activeIdx));
    setActiveIdx((i) => Math.max(0, i - 1));
    setSelectedIds([]);
  };

  const moveSlide = (dir: -1 | 1) => {
    const target = activeIdx + dir;
    if (target < 0 || target >= slides.length) return;
    setSlides((s) => {
      const arr = [...s];
      [arr[activeIdx], arr[target]] = [arr[target], arr[activeIdx]];
      return arr;
    });
    setActiveIdx(target);
  };

  const newProject = () => {
    if (!window.confirm(t("socialCreator.project.newConfirm"))) return;
    history.reset([newSlide(active.formatId, active.width, active.height, "blank")]);
    setActiveIdx(0);
    setSelectedIds([]);
    setName("");
  };

  // ?article=<id> from the Post-Generator: that article becomes a new slide, with the AI's summary below the headline
  const articleParam = params.get("article");
  useEffect(() => {
    if (!restored || !articleParam) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("articles").select("title, category, cover_image_url, excerpt, user_id, article_type, language").eq("id", articleParam).maybeSingle();
      if (cancelled) return;
      if (data) {
        const max = summaryLength(active.formatId);
        const loading = toast.loading(t("socialCreator.media.summarizing"));
        let summary = "";
        try {
          summary = await summarizeArticle(articleParam, max);
        } catch {
          summary = data.excerpt ? clipText(data.excerpt, max) : "";
          toast.error(t("socialCreator.media.summaryFailed"), { description: data.excerpt ? t("socialCreator.media.summaryFallback") : undefined });
        } finally {
          toast.dismiss(loading);
        }
        if (cancelled) return;
        const writer = data.user_id ? (await loadAuthors([data.user_id]))[data.user_id] : undefined;
        const author = writer ? { userId: writer.user_id, name: writer.name, avatar: writer.avatar_url } : null;
        insertSlide(slideFromArticle({ title: data.title, category: data.category, cover: data.cover_image_url, summary, author, type: data.article_type, language: data.language }, active.formatId));
        toast.success(t("socialCreator.media.slideAdded"));
      }
      const next = new URLSearchParams(params);
      next.delete("article");
      setParams(next, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [restored, articleParam]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- export ---------- */
  const baseName = slug(name || "criticore");
  const exportCurrent = useCallback(async () => {
    const node = refs.current.get(active.id);
    if (!node) return;
    setSelectedIds([]);
    setExporting(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await exportNodeAsPng(node, `${baseName}-${active.formatId}-${activeIdx + 1}.png`);
      toast.success(t("socialCreator.pngDone", "PNG exportiert"));
    } catch (e) { toast.error(t("socialCreator.exportFailed", "Export fehlgeschlagen")); console.error(e); }
    finally { setExporting(false); }
  }, [active, activeIdx, t, baseName]);

  const exportAll = async () => {
    setSelectedIds([]);
    setExporting(true);
    try {
      const nodes = slides.map((sl, i) => ({ node: refs.current.get(sl.id)!, name: `${baseName}-${sl.formatId}-${i + 1}.png` })).filter((n) => n.node);
      await exportPackAsZip(nodes, `${baseName}.zip`);
      toast.success(t("socialCreator.zipDone", "{{count}} Grafiken als ZIP exportiert", { count: nodes.length }));
    } catch (e) { toast.error(t("socialCreator.exportFailed", "Export fehlgeschlagen")); console.error(e); }
    finally { setExporting(false); }
  };

  const stopPreview = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setPreviewTime(null);
  }, []);

  const playPreview = useCallback(() => {
    if (playing) { stopPreview(); return; }
    setSelectedIds([]);
    setPlaying(true);
    const startedAt = performance.now();
    const tick = (now: number) => {
      const time = now - startedAt;
      if (time >= duration) { setPreviewTime(null); setPlaying(false); return; }
      setPreviewTime(time);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [playing, stopPreview, duration]);

  const waitPaint = () => new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));

  const setExportTime = useCallback(async (time: number | null) => {
    setPreviewTime(time);
    await waitPaint();
  }, []);

  const exportVideo = async (alpha: boolean) => {
    const node = refs.current.get(active.id);
    if (!node) return;
    stopPreview();
    setSelectedIds([]);
    if (alpha) setTransparentExport(true);
    setExporting(true);
    await waitPaint();
    const tid = toast.loading(t("socialCreator.videoRendering", "Video wird gerendert…"));
    const opts = {
      node,
      width: active.width,
      height: active.height,
      durationMs: duration,
      baseName: `${baseName}-${active.formatId}-${activeIdx + 1}${alpha ? "-alpha" : ""}`,
      setTime: setExportTime,
      onProgress: (phase: string, r: number) =>
        toast.loading(
          `${phase === "render" ? t("socialCreator.phaseRender", "Frames rendern") : alpha ? t("socialCreator.phaseEncode", "ProRes 4444 encodieren") : t("socialCreator.phaseCapture", "Video aufnehmen")} ${Math.round(r * 100)}%`,
          { id: tid },
        ),
    };
    try {
      if (alpha) await exportSlideAsTransparentVideo(opts);
      else await exportSlideAsVideo(opts);
      toast.success(alpha ? t("socialCreator.videoDoneAlpha", "Transparentes Video exportiert (MKV · ProRes 4444)") : t("socialCreator.videoDone", "Video exportiert"), { id: tid });
    } catch (e) {
      toast.error(t("socialCreator.videoFailed", "Video-Export fehlgeschlagen"), { id: tid });
      console.error(e);
    } finally {
      setExporting(false);
      setTransparentExport(false);
      setPreviewTime(null);
    }
  };

  useEffect(() => { stopPreview(); setEditingId(null); }, [activeIdx, stopPreview]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  /* ---------- keyboard shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      const mod = e.metaKey || e.ctrlKey;
      // With Alt, macOS turns letters into other characters; the physical key decides then
      const key = e.altKey && e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();

      if (mod && key === "z") { e.preventDefault(); if (e.shiftKey) history.redo(); else history.undo(); return; }
      if (mod && key === "y") { e.preventDefault(); history.redo(); return; }
      if (mod && key === "d") { e.preventDefault(); duplicateElement(); return; }
      if (mod && key === "s") { e.preventDefault(); void exportCurrent(); return; }
      if (mod && key === "a") { e.preventDefault(); selectAll(); return; }
      if (mod && key === "g") { e.preventDefault(); if (e.shiftKey) ungroupSelection(); else groupSelection(); return; }
      if (mod && e.altKey && key === "c") { e.preventDefault(); copyStyle(); return; }
      if (mod && e.altKey && key === "v") { e.preventDefault(); pasteStyle(); return; }
      if (mod && key === "c") { copySelection(); return; }
      if (mod && key === "x" && selectedIds.length) { e.preventDefault(); copySelection(); deleteElement(); return; }
      if (mod && key === "v" && clipboard.current) { e.preventDefault(); paste(); return; }
      if (mod && (e.key === "+" || e.key === "=")) { e.preventDefault(); setZoom((z) => Math.min(3, (z === "fit" ? fitScaleRef.current : z) * 1.2)); return; }
      if (mod && e.key === "-") { e.preventDefault(); setZoom((z) => Math.max(0.05, (z === "fit" ? fitScaleRef.current : z) / 1.2)); return; }
      if (mod && e.key === "0") { e.preventDefault(); setZoom("fit"); return; }
      if (mod && (e.key === "]" || e.key === "[")) { e.preventDefault(); layerElements(selectedIds, e.key === "]" ? (e.shiftKey ? "front" : 1) : (e.shiftKey ? "back" : -1)); return; }
      if (e.key === "Enter" && selectedEl?.type === "text" && !selectedEl.locked) { e.preventDefault(); setEditingId(selectedEl.id); return; }
      if (e.key === "Delete" || e.key === "Backspace") { if (selectedIds.length) { e.preventDefault(); deleteElement(); } return; }
      if (e.key === "Escape") { setSelectedIds([]); stopPreview(); return; }
      if (e.key === " ") { e.preventDefault(); playPreview(); return; }
      if (e.key.startsWith("Arrow") && selectedEls.length) {
        const step = e.shiftKey ? 20 : 2;
        e.preventDefault();
        if (e.key === "ArrowLeft") nudge(-step, 0);
        if (e.key === "ArrowRight") nudge(step, 0);
        if (e.key === "ArrowUp") nudge(0, -step);
        if (e.key === "ArrowDown") nudge(0, step);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history, duplicateElement, deleteElement, exportCurrent, nudge, playPreview, stopPreview, selectedEl, selectedEls, selectedIds, layerElements, selectAll, groupSelection, ungroupSelection, copyStyle, pasteStyle, copySelection, paste]);

  // Ctrl or Cmd with the wheel (and pinching on a trackpad) zooms, like in Canva
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.05, (z === "fit" ? fitScaleRef.current : z) * Math.exp(-e.deltaY * 0.002))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [allowed]);

  if (authLoading || checking) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!allowed) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-xl font-bold">{t("socialCreator.noAccessTitle", "Kein Zugriff")}</h1>
          <p className="text-sm text-muted-foreground">{t("socialCreator.noAccessBody", "Der Social Pack Creator ist nur für Presse-Mitglieder und Admins verfügbar.")}</p>
          <Button variant="outline" onClick={() => navigate("/")}>{t("common.backHome", "Zur Startseite")}</Button>
        </div>
      </div>
    );
  }

  const setBackground = (src: string) => {
    updateSlide(activeIdx, { background: { ...active.background, type: "image", image: src } });
    setSheet(null);
  };

  const toolPanel = (id: Tool): ReactNode => {
    switch (id) {
      case "templates": return <TemplatesPanel slide={active} onApply={applyTemplate} onAddSlide={addTemplateSlide} />;
      case "text": return <TextPanel slide={active} onAdd={addElement} />;
      case "media": return <MediaPanel slide={active} onAdd={addElement} onAddMany={addElements} onSetBackground={setBackground} onAddSlide={insertSlide} />;
      case "uploads": return <UploadsLibrary slide={active} onAdd={addElement} onSetBackground={setBackground} />;
      case "brand": return <BrandPanel slide={active} onAdd={addElement} />;
      case "elements": return <ElementsPanel slide={active} onAdd={addElement} />;
    }
  };

  const inspector = selectedEls.length > 1 ? (
    <MultiPanel elements={selectedEls} onOpacity={(opacity) => changeMany(Object.fromEntries(selectedEls.map((e) => [e.id, { opacity }])))} {...selectionActions} />
  ) : (
    <Inspector
      element={selectedEl}
      slide={active}
      onChange={(patch) => selectedEl && changeElement(selectedEl.id, patch)}
      onBackgroundChange={(patch) => updateSlide(activeIdx, { background: { ...active.background, ...patch } })}
      onFormatChange={changeFormat}
      onDelete={deleteElement}
      onDuplicate={duplicateElement}
    />
  );

  const layers = <LayersPanel slide={active} selectedIds={selectedIds} onSelect={(id, additive) => selectIds(additive ? toggleIds(selectedIds, [id]) : [id])} onPatch={patchElement} onMove={(id, dir) => layerElements([id], dir)} />;

  const rightTabs = (
    <div role="tablist" aria-label={t("socialCreator.panels.right")} className="m-2 grid grid-cols-2 gap-1 rounded-[10px] bg-secondary/60 p-1">
      {([["design", SlidersHorizontal], ["layers", Layers]] as const).map(([id, Icon]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={rightTab === id}
          onClick={() => setRightTab(id)}
          className={cn("flex items-center justify-center gap-1.5 rounded-[7px] py-1.5 text-xs font-medium transition-colors", rightTab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {t(`socialCreator.panels.${id}`)}
          {id === "layers" && <span className="tabular-nums text-muted-foreground">{active.elements.length}</span>}
        </button>
      ))}
    </div>
  );

  const filmstrip = (vertical?: boolean) => (
    <Filmstrip
      slides={slides}
      activeIdx={activeIdx}
      onSelect={(i) => { setActiveIdx(i); setSelectedIds([]); setSheet(null); }}
      onAdd={addSlide}
      onDuplicate={duplicateSlide}
      onDelete={deleteSlide}
      onMove={moveSlide}
      vertical={vertical}
    />
  );

  const info = selectionInfo(selectedEls);
  const contextMenu = (
    <ContextMenuContent className="w-60">
      {selectedEls.length > 0 ? (
        <>
          <ContextMenuItem onSelect={copySelection}>{t("socialCreator.menu.copy")}<ContextMenuShortcut>{MOD}C</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem onSelect={() => { copySelection(); deleteElement(); }}>{t("socialCreator.menu.cut")}<ContextMenuShortcut>{MOD}X</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem onSelect={paste} disabled={!clipboard.current}>{t("socialCreator.menu.paste")}<ContextMenuShortcut>{MOD}V</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem onSelect={duplicateElement}>{t("socialCreator.actions.duplicate")}<ContextMenuShortcut>{MOD}D</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem onSelect={deleteElement} className="text-destructive focus:text-destructive">{t("socialCreator.actions.delete")}<ContextMenuShortcut>Entf</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={copyStyle} disabled={!selectedEl}>{t("socialCreator.menu.copyStyle")}<ContextMenuShortcut>{MOD}⌥C</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem onSelect={pasteStyle} disabled={!styleClipboard.current}>{t("socialCreator.menu.pasteStyle")}<ContextMenuShortcut>{MOD}⌥V</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuSeparator />
          {info.canGroup && <ContextMenuItem onSelect={groupSelection}>{t("socialCreator.selection.group")}<ContextMenuShortcut>{MOD}G</ContextMenuShortcut></ContextMenuItem>}
          {info.canUngroup && <ContextMenuItem onSelect={ungroupSelection}>{t("socialCreator.selection.ungroup")}<ContextMenuShortcut>{MOD}⇧G</ContextMenuShortcut></ContextMenuItem>}
          <ContextMenuSub>
            <ContextMenuSubTrigger>{t("socialCreator.menu.layer")}</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-52">
              <ContextMenuItem onSelect={() => layerElements(selectedIds, 1)}>{t("socialCreator.menu.forward")}<ContextMenuShortcut>{MOD}]</ContextMenuShortcut></ContextMenuItem>
              <ContextMenuItem onSelect={() => layerElements(selectedIds, "front")}>{t("socialCreator.actions.toFront")}<ContextMenuShortcut>{MOD}⇧]</ContextMenuShortcut></ContextMenuItem>
              <ContextMenuItem onSelect={() => layerElements(selectedIds, -1)}>{t("socialCreator.menu.backward")}<ContextMenuShortcut>{MOD}[</ContextMenuShortcut></ContextMenuItem>
              <ContextMenuItem onSelect={() => layerElements(selectedIds, "back")}>{t("socialCreator.actions.toBack")}<ContextMenuShortcut>{MOD}⇧[</ContextMenuShortcut></ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onSelect={toggleLock}>{t(info.locked ? "socialCreator.actions.unlock" : "socialCreator.actions.lock")}</ContextMenuItem>
        </>
      ) : (
        <>
          <ContextMenuItem onSelect={paste} disabled={!clipboard.current}>{t("socialCreator.menu.paste")}<ContextMenuShortcut>{MOD}V</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem onSelect={selectAll} disabled={!active.elements.length}>{t("socialCreator.menu.selectAll")}<ContextMenuShortcut>{MOD}A</ContextMenuShortcut></ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );

  const zoomBy = (d: number) => setZoom(Math.min(3, Math.max(0.05, (zoom === "fit" ? fitScale : zoom) + d)));

  return (
    <div className="grid h-[100dvh] w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-background lg:grid-rows-[auto_minmax(0,1fr)]">
      {/* Top bar */}
      <header className="flex h-14 items-center gap-2 border-b border-border/60 bg-card px-2 sm:px-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/dashboard/social")} aria-label={t("common.back", "Zurück")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 sm:flex-none">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("socialCreator.project.untitled")}
            aria-label={t("socialCreator.project.name")}
            className="h-8 w-full min-w-0 border-transparent bg-transparent px-2 text-sm font-semibold hover:border-border focus-visible:border-border sm:w-56"
          />
        </div>
        <span className="hidden whitespace-nowrap text-xs text-muted-foreground xl:inline">
          {getFormat(active.formatId).label} {active.width}×{active.height}, {t("socialCreator.slideCount", { count: slides.length })}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={history.undo} disabled={!history.canUndo} aria-label={t("socialCreator.undo", "Rückgängig")} title={t("socialCreator.undo", "Rückgängig")}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={history.redo} disabled={!history.canRedo} aria-label={t("socialCreator.redo", "Wiederherstellen")} title={t("socialCreator.redo", "Wiederherstellen")}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <span className="mx-1 hidden h-6 w-px bg-border/70 sm:block" aria-hidden="true" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label={t("socialCreator.shortcuts.title")} title={t("socialCreator.shortcuts.title")}>
                <Keyboard className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <p className="mb-2 text-sm font-semibold">{t("socialCreator.shortcuts.title")}</p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
                {SHORTCUTS.map(([keys, id]) => (
                  <div key={id} className="contents">
                    <dt><kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-sans text-[11px]">{keys}</kbd></dt>
                    <dd className="text-muted-foreground">{t(`socialCreator.shortcuts.${id}`)}</dd>
                  </div>
                ))}
              </dl>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("socialCreator.project.menu")} title={t("socialCreator.project.menu")}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={newProject}><FilePlus2 className="mr-2 h-4 w-4" />{t("socialCreator.project.new")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSafeZones((v) => !v)} disabled={!tall}><ScanLine className="mr-2 h-4 w-4" />{t(safeZones ? "socialCreator.view.hideSafe" : "socialCreator.view.showSafe")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={playPreview} disabled={exporting || !hasAnimations} className="gap-1.5" aria-label={playing ? t("socialCreator.stop", "Stop") : t("socialCreator.preview", "Vorschau")}>
            {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="hidden xl:inline">{playing ? t("socialCreator.stop", "Stop") : t("socialCreator.preview", "Vorschau")}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* Named also on phones, where the word is hidden and only the icon shows */}
              <Button size="sm" className="ml-1 gap-1.5" disabled={exporting} aria-label={t("socialCreator.export", "Export")}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                <span className="hidden md:inline">{t("socialCreator.export", "Export")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs">{t("socialCreator.export", "Export")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={exportCurrent}><ImageDown className="mr-2 h-4 w-4" />{t("socialCreator.exportPng", "Aktueller Slide als PNG")}</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAll}><Package className="mr-2 h-4 w-4" />{t("socialCreator.exportZip", "Ganzes Pack (ZIP)")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportVideo(false)} disabled={!hasAnimations}><Film className="mr-2 h-4 w-4" />{t("socialCreator.exportVideo", "Slide als Video")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportVideo(true)} disabled={!hasAnimations}><FileVideo className="mr-2 h-4 w-4" />{t("socialCreator.exportVideoAlpha", "Transparentes Video (MKV · ProRes 4444)")}</DropdownMenuItem>
              {!hasAnimations && <p className="px-2 pb-1.5 pt-1 text-[11px] text-muted-foreground">{t("socialCreator.videoNeedsAnim")}</p>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex min-h-0">
        {/* Tool rail (desktop) */}
        <nav aria-label={t("socialCreator.panels.tools")} className="hidden w-[4.5rem] shrink-0 flex-col items-stretch gap-1 border-r border-border/60 bg-card px-1.5 py-2 lg:flex">
          {TOOLS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool((cur) => (cur === id ? null : id))}
              aria-pressed={tool === id}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[10px] py-2 text-[10.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tool === id ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {t(`socialCreator.panels.${id}`)}
            </button>
          ))}
        </nav>

        {/* Tool panel (desktop) */}
        {tool && (
          <aside aria-label={t(`socialCreator.panels.${tool}`)} className="hidden w-[18.5rem] shrink-0 flex-col border-r border-border/60 bg-card lg:flex">
            <div className="flex h-12 items-center justify-between border-b border-border/60 pl-4 pr-2">
              <h2 className="font-display text-base font-bold text-foreground">{t(`socialCreator.panels.${tool}`)}</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTool(null)} aria-label={t("socialCreator.panels.close")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4">{toolPanel(tool)}</div>
            </div>
          </aside>
        )}

        {/* Canvas */}
        <main className="flex min-w-0 flex-1 flex-col">
          <ContextMenu>
          <ContextMenuTrigger asChild disabled={playing || exporting}>
          <div
            ref={viewportRef}
            onPointerDown={startMarquee}
            data-testid="creator-viewport"
            className="relative grid min-h-0 flex-1 select-none place-items-center overflow-auto bg-secondary/30 bg-[radial-gradient(hsl(var(--border)/0.55)_1px,transparent_1px)] [background-size:22px_22px]"
          >
            {selectedEls.length > 0 && !playing && !exporting && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
                <div className="pointer-events-auto max-w-full">
                  <SelectionBar elements={selectedEls} {...selectionActions} />
                </div>
              </div>
            )}
            <div style={{ width: canvasBox.w, height: canvasBox.h }} className="my-10 rounded-[4px] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)]" data-testid="creator-canvas">
              <SocialCanvas
                slide={active}
                maxWidth={canvasBox.w}
                maxHeight={canvasBox.h}
                interactive={!playing && !exporting}
                selectedIds={selectedIds}
                onSelectIds={selectIds}
                onChange={changeElement}
                onChangeMany={changeMany}
                marquee={marquee}
                registerRef={(node) => { if (node) refs.current.set(active.id, node); }}
                time={previewTime}
                transparent={transparentExport}
                editingId={editingId}
                onEditingChange={(id) => { setEditingId(id); if (!id) history.commit(); }}
                showSafeZones={safeZones}
              />
            </div>
          </div>
          </ContextMenuTrigger>
          {contextMenu}
          </ContextMenu>

          {/* Zoom and timeline */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-t border-border/60 bg-card px-2 sm:px-3">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomBy(-0.1)} aria-label={t("socialCreator.zoomOut", "Verkleinern")}><ZoomOut className="h-4 w-4" /></Button>
              <span className="w-11 text-center text-[11px] tabular-nums text-muted-foreground">{Math.round(effectiveScale * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomBy(0.1)} aria-label={t("socialCreator.zoomIn", "Vergrößern")}><ZoomIn className="h-4 w-4" /></Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={zoom === "fit" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setZoom("fit")} aria-label={t("socialCreator.fit", "Einpassen")}><Maximize2 className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>{t("socialCreator.fit", "Einpassen")}</TooltipContent>
              </Tooltip>
            </div>
            {hasAnimations ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={16}
                  value={previewTime ?? duration}
                  onChange={(e) => { stopPreview(); setPreviewTime(Number(e.target.value)); }}
                  className="h-1.5 flex-1 accent-primary"
                  aria-label={t("socialCreator.timeline", "Zeitleiste")}
                />
                <span className="w-20 text-right text-[11px] tabular-nums text-muted-foreground">
                  {((previewTime ?? duration) / 1000).toFixed(1)} / {(duration / 1000).toFixed(1)} s
                </span>
              </div>
            ) : (
              <p className="hidden min-w-0 flex-1 truncate text-[11px] text-muted-foreground sm:block">{t("socialCreator.animHint", "Animationen unter Eigenschaften hinzufügen, um die Zeitleiste zu nutzen.")}</p>
            )}
            {tall && (
              <Button variant={safeZones ? "secondary" : "ghost"} size="sm" className="ml-auto h-8 gap-1.5 text-xs" onClick={() => setSafeZones((v) => !v)} aria-pressed={safeZones}>
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("socialCreator.view.safeZones")}</span>
              </Button>
            )}
          </div>

          {/* Slides (desktop) */}
          <div className="hidden shrink-0 border-t border-border/60 bg-card px-3 py-2 lg:block">{filmstrip()}</div>
        </main>

        {/* Design and layers (desktop) */}
        <aside aria-label={t("socialCreator.panels.right")} className="hidden w-[19rem] shrink-0 flex-col border-l border-border/60 bg-card lg:flex">
          {rightTabs}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{rightTab === "design" ? inspector : layers}</div>
        </aside>
      </div>

      {/* Phones and tablets: tools within thumb reach */}
      <nav aria-label={t("socialCreator.panels.tools")} className="flex items-stretch gap-0.5 overflow-x-auto border-t border-border/60 bg-card px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TOOLS.map(({ id, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { setTool(id); setSheet("tool"); }} className="flex min-w-[3.75rem] flex-col items-center gap-0.5 px-1 py-2 text-[10.5px] font-medium text-muted-foreground">
            <Icon className="h-5 w-5" aria-hidden="true" />
            {t(`socialCreator.panels.${id}`)}
          </button>
        ))}
        <span className="my-2 w-px shrink-0 bg-border" aria-hidden="true" />
        <button type="button" onClick={() => setSheet("design")} className={cn("flex min-w-[3.75rem] flex-col items-center gap-0.5 px-1 py-2 text-[10.5px] font-medium", selectedEls.length ? "text-primary" : "text-muted-foreground")}>
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          {t("socialCreator.panels.design")}
        </button>
        <button type="button" onClick={() => setSheet("slides")} className="flex min-w-[3.75rem] flex-col items-center gap-0.5 px-1 py-2 text-[10.5px] font-medium text-muted-foreground">
          <GalleryHorizontal className="h-5 w-5" aria-hidden="true" />
          {t("socialCreator.slides", "Slides")}
        </button>
      </nav>

      <Sheet open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
        <SheetContent side="bottom" className="flex max-h-[78dvh] flex-col gap-0 rounded-t-[16px] p-0">
          <SheetTitle className="border-b border-border/60 px-4 py-3 font-display text-base">
            {sheet === "tool" && tool ? t(`socialCreator.panels.${tool}`) : sheet === "slides" ? t("socialCreator.slides", "Slides") : t("socialCreator.panels.design")}
          </SheetTitle>
          <SheetDescription className="sr-only">{t("socialCreator.panels.sheet")}</SheetDescription>
          {sheet === "design" && rightTabs}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {sheet === "tool" && tool && <div className="p-4">{toolPanel(tool)}</div>}
            {sheet === "design" && (rightTab === "design" ? inspector : layers)}
            {sheet === "slides" && <div className="p-4">{filmstrip(true)}</div>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
