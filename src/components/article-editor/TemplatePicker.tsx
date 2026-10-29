import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/react";
import { LayoutTemplate } from "lucide-react";

type TemplateType = "news" | "review" | "opinion";
const TYPES: TemplateType[] = ["news", "review", "opinion"];

interface Props {
  editor: Editor;
  onPick: (type: TemplateType) => void;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Shown while the article is empty: starts it with the usual structure of its type (an opening
 * paragraph, then subheadings to write under). One undo step removes it again.
 */
export default function TemplatePicker({ editor, onPick }: Props) {
  const { t } = useTranslation();

  const apply = (type: TemplateType) => {
    const sections = t(`article.templates.${type}.sections`, { returnObjects: true }) as unknown;
    const headings = Array.isArray(sections) ? (sections as string[]) : [];
    const note = type === "news" ? `<aside class="article-note"><p>${escapeHtml(t("article.templates.news.source"))}</p></aside>` : "";
    editor
      .chain()
      .focus()
      .setContent(`<p></p>${headings.map((h) => `<h2>${escapeHtml(h)}</h2><p></p>`).join("")}${note}`)
      .setTextSelection(1)
      .run();
    onPick(type);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
      <span>{t("article.templates.label")}</span>
      {TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => apply(type)}
          className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t(`article.templates.${type}.label`)}
        </button>
      ))}
    </div>
  );
}
