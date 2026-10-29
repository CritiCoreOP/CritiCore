import { useTranslation } from "react-i18next";
import { useEditorState, type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface Heading {
  level: number;
  text: string;
  pos: number;
}

/**
 * Headings of the article as a clickable outline in the free space left of the editor (xl and up).
 * Long reviews were hard to navigate: the only way to a section was scrolling.
 */
const EditorOutline = ({ editor }: { editor: Editor | null }) => {
  const { t } = useTranslation();
  const data = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e || e.isDestroyed) return { headings: [] as Heading[], current: -1 };
      const headings: Heading[] = [];
      e.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          headings.push({ level: node.attrs.level as number, text: node.textContent, pos });
          return false;
        }
        return node.type.name === "doc";
      });
      // The section the cursor is in: the last heading before the selection
      const head = e.state.selection.from;
      let current = -1;
      headings.forEach((h, i) => { if (h.pos <= head) current = i; });
      return { headings, current };
    },
    equalityFn: (a, b) =>
      a.current === b.current &&
      a.headings.length === b.headings.length &&
      a.headings.every((h, i) => h.pos === b.headings[i].pos && h.text === b.headings[i].text && h.level === b.headings[i].level),
  });

  if (!editor || !data || data.headings.length < 2) return null;

  const jump = (pos: number) => {
    editor.chain().focus().setTextSelection(pos + 1).run();
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    // The wrapper is fixed, not the nav: the global `nav.fixed` rule styles every fixed nav as the navbar
    <div className="fixed left-6 top-48 hidden max-h-[calc(100dvh-14rem)] w-52 overflow-y-auto xl:block 2xl:left-10 2xl:w-60">
      <nav aria-label={t("article.outline")}>
        <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">{t("article.outline")}</p>
        <ol className="space-y-0.5">
          {data.headings.map((h, i) => (
            <li key={`${h.pos}-${i}`}>
              <button
                type="button"
                onClick={() => jump(h.pos)}
                aria-current={i === data.current ? "location" : undefined}
                className={cn(
                  "block w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  h.level === 3 && "pl-5 text-[13px]",
                  i === data.current ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {h.text || t("article.outlineEmpty")}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default EditorOutline;
