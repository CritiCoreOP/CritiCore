import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "@/lib/locale-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/edge-function-error";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { ArticleNote } from "@/components/article-editor/ArticleNote";
import { SpellErrors } from "@/components/article-editor/SpellErrors";
import { AiTarget } from "@/components/article-editor/AiTarget";
import { YouTubeVideo } from "@/components/article-editor/YouTubeVideo";
import { ArticleImage, ImageRow } from "@/components/article-editor/ArticleImage";
import { ReadabilityMarks } from "@/components/article-editor/ReadabilityMarks";
import TemplatePicker from "@/components/article-editor/TemplatePicker";

import EditorToolbar from "@/components/article-editor/EditorToolbar";
import ArticleSettings from "@/components/article-editor/ArticleSettings";
import CoverImageUpload from "@/components/article-editor/CoverImageUpload";
import ArticlePreview from "@/components/article-editor/ArticlePreview";
import MediaGallery from "@/components/article-editor/MediaGallery";
import CollabPanel from "@/components/article-editor/CollabPanel";
import CommentsPanel from "@/components/article-editor/CommentsPanel";
import ArticleBriefingsPanel from "@/components/article-editor/ArticleBriefingsPanel";
import CommentMark from "@/components/article-editor/CommentMark";
import QualityBadge, { type QualityAnalysis } from "@/components/article-editor/QualityBadge";
import { findTextRange } from "@/components/article-editor/textRange";
import AssistantSidebar from "@/components/article-editor/AssistantSidebar";
import EditorOutline from "@/components/article-editor/EditorOutline";
import { imageFileError, uploadArticleImage } from "@/components/article-editor/utils";
import { AUTOSAVE_KEY, AUTOSAVE_INTERVAL, EMPTY_COVER_CREDIT, coverCreditColumns, slugify } from "@/components/article-editor/types";
import type { CoverCredit, DraftData } from "@/components/article-editor/types";
import type { ArticleStatus } from "@/lib/articleStatus";
import { isLiveStatus } from "@/lib/liveBlog";
import { ArrowLeft as ArrowBackTwoTone, CheckCircle2 as CloudDoneTwoTone, CloudOff, EyeOff, Upload as PublishTwoTone, Save as SaveTwoTone } from "lucide-react";
import { changeArticleAuthor, type TeamMember } from "@/lib/articleAuthor";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
/** Search results cut titles off at roughly this length */
const TITLE_SEO_LENGTH = 70;
const imageFiles = (data: DataTransfer | null) => Array.from(data?.files ?? []).filter((file) => file.type.startsWith("image/"));

type SaveMode = "draft" | "publish" | "unpublish";

/** Workflow status after saving a draft: a real text is no idea any more, later steps stay as they are */
const draftStatus = (current: ArticleStatus, words: number): ArticleStatus =>
  current === "published" ? "writing" : current === "idea" && words >= 50 ? "writing" : current;

