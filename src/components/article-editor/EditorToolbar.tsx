import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/edge-function-error";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code as CodeTwoTone, Image as ImageTwoTone, Link as LinkTwoTone, Bold as FormatBoldTwoTone, Italic as FormatItalicTwoTone, List as FormatListBulletedTwoTone, ListOrdered as FormatListNumberedTwoTone, Quote as FormatQuoteTwoTone, Strikethrough as FormatStrikethroughTwoTone, Underline as FormatUnderlinedTwoTone, Minus as HorizontalRuleTwoTone, Redo2 as RedoTwoTone, SpellCheck as SpellcheckTwoTone, Undo2 as UndoTwoTone, Table as TableTwoTone, Keyboard as KeyboardTwoTone, Info as NoteTwoTone, SquarePlay as VideoTwoTone } from "lucide-react";
import EditorMenus from "./EditorMenus";
import ToolbarButton from "./ToolbarButton";
import ReadabilityButton from "./ReadabilityButton";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { getSpellErrors, locateCorrections, type SpellCorrection, type SpellError } from "./SpellErrors";
import { TooltipProvider } from "@/components/ui/tooltip";
import { imageFileError, normalizeUrl, uploadArticleImage } from "./utils";
import { formatStart, parseYouTubeUrl } from "@/lib/youtube";

interface EditorToolbarProps {
  editor: Editor | null;
  userId?: string;
  /** Language of the article (not of the UI), used for the spellcheck */
  language: string;
}

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";


/** Shortcuts shown in the help dialog; keys use {mod} for Ctrl or ⌘ */
const SHORTCUTS: { key: string; keys: string }[] = [
  { key: "bold", keys: "{mod}+B" },
  { key: "italic", keys: "{mod}+I" },
  { key: "underline", keys: "{mod}+U" },
  { key: "strike", keys: "{mod}+Shift+S" },
  { key: "link", keys: "{mod}+K" },
  { key: "heading2", keys: "{mod}+Alt+2" },
  { key: "heading3", keys: "{mod}+Alt+3" },
  { key: "bulletList", keys: "{mod}+Shift+8" },
  { key: "orderedList", keys: "{mod}+Shift+7" },
  { key: "quote", keys: "{mod}+Shift+B" },
  { key: "undo", keys: "{mod}+Z" },
  { key: "save", keys: "{mod}+S" },
  { key: "help", keys: "{mod}+/" },
];
/** Markdown typed at the start of a line (StarterKit input rules) */
const MARKDOWN: { key: string; typed: string }[] = [
  { key: "heading2", typed: "## " },
  { key: "heading3", typed: "### " },
  { key: "bulletList", typed: "- " },
  { key: "orderedList", typed: "1. " },
  { key: "quote", typed: "> " },
  { key: "codeBlock", typed: "```" },
  { key: "divider", typed: "---" },
  { key: "bold", typed: "**Text**" },
  { key: "italic", typed: "*Text*" },
];

const Divider = () => (
  <div className="w-px h-5 bg-border/50 mx-0.5 shrink-0 hidden md:block" role="separator" aria-orientation="vertical" />
);

