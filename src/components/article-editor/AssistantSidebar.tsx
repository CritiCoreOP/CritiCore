import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import AssistantPanel from "./AssistantPanel";
import { Sparkles as AutoAwesomeTwoTone, X as CloseTwoTone } from "lucide-react";

interface Props {
  editor: Editor | null;
  title: string;
  setTitle: (v: string) => void;
  excerpt: string;
  setExcerpt: (v: string) => void;
  language: string;
  articleType: string;
}

export default function AssistantSidebar({ editor, title, setTitle, excerpt, setExcerpt, language, articleType }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Floating toggle; the open panel has its own close button in the header */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          className="fixed right-4 bottom-24 lg:bottom-6 z-40 gap-1.5 shadow-lg rounded-full"
          aria-expanded={false}
          aria-controls="editor-assistant"
        >
          <AutoAwesomeTwoTone className="w-4 h-4" />
          <span className="hidden sm:inline">{t("editor.ai.assistant")}</span>
          <span className="sr-only sm:hidden">{t("editor.ai.assistant")}</span>
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {/* Starts below the navbar and action bar (7.5rem) so its header is never covered.
          `invisible` when closed keeps the off-screen panel out of the tab order. */}
      <aside
        id="editor-assistant"
        aria-label={t("editor.ai.assistant")}
        className={`fixed right-0 top-[7.5rem] bottom-0 z-40 w-full sm:w-[380px] bg-card border-l border-border shadow-2xl overflow-y-auto overscroll-contain transition-[transform,visibility] duration-200 ${
          open ? "translate-x-0 visible" : "translate-x-full invisible"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur">
          <AutoAwesomeTwoTone className="w-4 h-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-sm font-bold text-foreground">{t("editor.ai.assistant")}</h2>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setOpen(false)} aria-label={t("editor.ai.close")}>
            <CloseTwoTone className="w-4 h-4" />
          </Button>
        </div>
        {/* Bottom padding keeps the last actions above the mobile dock */}
        <div className="p-4 pb-28 lg:pb-6">
          <AssistantPanel
            editor={editor}
            title={title}
            setTitle={setTitle}
            excerpt={excerpt}
            setExcerpt={setExcerpt}
            language={language}
            articleType={articleType}
            active={open}
          />
        </div>
      </aside>
    </>
  );
}