const WriteArticlePage = () => {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  // Correction note under published articles; only sent once the loaded row has the column
  const [correctionNote, setCorrectionNote] = useState("");
  const [correctionColumn, setCorrectionColumn] = useState(false);
  // Live blog: none, running or ended; the column only goes into the payload once the row has it
  const [liveStatus, setLiveStatus] = useState<"live" | "ended" | null>(null);
  const [liveColumn, setLiveColumn] = useState(false);
  const [category, setCategory] = useState("general");
  const [articleType, setArticleType] = useState("news");
  const [submitting, setSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverCredit, setCoverCredit] = useState<CoverCredit>(EMPTY_COVER_CREDIT);
  // Whether the loaded article had the credit columns, i.e. the migration is applied
  const [creditColumns, setCreditColumns] = useState(false);
  const [tgnPlus, setTgnPlus] = useState(false);
  const [language, setLanguage] = useState("de");
  const [translationGroup, setTranslationGroup] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [articleId, setArticleId] = useState<string | null>(editId);
  const [isPublished, setIsPublished] = useState(false);
  // Column on the board and in the dashboard pipeline; the database keeps "published" in line itself
  const [workflowStatus, setWorkflowStatus] = useState<ArticleStatus>("idea");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [qualityAnalysis, setQualityAnalysis] = useState<QualityAnalysis | null>(null);
  // Text the analysis looked at; a different editor text means the verdict may be out of date
  const [analyzedText, setAnalyzedText] = useState<string | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [hasSavedOnce, setHasSavedOnce] = useState(!!editId);
  const [canPublish, setCanPublish] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState<null | "clear" | "unpublish">(null);
  // Serialized state of the last successful save; compared against the current state for "unsaved"
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [focusedField, setFocusedField] = useState<"title" | "excerpt" | null>(null);
  // Set below once the editor exists; the editor props are created once and read it through the ref
  const insertImagesRef = useRef<(files: File[], pos?: number) => void>(() => {});
  const savingRef = useRef(false);
  const autosaveErrorShown = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const excerptRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      ArticleImage,
      ImageRow,
      Placeholder.configure({
        placeholder: t("article.contentPlaceholder"),
      }),
      CommentMark,
      TableKit.configure({ table: { resizable: false } }),
      ArticleNote,
      SpellErrors,
      AiTarget,
      YouTubeVideo,
      ReadabilityMarks,
    ],
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[400px] outline-none focus:outline-none text-foreground leading-relaxed text-[17px]",
        "aria-label": t("article.contentPlaceholder"),
      },
      // Pasted or dropped image files are uploaded and inserted; before, only the toolbar button worked
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        insertImagesRef.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFiles(event.dataTransfer);
        if (!files.length) return false;
        event.preventDefault();
        insertImagesRef.current(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
        return true;
      },
    },
  });

  insertImagesRef.current = async (files, pos) => {
    if (!editor || !user) return;
    let at = pos;
    for (const file of files) {
      const problem = imageFileError(file);
      if (problem) {
        toast.error(t(problem));
        continue;
      }
      const toastId = toast.loading(t("article.uploading"));
      const url = await uploadArticleImage(file, user.id);
      toast.dismiss(toastId);
      if (!url) {
        toast.error(t("article.uploadError"));
        continue;
      }
      const image = { type: "image", attrs: { src: url, alt: null } };
      if (at != null) editor.chain().focus().insertContentAt(at, image).run();
      else editor.chain().focus().insertContent(image).run();
      at = undefined; // further images follow at the cursor
    }
  };

  // TipTap v3 does not re-render the page on every keystroke. Subscribe to the document itself
  // (a new node only when the content changes, not on cursor moves). In StrictMode the store can
  // briefly still hold a destroyed editor, whose schema is gone, so that case reads as empty.
  const doc = useEditorState({
    editor,
    selector: ({ editor: e }) => (e && !e.isDestroyed ? e.state.doc : null),
    equalityFn: (a, b) => a === b,
  });
  const docState = useMemo(() => {
    if (!doc || !editor || editor.isDestroyed) return { html: "", text: "", words: 0, hasText: false };
    const text = editor.getText();
    return { html: editor.getHTML(), text, words: countWords(text), hasText: !!text.trim() };
  }, [doc, editor]);
  const wordCount = docState.words;

  const buildPayload = useCallback(
    (content: string) => ({
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      content,
      category,
      article_type: articleType,
      cover_image_url: coverImage || null,
      ...coverCreditColumns(coverImage, coverCredit, creditColumns),
      tgn_plus: tgnPlus,
      language,
      translation_group: translationGroup,
      ...(correctionColumn ? { correction_note: correctionNote.trim() || null } : {}),
      ...(liveColumn ? { live_status: liveStatus } : {}),
    }),
    [title, excerpt, category, articleType, coverImage, coverCredit, creditColumns, tgnPlus, language, translationGroup, correctionColumn, correctionNote, liveColumn, liveStatus],
  );

  const currentKey = JSON.stringify(buildPayload(docState.html));
  const hasContent = !!title.trim() || docState.hasText;
  const dirty = savedKey === null ? hasContent : currentKey !== savedKey;

  // Title and teaser grow with their text instead of cutting long titles off
  useLayoutEffect(() => {
    for (const el of [titleRef.current, excerptRef.current]) {
      if (!el) continue;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title, excerpt, authorized]);

  // Load existing article for editing. Waits for `authorized`: before that only the loading skeleton is
  // rendered, the editor is not mounted yet, and content set then could get lost.
  // Loads once per article and editor instance. `user` is a new object on every auth event (Supabase
  // sends one each time the tab gets focus again, and on token refresh); reloading then replaced
  // everything typed since the last save with the stored version.
  const userId = user?.id;
  const loadedRef = useRef<{ editor: typeof editor; id: string } | null>(null);
  useEffect(() => {
    if (!editId) { loadedRef.current = null; return; }
    if (!editor || !userId || !authorized) return;
    if (loadedRef.current?.editor === editor && loadedRef.current.id === editId) return;
    loadedRef.current = { editor, id: editId };
    let cancelled = false;
    let done = false;
    const loadArticle = async () => {
      // Support both UUID and slug as edit parameter
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq(UUID_RE.test(editId) ? "id" : "slug", editId)
        .maybeSingle();
      if (cancelled) return;

      if (error || !data) {
        toast.error(t("article.loadError"));
        return;
      }

      // Check ownership or collaborator access
      if (data.user_id !== userId) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
        const isAdmin = roles && roles.length > 0;

        if (!isAdmin) {
          // Use the resolved id: editId may be a slug, which never matched article_id
          const { data: collab } = await supabase
            .from("article_collaborators")
            .select("id")
            .eq("article_id", data.id)
            .eq("user_id", userId)
            .eq("accepted", true)
            .maybeSingle();
          if (cancelled) return;

          if (!collab) {
            toast.error(t("article.noAccess"));
            navigate("/news");
            return;
          }
        }
      }

      const hasCreditColumns = "cover_image_credit" in data;
      const hasCorrectionColumn = "correction_note" in data;
      const loadedCorrection = (data as { correction_note?: string | null }).correction_note || "";
      const hasLiveColumn = "live_status" in data;
      const loadedLive = isLiveStatus(data.live_status) ? data.live_status : null;
      const loaded = {
        title: data.title,
        excerpt: data.excerpt || "",
        category: data.category || "general",
        articleType: data.article_type,
        coverImage: data.cover_image_url,
        coverCredit: { credit: data.cover_image_credit || "", url: data.cover_image_credit_url || "" },
        tgnPlus: data.tgn_plus,
        language: (data as any).language || "de",
        translationGroup: (data as any).translation_group || null,
      };
      setTitle(loaded.title);
      setExcerpt(loaded.excerpt);
      setCategory(loaded.category);
      setArticleType(loaded.articleType);
      setCoverImage(loaded.coverImage);
      setCoverCredit(loaded.coverCredit);
      setCreditColumns(hasCreditColumns);
      setTgnPlus(loaded.tgnPlus);
      setLanguage(loaded.language);
      setTranslationGroup(loaded.translationGroup);
      setCorrectionNote(loadedCorrection);
      setCorrectionColumn(hasCorrectionColumn);
      setLiveStatus(loadedLive);
      setLiveColumn(hasLiveColumn);
      setIsPublished(data.published);
      setAuthorId(data.user_id);
      setWorkflowStatus(((data as { status?: ArticleStatus }).status) || "idea");
      setArticleId(data.id);
      setQualityAnalysis(null);
      setAnalyzedText(null);
      // Not an undo step: Ctrl+Z right after opening emptied the editor
      editor.chain().setMeta("addToHistory", false).setContent(data.content).run();
      setSavedKey(
        JSON.stringify({
          title: loaded.title.trim(),
          excerpt: loaded.excerpt.trim() || null,
          content: editor.getHTML(),
          category: loaded.category,
          article_type: loaded.articleType,
          cover_image_url: loaded.coverImage || null,
          ...coverCreditColumns(loaded.coverImage, loaded.coverCredit, hasCreditColumns),
          tgn_plus: loaded.tgnPlus,
          language: loaded.language,
          translation_group: loaded.translationGroup,
          ...(hasCorrectionColumn ? { correction_note: loadedCorrection.trim() || null } : {}),
          ...(hasLiveColumn ? { live_status: loadedLive } : {}),
        }),
      );
      setDraftRestored(true);
    };
    loadArticle().finally(() => { done = true; });
    return () => {
      cancelled = true;
      // Interrupted before the content arrived: allow the next run to load it
      if (!done) loadedRef.current = null;
    };
  }, [editId, editor, userId, authorized]);

  // Restore draft from localStorage (only for new articles)
  useEffect(() => {
    if (!editor || draftRestored || editId || !authorized) return;
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        if (Date.now() - draft.savedAt < 7 * 24 * 60 * 60 * 1000) {
          setTitle(draft.title || "");
          setExcerpt(draft.excerpt || "");
          setCategory(draft.category || "general");
          setArticleType(draft.articleType || "news");
          setCoverImage(draft.coverImage || null);
          setCoverCredit(draft.coverCredit ?? EMPTY_COVER_CREDIT);
          if (draft.content) editor.chain().setMeta("addToHistory", false).setContent(draft.content).run();
          toast.info(t("article.draftRestored"));
        }
      }
    } catch { /* ignore */ }
    setDraftRestored(true);
  }, [editor, draftRestored, editId, authorized]);

  // Autosave. Runs on a fixed interval (the old version restarted the timer on every title keystroke),
  // skips unchanged state and never touches published articles: those only change on "Update".
  const autosave = async () => {
    if (!editor || !draftRestored || !dirty || savingRef.current) return;
    const content = editor.getHTML();
    const textContent = editor.getText().trim();

    if (!editId && !articleId) {
      const draft: DraftData = { title, excerpt, category, articleType, coverImage, coverCredit, content, savedAt: Date.now() };
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft)); } catch { /* storage full or blocked */ }
    }

    if (!user || isPublished || !title.trim() || !textContent) return;
    const payload = buildPayload(content);
    const key = JSON.stringify(payload);
    const isUuid = !!articleId && UUID_RE.test(articleId);
    // Edit mode while the article is still loading: nothing to update yet
    if (!isUuid && editId) return;

    savingRef.current = true;
    setSaveStatus("saving");
    const status = draftStatus(workflowStatus, countWords(textContent));
    let error;
    if (isUuid) {
      ({ error } = await supabase.from("articles").update({ ...payload, published: false, status } as any).eq("id", articleId));
    } else {
      const slug = slugify(title) + "-" + Date.now().toString(36);
      const result = await supabase
        .from("articles")
        .insert({ ...payload, published: false, status, user_id: user.id, slug } as any)
        .select("id")
        .maybeSingle();
      error = result.error;
      if (result.data) {
        setArticleId(result.data.id);
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    }
    savingRef.current = false;

    if (error) {
      setSaveStatus("error");
      // One toast per failure streak, not one every 30 seconds
      if (!autosaveErrorShown.current) toast.error(t("article.saveError"), { description: error.message });
      autosaveErrorShown.current = true;
      return;
    }
    autosaveErrorShown.current = false;
    setWorkflowStatus(status);
    setSavedKey(key);
    setSaveStatus("saved");
    setLastSavedAt(new Date());
  };
  const autosaveRef = useRef(autosave);
  autosaveRef.current = autosave;

  useEffect(() => {
    if (!editor || !draftRestored) return;
    const interval = setInterval(() => autosaveRef.current(), AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [editor, draftRestored]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const id = setTimeout(() => setSaveStatus("idle"), 3000);
    return () => clearTimeout(id);
  }, [saveStatus]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!loading && !userId) { navigate("/auth"); return; }
    if (userId) {
      checkPressRole();
      checkCanPublish();
    }
    // Keyed on the id: a new user object after returning to the tab is the same person
  }, [userId, loading]);

  const checkPressRole = async () => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).in("role", ["press", "admin"]);
    if (data?.some((r) => r.role === "admin")) { setIsAdmin(true); setAuthorized(true); return; }
    if (data && data.length > 0) {
      const { data: pressProfile } = await supabase.from("press_profiles").select("verified").eq("user_id", user!.id).maybeSingle();
      if (pressProfile?.verified === true) { setAuthorized(true); return; }
    }
    // Invited co-authors usually have no press account; they may edit the article they joined.
    // Before, they accepted the invite and then hit "no access" on "Artikel bearbeiten".
    setAuthorized(editId ? await isCollaboratorOn(editId) : false);
  };

  const isCollaboratorOn = async (idOrSlug: string) => {
    let articleId = idOrSlug;
    if (!UUID_RE.test(idOrSlug)) {
      const { data } = await supabase.from("articles").select("id").eq("slug", idOrSlug).maybeSingle();
      if (!data) return false;
      articleId = data.id;
    }
    const { data: collab } = await supabase
      .from("article_collaborators")
      .select("id")
      .eq("article_id", articleId)
      .eq("user_id", user!.id)
      .eq("accepted", true)
      .maybeSingle();
    return !!collab;
  };

  const checkCanPublish = async () => {
    try {
      const { data } = await supabase.rpc("can_press_publish", { _user_id: user!.id });
      setCanPublish(!!data);
    } catch {
      setCanPublish(false);
    }
  };

  // Runs after saving a draft and on demand; `manual` reports failures, the automatic run stays quiet
  const runQualityAnalysis = useCallback(async (manual = false) => {
    if (!editor || editor.isDestroyed) return;
    const text = editor.getText();
    if (text.trim().length < 20) return;
    setQualityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-article", {
        // The HTML keeps headings and lists, which the structure check needs; feedback comes in the UI language
        // `text` keeps the previous analyze-article version working until the new one is deployed
        body: { html: editor.getHTML(), text, title, excerpt, articleType, language, uiLanguage: i18n.language },
      });
      if (error) throw new Error(await edgeFunctionErrorMessage(error, t("article.quality.error")));
      if (data?.analysis) {
        setQualityAnalysis(data.analysis);
        setAnalyzedText(text);
      }
    } catch (err) {
      if (manual) toast.error(t("article.quality.error"), { description: err instanceof Error ? err.message : undefined });
      else console.error("Quality analysis error:", err);
    } finally {
      setQualityLoading(false);
    }
  }, [editor, title, excerpt, articleType, language, i18n.language, t]);

  // Quotes from the analysis are located in the current document; a passage edited since is not found
  const jumpToIssue = useCallback((quote: string) => {
    if (!editor) return false;
    const range = findTextRange(editor.state.doc, quote);
    if (!range) {
      toast.info(t("article.quality.notFound"));
      return false;
    }
    editor.chain().focus().setTextSelection(range).scrollIntoView().run();
    return true;
  }, [editor, t]);

  const applyIssueFix = useCallback((quote: string, fix: string) => {
    if (!editor || !fix) return false;
    const range = findTextRange(editor.state.doc, quote);
    if (!range) {
      toast.info(t("article.quality.notFound"));
      return false;
    }
    editor.chain().insertContentAt(range, { type: "text", text: fix }).run();
    return true;
  }, [editor, t]);

  /** Applies several direct fixes as one undo step; returns the indexes of the ones that were placed */
  const applyIssueFixes = useCallback((fixes: { index: number; quote: string; fix: string }[]) => {
    if (!editor) return [];
    const placed = fixes
      .map((f) => ({ ...f, range: findTextRange(editor.state.doc, f.quote) }))
      .filter((f): f is typeof f & { range: { from: number; to: number } } => !!f.range && !!f.fix)
      .sort((a, b) => b.range.from - a.range.from)
      // Two fixes for overlapping passages: the second would hit text the first already changed
      .filter((f, i, list) => i === 0 || f.range.to <= list[i - 1].range.from);
    if (!placed.length) {
      toast.info(t("article.quality.notFound"));
      return [];
    }
    const tr = editor.state.tr;
    for (const f of placed) tr.insertText(f.fix, f.range.from, f.range.to);
    editor.view.dispatch(tr);
    toast.success(t("article.quality.appliedAll", { count: placed.length }), {
      action: { label: t("editor.ai.undo"), onClick: () => editor.commands.undo() },
    });
    return placed.map((f) => f.index);
  }, [editor, t]);

  const [improving, setImproving] = useState(false);

  const handleImprove = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const textContent = editor.getText();
    if (!textContent.trim() || textContent.trim().length < 20) return;

    setImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-article", {
        body: {
          text: html,
          title,
          language,
          reasons: qualityAnalysis?.reasons || [],
          issues: qualityAnalysis?.issues || [],
        },
      });
      if (error) throw new Error(await edgeFunctionErrorMessage(error, t("article.quality.improveError")));
      if (!data?.improved) throw new Error(t("article.quality.improveError"));
      editor.commands.setContent(data.improved);
      toast.success(t("article.quality.improveSuccess"), {
        description: t("article.quality.improveReview"),
        action: { label: t("editor.ai.undo"), onClick: () => editor.commands.undo() },
        duration: 10_000,
      });
      setTimeout(() => runQualityAnalysis(), 500);
    } catch (err: unknown) {
      console.error("Improve error:", err);
      toast.error(t("article.quality.improveError"), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setImproving(false);
    }
  }, [editor, title, language, qualityAnalysis, t, runQualityAnalysis]);

  // Typing is only possible once the stored content is in the editor, and not while "Improve" runs:
  // both replace the whole document, so anything typed in the meantime would be lost
  const editable = draftRestored && !improving;
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable !== editable) editor.setEditable(editable, false);
  }, [editor, editable]);

  /**
   * Admins hand the article to someone else from the team. A draft is saved first and then left:
   * admins cannot open other people's drafts, so further edits here would no longer be stored.
   */
  const changeAuthor = async (member: TeamMember) => {
    if (!articleId || !user) return;
    if (!isPublished && !(await handleSave("draft"))) return;
    try {
      await changeArticleAuthor(articleId, authorId ?? user.id, member.user_id, user.id);
    } catch {
      toast.error(t("article.author.error"));
      return;
    }
    setAuthorId(member.user_id);
    if (!isPublished && member.user_id !== user.id) {
      toast.success(t("article.author.handedOver", { name: member.name }));
      navigate("/redaktion");
      return;
    }
    toast.success(t("article.author.changed", { name: member.name }));
  };

  /** Resolves to the article's id once it is stored, or null when nothing was saved */
  const handleSave = useCallback(async (mode: SaveMode): Promise<string | null> => {
    if (!editor || savingRef.current) return null;
    const content = editor.getHTML();
    const textContent = editor.getText();
    let publish = mode === "publish";

    if (!title.trim() || !textContent.trim()) {
      toast.error(t("article.errorRequired"));
      return null;
    }

    if (publish && !isPublished) {
      // Must save before publishing
      if (!hasSavedOnce) {
        toast.error(t("article.mustSaveFirst"));
        return null;
      }
      // Block publish if quality is "bad"
      if (qualityAnalysis?.score === "bad") {
        toast.error(t("article.qualityTooLow"));
        return null;
      }
      // Block direct publish for untrusted press (two-article principle)
      if (!canPublish) {
        toast.info(t("article.pendingReview"));
        publish = false;
      }
    }

    const payload = buildPayload(content);
    const isUuid = !!articleId && UUID_RE.test(articleId);
    if (editId && !isUuid) {
      // Edit mode but article hasn't loaded yet
      toast.error(t("common.loading"));
      return null;
    }

    savingRef.current = true;
    setSubmitting(true);
    setSaveStatus("saving");

    // "Publish" without the right to publish directly puts the article into the review queue
    const status: ArticleStatus = publish ? "published" : mode === "publish" ? "review" : draftStatus(workflowStatus, countWords(textContent));
    let error;
    let id = articleId;
    if (isUuid) {
      ({ error } = await supabase.from("articles").update({ ...payload, published: publish, status } as any).eq("id", articleId));
    } else {
      const slug = slugify(title) + "-" + Date.now().toString(36);
      const result = await supabase
        .from("articles")
        .insert({ ...payload, published: publish, status, user_id: user!.id, slug } as any)
        .select("id")
        .single();
      error = result.error;
      if (!error && result.data) {
        id = result.data.id;
        setArticleId(result.data.id);
      }
    }

    savingRef.current = false;
    setSubmitting(false);

    if (error) {
      setSaveStatus("error");
      toast.error(t("article.saveError"), { description: error.message });
      return null;
    }

    const wasPublished = isPublished;
    localStorage.removeItem(AUTOSAVE_KEY);
    setIsPublished(publish);
    setWorkflowStatus(status);
    setSavedKey(JSON.stringify(payload));
    setSaveStatus("saved");
    setLastSavedAt(new Date());
    setHasSavedOnce(true);
    autosaveErrorShown.current = false;

    if (mode === "unpublish") toast.success(t("article.unpublished"));
    else if (publish) toast.success(wasPublished ? t("article.updated") : t("article.published"));
    else if (mode === "draft") toast.success(t("article.draftSaved"));

    // Notify followers only when the article goes live, not on every later update
    if (publish && !wasPublished && id) {
      supabase.functions.invoke("notify-followers", {
        body: {
          notificationType: "new_article",
          targetType: "article",
          targetId: id,
          actorId: user!.id,
        },
      }).catch(() => {});
    }

    if (!publish) runQualityAnalysis();
    return id;
  }, [editor, title, buildPayload, articleId, editId, user, hasSavedOnce, qualityAnalysis, runQualityAnalysis, canPublish, isPublished, workflowStatus, t]);

  // Ctrl/⌘+S saves (as draft, or updates a published article)
  const saveShortcutRef = useRef<() => void>(() => {});
  saveShortcutRef.current = () => handleSave(isPublished ? "publish" : "draft");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveShortcutRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const clearDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setTitle("");
    setExcerpt("");
    setCategory("general");
    setArticleType("news");
    setCoverImage(null);
    setCoverCredit(EMPTY_COVER_CREDIT);
    setTgnPlus(false);
    setTranslationGroup(null);
    editor?.commands.clearContent();
    setArticleId(null);
    setIsPublished(false);
    setWorkflowStatus("idea");
    setHasSavedOnce(false);
    setQualityAnalysis(null);
    setSavedKey(null);
    setSaveStatus("idle");
    setLastSavedAt(null);
    // Leave edit mode, otherwise the next save still waits for the old ?edit article
    if (editId) navigate("/news/schreiben", { replace: true });
    toast.success(t("article.draftCleared"));
  };

  const handleTranslate = useCallback(async (targetLang: string) => {
    if (!editor || !user) return;

    const content = editor.getHTML();
    const currentTitle = title.trim();

    if (!currentTitle || !editor.getText().trim()) {
      toast.error(t("article.errorRequired"));
      return;
    }

    // An unsaved article is saved first; its id is needed to link the translation to it.
    // Read from the save itself: the articleId in this closure is still the old, empty one.
    const sourceId = articleId ?? (await handleSave("draft"));
    if (!sourceId) return;

    toast.info(t("article.translating"));

    try {
      const { data, error } = await supabase.functions.invoke("translate-article", {
        body: { title: currentTitle, content, excerpt, sourceLang: language, targetLang },
      });

      if (error) throw new Error(await edgeFunctionErrorMessage(error, t("article.translateError")));

      // Create a translation group if none exists
      const groupId = translationGroup || crypto.randomUUID();

      // Update current article with the translation group
      if (!translationGroup) {
        await supabase.from("articles").update({ translation_group: groupId } as any).eq("id", sourceId);
        setTranslationGroup(groupId);
      }

      // Create the translated article
      const slug = slugify(data.title || currentTitle) + "-" + targetLang + "-" + Date.now().toString(36);
      const { data: created, error: insertErr } = await supabase.from("articles").insert({
        title: data.title || currentTitle,
        excerpt: data.excerpt || null,
        content: data.content || content,
        category,
        article_type: articleType,
        cover_image_url: coverImage || null,
        ...coverCreditColumns(coverImage, coverCredit, creditColumns),
        tgn_plus: tgnPlus,
        language: targetLang,
        translation_group: groupId,
        // A translation of a written article is no idea
        status: "writing",
        user_id: user.id,
        slug,
        published: false,
      } as any).select("id").single();

      if (insertErr) throw insertErr;

      toast.success(t("article.translateSuccess"), {
        action: created?.id ? { label: t("article.translateOpen"), onClick: () => navigate(`/news/schreiben?edit=${created.id}`) } : undefined,
        duration: 10_000,
      });
    } catch (err: any) {
      console.error("Translation error:", err);
      toast.error(t("article.translateError"), { description: err?.message });
    }
  }, [editor, title, excerpt, language, translationGroup, articleId, category, articleType, coverImage, coverCredit, creditColumns, tgnPlus, user, handleSave, navigate, t]);

  // Loading state
  if (loading || authorized === null) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-24 pb-12 container mx-auto px-4">
          <div className="animate-pulse h-64 bg-secondary rounded-lg" />
        </main>
        <Footer />
      </div>
    );
  }

  // No access
  if (!authorized) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-24 pb-12 container mx-auto px-4 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">{t("article.noAccess")}</h1>
          <p className="text-muted-foreground mb-6">{t("article.noAccessDesc")}</p>
          <Button variant="outline" onClick={() => navigate("/profil")}>{t("article.applyPress")}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const statusIndicator =
    saveStatus === "saving" ? (
      <span className="text-xs text-muted-foreground animate-pulse">{t("article.saving")}</span>
    ) : saveStatus === "error" ? (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <CloudOff className="w-4 h-4" aria-hidden="true" />
        <span className="hidden md:inline">{t("article.saveError")}</span>
      </span>
    ) : dirty && savedKey !== null ? (
      <span className="text-xs text-amber-500 whitespace-nowrap">{t("article.unsaved")}</span>
    ) : savedKey !== null ? (
      <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap" title={t("article.autosaved")}>
        <CloudDoneTwoTone className="w-4 h-4 text-green-500" aria-hidden="true" />
        {lastSavedAt ? (
          <span className="hidden sm:inline">
            {t("article.savedAt", { time: lastSavedAt.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" }) })}
          </span>
        ) : (
          <span className="sr-only">{t("article.autosaved")}</span>
        )}
      </span>
    ) : null;
  const readingTime = t("article.readingTime", { min: Math.max(1, Math.round(wordCount / 200)) });

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top Action Bar: back + status left, tools scroll in the middle on small screens, save/publish always visible */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-3 md:px-4 h-14 flex items-center gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground px-2" onClick={() => navigate("/news")} aria-label={t("article.backToNews")}>
              <ArrowBackTwoTone className="w-4 h-4" />
              <span className="hidden lg:inline">{t("article.backToNews")}</span>
            </Button>

            {articleId && (
              <Badge variant={isPublished ? "default" : "secondary"} className="text-xs shrink-0">
                {isPublished ? t("article.statusPublished") : t("article.statusDraft")}
              </Badge>
            )}
          </div>

          {/* On phones the tools scroll sideways; the fade on the right edge shows there is more */}
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none max-md:[mask-image:linear-gradient(to_right,#000_82%,transparent)] max-md:pr-6">
            <div className="flex items-center gap-1 w-max ml-auto">
              <div className="mr-1" aria-live="polite">{statusIndicator}</div>

              <span className="text-xs text-muted-foreground hidden xl:block tabular-nums mr-1 whitespace-nowrap" title={readingTime}>
                {wordCount} {t("article.words")}
              </span>

              <QualityBadge
                analysis={qualityAnalysis}
                loading={qualityLoading}
                stale={!!qualityAnalysis && analyzedText !== docState.text}
                canAnalyze={docState.text.trim().length >= 20}
                onAnalyze={() => runQualityAnalysis(true)}
                onImprove={handleImprove}
                improving={improving}
                onJump={jumpToIssue}
                onApply={applyIssueFix}
                onApplyAll={applyIssueFixes}
              />

              {/* Most used first, so they are visible without scrolling on phones */}
              <ArticleSettings
                excerpt={excerpt}
                setExcerpt={setExcerpt}
                category={category}
                setCategory={setCategory}
                articleType={articleType}
                setArticleType={setArticleType}
                tgnPlus={tgnPlus}
                setTgnPlus={setTgnPlus}
                language={language}
                setLanguage={setLanguage}
                onClearDraft={() => setConfirm("clear")}
                onTranslate={handleTranslate}
                articleId={articleId}
                userId={user?.id}
                isAdmin={isAdmin}
                authorId={authorId ?? user?.id ?? null}
                onAuthorChange={changeAuthor}
                correctionNote={isPublished && correctionColumn ? correctionNote : undefined}
                setCorrectionNote={setCorrectionNote}
                liveStatus={liveColumn ? liveStatus : undefined}
                setLiveStatus={setLiveStatus}
              />

              <ArticlePreview
                title={title}
                excerpt={excerpt}
                category={category}
                articleType={articleType}
                coverImage={coverImage}
                coverCredit={coverCredit}
                getContent={() => editor?.getHTML() || ""}
                tgnPlus={tgnPlus}
              />

              <MediaGallery userId={user?.id} editor={editor} />
              <CommentsPanel articleId={articleId} userId={user?.id} editor={editor} />
              <ArticleBriefingsPanel articleId={articleId} userId={user?.id} />
              <CollabPanel articleId={articleId} userId={user?.id} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-6 w-px bg-border/60 mr-0.5" aria-hidden />
            {isPublished ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirm("unpublish")} disabled={submitting} title={t("article.unpublish")}>
                <EyeOff className="w-4 h-4" />
                <span className="hidden md:inline">{t("article.unpublish")}</span>
                <span className="sr-only md:hidden">{t("article.unpublish")}</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleSave("draft")} disabled={submitting} title={t("article.saveDraft")}>
                <SaveTwoTone className="w-4 h-4" />
                <span className="hidden md:inline">{t("article.saveDraft")}</span>
                <span className="sr-only md:hidden">{t("article.saveDraft")}</span>
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => handleSave("publish")}
              disabled={submitting || (!isPublished && (!hasSavedOnce || qualityAnalysis?.score === "bad"))}
              title={isPublished ? t("article.update") : !hasSavedOnce ? t("article.mustSaveFirst") : canPublish === false ? t("article.pendingReviewShort") : t("article.publish")}
            >
              <PublishTwoTone className="w-4 h-4" />
              <span className="hidden md:inline">
                {isPublished ? t("article.update") : canPublish === false ? t("article.pendingReviewShort") : t("article.publish")}
              </span>
              <span className="sr-only md:hidden">{isPublished ? t("article.update") : t("article.publish")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Canvas */}
      {/* No footer while writing; the extra bottom space keeps the last lines above the phone dock */}
      <main className="flex-1 pt-32 pb-32 md:pb-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8">
            <CoverImageUpload
              coverImage={coverImage}
              setCoverImage={setCoverImage}
              credit={coverCredit}
              onCreditChange={setCoverCredit}
              userId={user?.id}
            />
          </div>

          {/* Title and teaser: multi-line so long titles stay visible; Enter jumps to the next field */}
          <div className="relative mb-3">
            <textarea
              ref={titleRef}
              rows={1}
              value={title}
              maxLength={200}
              onFocus={() => setFocusedField("title")}
              onBlur={() => setFocusedField(null)}
              aria-describedby="article-title-count"
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  excerptRef.current?.focus();
                }
              }}
              placeholder={t("article.titlePlaceholder")}
              aria-label={t("article.titleLabel")}
              className="block w-full resize-none overflow-hidden bg-transparent border-none outline-none text-3xl md:text-5xl font-display font-bold text-foreground placeholder:text-muted-foreground/30 leading-tight break-words"
            />
            {/* Counter only while typing in the field, or as a hint once the title is too long for search results.
                Positioned below the field so it never shifts the layout */}
            <p id="article-title-count" className="pointer-events-none absolute right-0 top-full flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
              {title.length > TITLE_SEO_LENGTH && (
                <span className="text-amber-400">{t("article.titleSeoHint", { count: TITLE_SEO_LENGTH })}</span>
              )}
              {(focusedField === "title" || title.length > TITLE_SEO_LENGTH) && <span>{title.length}/200</span>}
            </p>
          </div>

          <div className="relative mb-8">
            <textarea
              ref={excerptRef}
              rows={1}
              value={excerpt}
              maxLength={300}
              onFocus={() => setFocusedField("excerpt")}
              onBlur={() => setFocusedField(null)}
              aria-describedby="article-excerpt-count"
              onChange={(e) => setExcerpt(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
              placeholder={t("article.excerptPlaceholder")}
              aria-label={t("article.excerptLabel")}
              className="block w-full resize-none overflow-hidden bg-transparent border-none outline-none text-lg text-muted-foreground placeholder:text-muted-foreground/40 leading-relaxed"
            />
            <p id="article-excerpt-count" className="pointer-events-none absolute right-0 top-full mt-1 text-xs tabular-nums text-muted-foreground">
              {focusedField === "excerpt" && <span>{excerpt.length}/300</span>}
            </p>
          </div>

          <EditorToolbar editor={editor} userId={user?.id} language={language} />

          {/* An empty article can start from the usual structure of its type */}
          {editor && draftRestored && !docState.hasText && <TemplatePicker editor={editor} onPick={setArticleType} />}

          <div className="rounded-xl bg-card/30 border border-border/30 p-4 md:p-8 min-h-[50vh]">
            <EditorContent editor={editor} />
          </div>

          {/* Word count + save state below the editor where the action bar has no room */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground tabular-nums">
              {wordCount} {t("article.words")}, {readingTime}
            </span>
            <span className="xl:hidden">{statusIndicator}</span>
          </div>
        </div>
      </main>

      <EditorOutline editor={editor} />

      <AssistantSidebar
        editor={editor}
        title={title}
        setTitle={setTitle}
        excerpt={excerpt}
        setExcerpt={setExcerpt}
        language={language}
        articleType={articleType}
      />

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "unpublish" ? t("article.unpublishConfirmTitle") : t("article.clearDraftConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "unpublish" ? t("article.unpublishConfirmDesc") : t("article.clearDraftConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirm === "unpublish") handleSave("unpublish");
                else clearDraft();
                setConfirm(null);
              }}
            >
              {confirm === "unpublish" ? t("article.unpublish") : t("article.clearDraft")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WriteArticlePage;
