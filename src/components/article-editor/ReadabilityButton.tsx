import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpenCheck } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import { analyzeReadability, LONG_SENTENCE, type HintKind, type ReadabilityHint, type ReadabilityReport } from "./readability";

interface Props {
  editor: Editor;
  /** Language of the article; filler and phrase lists depend on it */
  language: string;
}

const chip = "rounded-full border border-border/60 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Readability check in the toolbar: numbers, long sentences, filler words and stock phrases */
export default function ReadabilityButton({ editor, language }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<ReadabilityReport | null>(null);

  const run = () => {
    const result = analyzeReadability(editor.state.doc, language);
    setReport(result);
    editor.commands.setReadabilityHints(result.hints);
    setOpen(true);
  };

  const clear = () => {
    editor.commands.setReadabilityHints([]);
    setReport(null);
    setOpen(false);
  };

  const jump = (hint: ReadabilityHint) => {
    editor.chain().focus().setTextSelection({ from: hint.from, to: hint.to }).scrollIntoView().run();
    setOpen(false);
  };

  // The same word several times: one chip, each click goes to the next place after the cursor
  const grouped = (kind: HintKind) => {
    const map = new Map<string, ReadabilityHint[]>();
    for (const h of report?.hints ?? []) if (h.kind === kind) map.set(h.text.toLowerCase(), [...(map.get(h.text.toLowerCase()) ?? []), h]);
    return [...map.values()];
  };
  const jumpNext = (list: ReadabilityHint[]) => jump(list.find((h) => h.from > editor.state.selection.to) ?? list[0]);

  const long = report?.hints.filter((h) => h.kind === "long") ?? [];
  const fillers = grouped("filler");
  const cliches = grouped("cliche");
  const rating = !report?.sentences ? null : report.average <= 15 ? "easy" : report.average <= 20 ? "ok" : "hard";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span className="inline-flex shrink-0">
          <ToolbarButton
            icon={<BookOpenCheck className="h-4 w-4" />}
            label={t("article.readability.title")}
            active={open}
            badge={report?.hints.length || undefined}
            onClick={() => (open ? setOpen(false) : run())}
          />
        </span>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-80 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        {report && (
          <>
            <div className="border-b border-border/60 px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">{t("article.readability.title")}</p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col-reverse">
                  <dt className="text-[11px] text-muted-foreground">{t("article.readability.words")}</dt>
                  <dd className="font-display text-lg font-bold tabular-nums text-foreground">{report.words}</dd>
                </div>
                <div className="flex flex-col-reverse">
                  <dt className="text-[11px] text-muted-foreground">{t("article.readability.sentences")}</dt>
                  <dd className="font-display text-lg font-bold tabular-nums text-foreground">{report.sentenceCheck ? report.sentences : "-"}</dd>
                </div>
                <div className="flex flex-col-reverse">
                  <dt className="text-[11px] text-muted-foreground">{t("article.readability.average")}</dt>
                  <dd className="font-display text-lg font-bold tabular-nums text-foreground">{report.sentenceCheck ? report.average.toLocaleString() : "-"}</dd>
                </div>
              </dl>
              {rating && report.sentenceCheck && (
                <p className={cn("mt-2 text-xs", rating === "hard" ? "text-amber-400" : "text-muted-foreground")}>{t(`article.readability.rating.${rating}`)}</p>
              )}
              {!report.sentenceCheck && <p className="mt-2 text-xs text-muted-foreground">{t("article.readability.noSentenceCheck")}</p>}
            </div>

            <div className="max-h-80 space-y-4 overflow-y-auto px-3 py-3">
              {report.hints.length === 0 && <p className="text-sm text-muted-foreground">{t("article.readability.clean")}</p>}

              {long.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-foreground">{t("article.readability.long", { count: long.length })}</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t("article.readability.longHint", { limit: LONG_SENTENCE })}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {long.slice(0, 6).map((h) => (
                      <li key={h.id}>
                        <button type="button" onClick={() => jump(h)} className="w-full rounded px-1.5 py-1 text-left text-xs text-foreground/90 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {t("article.readability.sentenceStart", { text: h.text })}
                          <span className="ml-1 tabular-nums text-amber-400">{t("article.readability.wordsShort", { count: h.words })}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {long.length > 6 && <p className="mt-1 px-1.5 text-[11px] text-muted-foreground">{t("redaktion.dash.pipeline.more", { count: long.length - 6 })}</p>}
                </section>
              )}

              {[
                ["filler", fillers],
                ["cliche", cliches],
              ].map(([kind, groups]) =>
                (groups as ReadabilityHint[][]).length ? (
                  <section key={kind as string}>
                    <h3 className="text-xs font-semibold text-foreground">{t(`article.readability.${kind}`)}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{t(`article.readability.${kind}Hint`)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(groups as ReadabilityHint[][]).map((list) => (
                        <button key={list[0].text.toLowerCase()} type="button" onClick={() => jumpNext(list)} className={chip}>
                          {list[0].text}
                          {list.length > 1 && <span className="ml-1 text-muted-foreground">×{list.length}</span>}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null,
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 px-1.5 py-1.5">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={run}>
                {t("article.spell.recheck")}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clear}>
                {t("article.readability.hide")}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