const EditorToolbar = ({ editor, userId, language }: EditorToolbarProps) => {
  const { t, i18n } = useTranslation();
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Set when the picker was opened for "image beside": position of the image the new one joins
  const besidePos = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [spellChecking, setSpellChecking] = useState(false);
  const [spellListOpen, setSpellListOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState(false);
  const video = parseYouTubeUrl(videoUrl);

  // Ctrl/⌘+/ opens the shortcut overview from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setHelpOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // TipTap v3 does not re-render on every transaction, so the active states are subscribed explicitly
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e && !e.isDestroyed
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            quote: e.isActive("blockquote"),
            note: e.isActive("articleNote"),
            code: e.isActive("codeBlock"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            link: e.isActive("link"),
            table: e.isActive("table"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
            spellErrors: getSpellErrors(e.state),
          }
        : null,
  });
  const spellErrors = state?.spellErrors ?? [];

  // The list closes by itself once every error is fixed or ignored
  useEffect(() => {
    if (!spellErrors.length) setSpellListOpen(false);
  }, [spellErrors.length]);

  const openLinkDialog = () => {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkError(false);
    setLinkOpen(true);
  };

  // Ctrl/⌘+K was advertised in the tooltip but never bound
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openLinkDialog();
      }
    };
    dom.addEventListener("keydown", onKey);
    return () => dom.removeEventListener("keydown", onKey);
  });

  const applyLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const href = normalizeUrl(linkUrl, { allowMailto: true });
    if (!href) {
      setLinkError(true);
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) {
      // No text selected: insert the address itself as linked text
      chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  const openVideoDialog = () => {
    setVideoUrl("");
    setVideoError(false);
    setVideoOpen(true);
  };

  const insertVideo = () => {
    if (!editor) return;
    if (!video) {
      setVideoError(true);
      return;
    }
    editor.chain().focus().setYouTubeVideo(video).run();
    setVideoOpen(false);
  };

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  const handleInlineImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const beside = besidePos.current;
    besidePos.current = null;
    if (!file || !editor || !userId) return;
    const problem = imageFileError(file);
    if (problem) {
      toast.error(t(problem));
      return;
    }
    setUploading(true);
    const url = await uploadArticleImage(file, userId);
    setUploading(false);
    if (!url) {
      toast.error(t("article.uploadError"));
      return;
    }
    // Next to the chosen image if it is still there, otherwise at the cursor like any other image
    if (beside !== null && editor.chain().focus().addImageBeside(url, beside).run()) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const pickImageBeside = (pos: number) => {
    besidePos.current = pos;
    imageInputRef.current?.click();
  };

  const runSpellcheck = async () => {
    if (!editor) return;
    // One line per paragraph: the function quotes a few words around each error to place it
    const text = editor.getText({ blockSeparator: "\n" }).trim();
    if (!text) {
      toast.info(t("article.spellcheckEmpty"));
      return;
    }

    setSpellChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("spellcheck", {
        body: { text, language, uiLanguage: i18n.language },
      });
      if (error) throw new Error(await edgeFunctionErrorMessage(error, t("article.spellcheckError")));

      const corrections: SpellCorrection[] = Array.isArray(data?.corrections) ? data.corrections : [];
      // Placed in the document as it is now, with whatever was typed while the check ran
      const errors = locateCorrections(editor.state.doc, corrections);
      editor.commands.setSpellErrors(errors);
      if (data?.truncated) toast.info(t("article.spell.truncated"));
      if (errors.length) setSpellListOpen(true);
      else toast.success(t("article.spellcheckOk"));
    } catch (err: unknown) {
      console.error("Spellcheck error:", err);
      toast.error(t("article.spellcheckError"), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSpellChecking(false);
    }
  };

  const jumpToSpellError = (e: SpellError) => {
    // A cursor inside the word opens its correction menu
    editor?.chain().focus().setTextSelection(e.from).scrollIntoView().run();
    setSpellListOpen(false);
  };

  const applyAllSpellErrors = () => {
    if (!editor) return;
    const count = spellErrors.length;
    editor.commands.applySpellErrors();
    toast.success(t("article.spell.appliedAll", { count }), {
      action: { label: t("editor.ai.undo"), onClick: () => editor.commands.undo() },
    });
  };

  if (!editor || !state) return null;

  const run = (fn: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => () => fn(editor.chain().focus()).run();

  return (
    <>
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={handleInlineImage} aria-hidden="true" tabIndex={-1} />
      <TooltipProvider delayDuration={400}>
        <div className="sticky top-[7.5rem] z-30 mb-6" role="toolbar" aria-label={t("article.toolbar.label")}>
          {/* On phones the buttons scroll sideways; the fade on the right edge shows there are more */}
          <div className="flex items-center gap-0.5 p-1 md:p-1.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg overflow-x-auto scrollbar-none max-md:pr-8 max-md:[mask-image:linear-gradient(to_right,#000_85%,transparent)]">
            <ToolbarButton icon={<UndoTwoTone className="w-4 h-4" />} label={t("article.undo")} shortcut={`${mod}+Z`} disabled={!state.canUndo} onClick={run((c) => c.undo())} />
            <ToolbarButton icon={<RedoTwoTone className="w-4 h-4" />} label={t("article.redo")} shortcut={`${mod}+Shift+Z`} disabled={!state.canRedo} onClick={run((c) => c.redo())} />

            <Divider />

            <ToolbarButton icon={<FormatBoldTwoTone className="w-4 h-4" />} label={t("article.toolbar.bold")} shortcut={`${mod}+B`} active={state.bold} onClick={run((c) => c.toggleBold())} />
            <ToolbarButton icon={<FormatItalicTwoTone className="w-4 h-4" />} label={t("article.toolbar.italic")} shortcut={`${mod}+I`} active={state.italic} onClick={run((c) => c.toggleItalic())} />
            <ToolbarButton icon={<FormatUnderlinedTwoTone className="w-4 h-4" />} label={t("article.toolbar.underline")} shortcut={`${mod}+U`} active={state.underline} onClick={run((c) => c.toggleUnderline())} />
            <ToolbarButton icon={<FormatStrikethroughTwoTone className="w-4 h-4" />} label={t("article.toolbar.strike")} shortcut={`${mod}+Shift+S`} active={state.strike} onClick={run((c) => c.toggleStrike())} />

            <Divider />

            <ToolbarButton
              icon={<span className="text-xs font-bold w-4 h-4 flex items-center justify-center" aria-hidden="true">H2</span>}
              label={t("article.toolbar.heading2")}
              active={state.h2}
              onClick={run((c) => c.toggleHeading({ level: 2 }))}
            />
            <ToolbarButton
              icon={<span className="text-[11px] font-bold w-4 h-4 flex items-center justify-center" aria-hidden="true">H3</span>}
              label={t("article.toolbar.heading3")}
              active={state.h3}
              onClick={run((c) => c.toggleHeading({ level: 3 }))}
            />

            <Divider />

            <ToolbarButton icon={<FormatQuoteTwoTone className="w-4 h-4" />} label={t("article.toolbar.quote")} active={state.quote} onClick={run((c) => c.toggleBlockquote())} />
            <ToolbarButton icon={<NoteTwoTone className="w-4 h-4" />} label={t("article.toolbar.note")} active={state.note} onClick={run((c) => c.toggleArticleNote())} />
            <ToolbarButton icon={<CodeTwoTone className="w-4 h-4" />} label={t("article.toolbar.codeBlock")} active={state.code} onClick={run((c) => c.toggleCodeBlock())} />
            <ToolbarButton icon={<HorizontalRuleTwoTone className="w-4 h-4" />} label={t("article.divider")} onClick={run((c) => c.setHorizontalRule())} />

            <Divider />

            <ToolbarButton icon={<FormatListBulletedTwoTone className="w-4 h-4" />} label={t("article.toolbar.bulletList")} active={state.bullet} onClick={run((c) => c.toggleBulletList())} />
            <ToolbarButton icon={<FormatListNumberedTwoTone className="w-4 h-4" />} label={t("article.toolbar.orderedList")} active={state.ordered} onClick={run((c) => c.toggleOrderedList())} />

            <Divider />

            <ToolbarButton icon={<LinkTwoTone className="w-4 h-4" />} label={t("article.toolbar.link")} shortcut={`${mod}+K`} active={state.link} onClick={openLinkDialog} />
            <ToolbarButton
              icon={<ImageTwoTone className="w-4 h-4" />}
              label={uploading ? t("article.uploading") : t("article.toolbar.image")}
              loading={uploading}
              onClick={() => imageInputRef.current?.click()}
            />
            <ToolbarButton icon={<VideoTwoTone className="w-4 h-4" />} label={t("article.toolbar.youtube")} onClick={openVideoDialog} />
            <ToolbarButton
              icon={<TableTwoTone className="w-4 h-4" />}
              label={t("article.toolbar.table")}
              active={state.table}
              disabled={state.table}
              onClick={run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}
            />

            <Divider />

            <Popover open={spellListOpen} onOpenChange={setSpellListOpen}>
              <PopoverAnchor asChild>
                <span className="inline-flex shrink-0">
                  <ToolbarButton
                    icon={<SpellcheckTwoTone className="w-4 h-4" />}
                    label={spellErrors.length ? t("article.spell.found", { count: spellErrors.length }) : t("article.spellcheck")}
                    onClick={() => (spellErrors.length ? setSpellListOpen((open) => !open) : runSpellcheck())}
                    loading={spellChecking}
                    active={spellListOpen}
                    badge={spellErrors.length}
                  />
                </span>
              </PopoverAnchor>
              <PopoverContent align="end" className="w-80 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">{t("article.spell.found", { count: spellErrors.length })}</p>
                  <Button size="sm" className="h-7 text-xs" onClick={applyAllSpellErrors}>
                    {t("article.spellcheckApplyAll")}
                  </Button>
                </div>
                <ul className="max-h-80 space-y-0.5 overflow-y-auto p-1.5">
                  {spellErrors.map((e) => (
                    <li key={e.id} className="rounded-lg px-2 py-1.5 hover:bg-secondary/50">
                      <button
                        type="button"
                        onClick={() => jumpToSpellError(e)}
                        className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title={t("article.quality.jump")}
                      >
                        <span className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className="text-muted-foreground line-through decoration-destructive/70">{e.original}</span>
                          <span className="text-muted-foreground" aria-hidden="true">→</span>
                          <span className="font-medium text-score-high">{e.correction || t("article.spell.remove")}</span>
                        </span>
                        {e.reason && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{e.reason}</span>}
                      </button>
                      <span className="mt-1 flex gap-1">
                        <Button size="sm" variant="secondary" className="h-6 px-2 text-xs" onClick={() => editor.commands.applySpellErrors([e.id])}>
                          {t("article.spellcheckApply")}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => editor.commands.dismissSpellErrors([e.id])}>
                          {t("article.spell.ignore")}
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-2 border-t border-border/60 px-1.5 py-1.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={spellChecking} onClick={runSpellcheck}>
                    {t("article.spell.recheck")}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => editor.commands.dismissSpellErrors(spellErrors.map((e) => e.id))}>
                    {t("article.spell.ignoreAll")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <ReadabilityButton editor={editor} language={language} />
            <ToolbarButton
              icon={<KeyboardTwoTone className="w-4 h-4" />}
              label={t("article.shortcuts.title")}
              shortcut={`${mod}+/`}
              onClick={() => setHelpOpen(true)}
            />
          </div>
        </div>
      </TooltipProvider>

      <EditorMenus editor={editor} onEditLink={openLinkDialog} onPickImage={() => imageInputRef.current?.click()} onPickImageBeside={pickImageBeside} onInsertVideo={openVideoDialog} />

      {/* YouTube video */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <VideoTwoTone className="w-5 h-5 text-primary" />
              {t("article.videoDialog.title")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              insertVideo();
            }}
          >
            <Label htmlFor="editor-video-url">{t("article.videoDialog.url")}</Label>
            <Input
              id="editor-video-url"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setVideoError(false);
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              inputMode="url"
              autoComplete="off"
              autoFocus
              aria-invalid={videoError}
              aria-describedby="editor-video-hint"
            />
            <p id="editor-video-hint" className={videoError ? "text-xs text-destructive" : "text-xs text-muted-foreground"} aria-live="polite">
              {videoError
                ? t("article.videoDialog.invalid")
                : video
                  ? video.start
                    ? t("article.videoDialog.foundAt", { time: formatStart(video.start) })
                    : t("article.videoDialog.found")
                  : t("article.videoDialog.hint")}
            </p>
            <p className="text-xs text-muted-foreground">{t("article.videoDialog.privacy")}</p>
            <DialogFooter className="pt-2">
              <Button type="submit">{t("article.videoDialog.insert")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shortcut overview */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyboardTwoTone className="w-5 h-5 text-accent-light" aria-hidden="true" />
              {t("article.shortcuts.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{t("article.shortcuts.keys")}</h3>
              <dl className="space-y-1.5 text-sm">
                {SHORTCUTS.map((sc) => (
                  <div key={sc.key} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t(`article.shortcuts.items.${sc.key}`)}</dt>
                    <dd><kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{sc.keys.replace("{mod}", mod)}</kbd></dd>
                  </div>
                ))}
              </dl>
            </section>
            <section>
              <h3 className="mb-1 text-sm font-semibold text-foreground">{t("article.shortcuts.markdown")}</h3>
              <p className="mb-2 text-xs text-muted-foreground">{t("article.shortcuts.markdownHint")}</p>
              <dl className="space-y-1.5 text-sm">
                {MARKDOWN.map((md) => (
                  <div key={md.key} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t(`article.shortcuts.items.${md.key}`)}</dt>
                    <dd><code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground whitespace-pre">{md.typed}</code></dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link dialog (replaces window.prompt) */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkTwoTone className="w-5 h-5 text-primary" />
              {t("article.linkDialog.title")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyLink();
            }}
          >
            <Label htmlFor="editor-link-url">{t("article.linkDialog.url")}</Label>
            <Input
              id="editor-link-url"
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setLinkError(false);
              }}
              placeholder="https://"
              inputMode="url"
              autoComplete="url"
              autoFocus
              aria-invalid={linkError}
              aria-describedby={linkError ? "editor-link-error" : undefined}
            />
            {linkError && (
              <p id="editor-link-error" className="text-xs text-destructive">
                {t("article.linkDialog.invalid")}
              </p>
            )}
            <DialogFooter className="gap-2 pt-2 sm:justify-between">
              {state.link ? (
                <Button type="button" variant="ghost" className="text-destructive" onClick={removeLink}>
                  {t("article.linkDialog.remove")}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit">{t("article.linkDialog.apply")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default EditorToolbar;
