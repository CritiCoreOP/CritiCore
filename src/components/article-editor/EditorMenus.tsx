import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bold,
  Check,
  Columns2,
  Columns3,
  ExternalLink,
  Heading2,
  Heading3,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  Minus,
  Pencil,
  Quote,
  RemoveFormatting,
  Rows2,
  Rows3,
  SquarePlay,
  Table as TableIcon,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { spellErrorAt } from "./SpellErrors";
import { imageMenuState } from "./ArticleImage";
import { normalizeUrl } from "./utils";
import type { ImageAlign } from "./imageLayout";
import { youtubeWatchUrl, type YouTubeVideo } from "@/lib/youtube";

interface EditorMenusProps {
  editor: Editor;
  /** Opens the toolbar's link dialog (prefilled with the link at the cursor) */
  onEditLink: () => void;
  /** Opens the toolbar's image picker */
  onPickImage: () => void;
  /** Opens the image picker for a picture beside the image at this position */
  onPickImageBeside: (pos: number) => void;
  /** Opens the toolbar's YouTube dialog */
  onInsertVideo: () => void;
}

const panel = "flex items-center gap-0.5 rounded-xl border border-border/70 bg-popover/95 p-1 shadow-xl backdrop-blur-md";

function MenuButton({
  label,
  onClick,
  active,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      // Keep the editor selection: the action runs on click, so keyboard activation works as well
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg px-1.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-primary/15 text-accent-light" : danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Menus are appended to <body> and positioned against the viewport. Positioned inside the editor's
 * parent, they kept stale coordinates whenever the layout around the editor shifted, so the table
 * menu jumped several hundred pixels away from the table.
 */
const appendToBody = () => document.body;
const FLOAT = { strategy: "fixed" as const };

const Sep = () => <span className="mx-0.5 h-5 w-px bg-border/70" aria-hidden="true" />;

// Phones show their own copy/paste callout above a selection, so the menu goes below it there
const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

const isNodeSelection = (editor: Editor, name: string) => {
  const sel = editor.state.selection;
  return sel instanceof NodeSelection && sel.node.type.name === name;
};
const isImageSelection = (editor: Editor) => isNodeSelection(editor, "image");

/**
 * Menus that act on the cursor only show while the editor has the focus; otherwise any transaction
 * (autosave, the AI assistant's highlight) brought them back over the text while working elsewhere.
 * The image menu is the exception: its alt-text field takes the focus itself.
 *
 * Context menus of the article editor: formatting on a text selection, link actions inside a
 * link, alt text for a selected image, row/column actions inside a table, and block shortcuts
 * on an empty line.
 */
const SIZES = [33.3, 50, 75, 100];
const ALIGNS: { align: ImageAlign; icon: typeof AlignLeft; key: string }[] = [
  { align: "left", icon: AlignLeft, key: "alignLeft" },
  { align: "center", icon: AlignCenter, key: "alignCenter" },
  { align: "right", icon: AlignRight, key: "alignRight" },
];

const fieldClass =
  "h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const EditorMenus = ({ editor, onEditLink, onPickImage, onPickImageBeside, onInsertVideo }: EditorMenusProps) => {
  const { t } = useTranslation();

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      href: (e.getAttributes("link").href as string | undefined) || "",
      alt: isImageSelection(e) ? ((e.state.selection as NodeSelection).node.attrs.alt as string | null) || "" : "",
      creditUrl: isImageSelection(e) ? ((e.state.selection as NodeSelection).node.attrs.creditUrl as string | null) || "" : "",
      image: imageMenuState(e),
      spell: spellErrorAt(e),
      video: isNodeSelection(e, "youtubeVideo") ? ((e.state.selection as NodeSelection).node.attrs as YouTubeVideo) : null,
    }),
  });

  // Local copies so typing is not interrupted by the editor re-rendering the attribute
  const [alt, setAlt] = useState(s.alt);
  useEffect(() => setAlt(s.alt), [s.alt]);
  const [creditUrl, setCreditUrl] = useState(s.creditUrl);
  useEffect(() => setCreditUrl(s.creditUrl), [s.creditUrl]);
  const [creditUrlError, setCreditUrlError] = useState(false);

  // Alt text and credit link; an invalid link stays in the field with a hint instead of being stored
  const saveImageFields = () => {
    const raw = creditUrl.trim();
    const url = raw ? normalizeUrl(raw) : null;
    setCreditUrlError(!!raw && !url);
    editor.commands.updateAttributes("image", { alt: alt.trim() || null, ...(raw && !url ? {} : { creditUrl: url }) });
    if (url) setCreditUrl(url);
  };
  // Two fields in one form: Enter no longer submits by itself (implicit submission needs a single field)
  const saveOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    saveImageFields();
  };
  const img = s.image;

  const chain = () => editor.chain().focus();

  return (
    <>
      {/* Text selection */}
      <BubbleMenu
        editor={editor}
        pluginKey="cc-text-menu"
        appendTo={appendToBody}
        className="z-50"
        options={{ ...FLOAT, placement: isTouch ? "bottom" : "top", offset: isTouch ? 14 : 8 }}
        shouldShow={({ editor: e, view, from, to }) => e.isEditable && view.hasFocus() && from !== to && !(e.state.selection instanceof NodeSelection)}
      >
        <div className={panel} role="toolbar" aria-label={t("article.menus.selection")}>
          <MenuButton label={t("article.toolbar.bold")} active={s.bold} onClick={() => chain().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.italic")} active={s.italic} onClick={() => chain().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.link")} active={s.link} onClick={onEditLink}>
            <LinkIcon className="h-4 w-4" />
          </MenuButton>
          <Sep />
          <MenuButton label={t("article.toolbar.heading2")} active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.heading3")} active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.quote")} active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
            <Quote className="h-4 w-4" />
          </MenuButton>
          <Sep />
          <MenuButton label={t("article.menus.clearFormat")} onClick={() => chain().unsetAllMarks().clearNodes().run()}>
            <RemoveFormatting className="h-4 w-4" />
          </MenuButton>
        </div>
      </BubbleMenu>

      {/* Cursor inside a word the spellcheck underlined */}
      <BubbleMenu
        editor={editor}
        pluginKey="cc-spell-menu"
        appendTo={appendToBody}
        className="z-50"
        options={{ ...FLOAT, placement: "bottom", offset: 8 }}
        shouldShow={({ editor: e, view }) => e.isEditable && view.hasFocus() && !!spellErrorAt(e)}
      >
        <div className={cn(panel, "max-w-[min(22rem,calc(100vw-2rem))] gap-1 pl-2.5")} role="toolbar" aria-label={t("article.spell.menuLabel")}>
          {s.spell?.reason && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={s.spell.reason}>{s.spell.reason}</span>}
          <MenuButton
            label={t("article.spell.replaceWith", { correction: s.spell?.correction ?? "" })}
            onClick={() => s.spell && chain().applySpellErrors([s.spell.id]).run()}
          >
            <Check className="h-4 w-4 text-score-high" />
            <span className="font-medium text-foreground">{s.spell?.correction || t("article.spell.remove")}</span>
          </MenuButton>
          <MenuButton label={t("article.spell.ignore")} onClick={() => s.spell && chain().dismissSpellErrors([s.spell.id]).run()}>
            <X className="h-4 w-4" />
          </MenuButton>
        </div>
      </BubbleMenu>

      {/* Cursor inside a link */}
      <BubbleMenu
        editor={editor}
        pluginKey="cc-link-menu"
        appendTo={appendToBody}
        className="z-50"
        options={{ ...FLOAT, placement: "bottom", offset: 8 }}
        shouldShow={({ editor: e, view, from, to }) => e.isEditable && view.hasFocus() && from === to && e.isActive("link") && !spellErrorAt(e)}
      >
        <div className={panel} role="toolbar" aria-label={t("article.toolbar.link")}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 max-w-[16rem] items-center gap-1.5 truncate rounded-lg px-2 text-sm text-accent-light hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={t("article.menus.openLink")}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{s.href.replace(/^https?:\/\//, "")}</span>
          </a>
          <Sep />
          <MenuButton label={t("article.menus.editLink")} onClick={onEditLink}>
            <Pencil className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.linkDialog.remove")} onClick={() => chain().extendMarkRange("link").unsetLink().run()}>
            <Unlink className="h-4 w-4" />
          </MenuButton>
        </div>
      </BubbleMenu>

      {/* Selected image: size, position, side by side, alt text and the link of its credit */}
      <BubbleMenu
        editor={editor}
        pluginKey="cc-image-menu"
        appendTo={appendToBody}
        className="z-50"
        options={{ ...FLOAT, placement: "bottom", offset: 10 }}
        shouldShow={({ editor: e }) => e.isEditable && isImageSelection(e)}
      >
        {img && (
          <form
            className={cn(panel, "max-w-[min(34rem,calc(100vw-1.5rem))] flex-col items-stretch gap-1.5 p-1.5")}
            data-testid="image-menu"
            onSubmit={(e) => {
              e.preventDefault();
              saveImageFields();
            }}
          >
            <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label={t("article.menus.image")}>
              {!img.inRow && (
                <>
                  {SIZES.map((w) => (
                    <MenuButton
                      key={w}
                      label={t("article.image.widthPercent", { width: Math.round(w) })}
                      active={Math.round(img.attrs.width ?? 100) === Math.round(w)}
                      onClick={() => chain().setImageLayout({ width: w }).run()}
                    >
                      <span className="px-0.5 text-xs font-semibold tabular-nums">{Math.round(w)}%</span>
                    </MenuButton>
                  ))}
                  <Sep />
                  {ALIGNS.map(({ align, icon: Icon, key }) => (
                    <MenuButton key={align} label={t(`article.image.${key}`)} active={img.attrs.align === align} onClick={() => chain().setImageLayout({ align }).run()}>
                      <Icon className="h-4 w-4" />
                    </MenuButton>
                  ))}
                  <Sep />
                </>
              )}
              {img.canJoin && (
                <MenuButton label={t("article.image.sideBySide")} onClick={() => chain().joinImageWithNeighbour().run()}>
                  <Columns2 className="h-4 w-4" />
                </MenuButton>
              )}
              {img.rowSize < 4 && (
                <MenuButton label={t("article.image.addBeside")} onClick={() => onPickImageBeside(img.imagePos)}>
                  <ImagePlus className="h-4 w-4" />
                </MenuButton>
              )}
              {img.inRow && (
                <>
                  <MenuButton label={t("article.image.splitRow")} onClick={() => chain().splitImageRow().run()}>
                    <Rows2 className="h-4 w-4" />
                  </MenuButton>
                  {img.canLeft && (
                    <MenuButton label={t("article.image.moveLeft")} onClick={() => chain().moveImage(-1, "row").run()}>
                      <ArrowLeft className="h-4 w-4" />
                    </MenuButton>
                  )}
                  {img.canRight && (
                    <MenuButton label={t("article.image.moveRight")} onClick={() => chain().moveImage(1, "row").run()}>
                      <ArrowRight className="h-4 w-4" />
                    </MenuButton>
                  )}
                </>
              )}
              <Sep />
              {img.canUp && (
                <MenuButton label={t("article.image.moveUp")} onClick={() => chain().moveImage(-1).run()}>
                  <ArrowUp className="h-4 w-4" />
                </MenuButton>
              )}
              {img.canDown && (
                <MenuButton label={t("article.image.moveDown")} onClick={() => chain().moveImage(1).run()}>
                  <ArrowDown className="h-4 w-4" />
                </MenuButton>
              )}
              <MenuButton label={t("article.menus.removeImage")} danger onClick={() => chain().deleteSelection().run()}>
                <Trash2 className="h-4 w-4" />
              </MenuButton>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <label className="flex min-w-0 items-center gap-1.5 pl-1">
                <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{t("article.menus.altText")}</span>
                <input
                  id="cc-image-alt"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  onBlur={saveImageFields}
                  onKeyDown={saveOnEnter}
                  placeholder={t("article.menus.altPlaceholder")}
                  maxLength={250}
                  className={fieldClass}
                />
              </label>
              <label className="flex min-w-0 items-center gap-1.5 pl-1">
                <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{t("article.image.creditLink")}</span>
                <input
                  value={creditUrl}
                  onChange={(e) => {
                    setCreditUrl(e.target.value);
                    setCreditUrlError(false);
                  }}
                  onBlur={saveImageFields}
                  onKeyDown={saveOnEnter}
                  placeholder="https://"
                  inputMode="url"
                  aria-invalid={creditUrlError}
                  className={cn(fieldClass, creditUrlError && "border-destructive")}
                />
              </label>
            </div>
            {creditUrlError && <p className="px-1 text-xs text-destructive">{t("article.image.creditLinkInvalid")}</p>}
          </form>
        )}
      </BubbleMenu>

      {/* Selected YouTube video */}
      <BubbleMenu
        editor={editor}
        pluginKey="cc-video-menu"
        appendTo={appendToBody}
        className="z-50"
        options={{ ...FLOAT, placement: "bottom", offset: 10 }}
        shouldShow={({ editor: e }) => e.isEditable && isNodeSelection(e, "youtubeVideo")}
      >
        <div className={panel} role="toolbar" aria-label={t("article.menus.video")}>
          {s.video && (
            <a
              href={youtubeWatchUrl(s.video)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-accent-light hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t("article.menus.openVideo")}
            </a>
          )}
          <Sep />
          <MenuButton label={t("article.menus.removeVideo")} danger onClick={() => chain().deleteSelection().run()}>
            <Trash2 className="h-4 w-4" />
          </MenuButton>
        </div>
      </BubbleMenu>

      {/* Cursor inside a table */}
      <BubbleMenu
        editor={editor}
        pluginKey="cc-table-menu"
        appendTo={appendToBody}
        className="z-50"
        options={{ ...FLOAT, placement: "top-start", offset: 10 }}
        shouldShow={({ editor: e, view, from, to }) => e.isEditable && view.hasFocus() && from === to && e.isActive("table") && !e.isActive("link") && !spellErrorAt(e)}
      >
        <div className={panel} role="toolbar" aria-label={t("article.menus.table")}>
          <MenuButton label={t("article.menus.addRow")} onClick={() => chain().addRowAfter().run()}>
            <Rows3 className="h-4 w-4" />
            <span className="text-xs">+</span>
          </MenuButton>
          <MenuButton label={t("article.menus.addColumn")} onClick={() => chain().addColumnAfter().run()}>
            <Columns3 className="h-4 w-4" />
            <span className="text-xs">+</span>
          </MenuButton>
          <Sep />
          <MenuButton label={t("article.menus.deleteRow")} onClick={() => chain().deleteRow().run()}>
            <Rows3 className="h-4 w-4" />
            <span className="text-xs">−</span>
          </MenuButton>
          <MenuButton label={t("article.menus.deleteColumn")} onClick={() => chain().deleteColumn().run()}>
            <Columns3 className="h-4 w-4" />
            <span className="text-xs">−</span>
          </MenuButton>
          <Sep />
          <MenuButton label={t("article.menus.deleteTable")} danger onClick={() => chain().deleteTable().run()}>
            <Trash2 className="h-4 w-4" />
          </MenuButton>
        </div>
      </BubbleMenu>

      {/* Empty line: insert a block */}
      <FloatingMenu
        editor={editor}
        pluginKey="cc-block-menu"
        appendTo={appendToBody}
        className="z-50"
        options={{ ...FLOAT, placement: "right-start", offset: 12 }}
      >
        <div className={cn(panel, "bg-popover/80 shadow-md")} role="toolbar" aria-label={t("article.menus.insert")}>
          <MenuButton label={t("article.toolbar.heading2")} onClick={() => chain().setHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.bulletList")} onClick={() => chain().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.quote")} onClick={() => chain().toggleBlockquote().run()}>
            <Quote className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.note")} onClick={() => chain().toggleArticleNote().run()}>
            <Info className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.image")} onClick={onPickImage}>
            <ImageIcon className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.youtube")} onClick={onInsertVideo}>
            <SquarePlay className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.toolbar.table")} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon className="h-4 w-4" />
          </MenuButton>
          <MenuButton label={t("article.divider")} onClick={() => chain().setHorizontalRule().run()}>
            <Minus className="h-4 w-4" />
          </MenuButton>
        </div>
      </FloatingMenu>
    </>
  );
};

export default EditorMenus;
