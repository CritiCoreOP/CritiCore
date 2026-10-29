import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/edge-function-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, Download, FlaskConical, Info, Loader2, Mail, Monitor, Newspaper, PanelTop, Send, Smartphone, Sparkles } from "lucide-react";
import BlockEditor from "@/components/admin/newsletter/BlockEditor";
import RichTextField from "@/components/admin/newsletter/RichTextField";
import {
  blocksForServer,
  HIGHLIGHT_HEADING,
  latestArticles,
  LATEST_HEADING,
  WEEKLY_FALLBACK,
  weeklyDigestInput,
  newArticlesBlock,
  newTextBlock,
  type Block,
} from "@/components/admin/newsletter/types";

// The issue being written survives a reload or a closed tab
const DRAFT_KEY = "criticore-newsletter-draft";
interface Draft {
  subject: string;
  preheader: string;
  intro: string;
  lang: string;
  blocks: Block[];
}
const readDraft = (): Draft | null => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    if (!d || !Array.isArray(d.blocks)) return null;
    // Sections from before 2026-10-07 had no type
    return { ...d, blocks: d.blocks.map((b: Block) => (b.type ? b : { ...b, type: "text" })) };
  } catch {
    return null;
  }
};

const LANGS = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "th", label: "ไทย" },
];

interface Subscriber {
  email: string;
  confirmed: boolean;
  subscribed: boolean;
  created_at: string;
}

type SendMode = "preview" | "test" | "send";

const AdminNewsletter = () => {
  const { toast } = useToast();
  const [initial] = useState(readDraft);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [preheader, setPreheader] = useState(initial?.preheader ?? "");
  const [intro, setIntro] = useState(initial?.intro ?? "");
  const [lang, setLang] = useState(initial?.lang ?? "de");
  const [blocks, setBlocks] = useState<Block[]>(initial?.blocks?.length ? initial.blocks : [newTextBlock()]);
  const [adding, setAdding] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [busy, setBusy] = useState<SendMode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Content that already went out to everyone; sending the identical issue again needs an edit first
  const [sentKey, setSentKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("email, confirmed, subscribed, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Abonnenten konnten nicht geladen werden", description: error.message, variant: "destructive" });
      } else {
        setSubs((data ?? []) as Subscriber[]);
      }
      setLoading(false);
    })();
  }, [toast]);

  const active = useMemo(() => subs.filter((s) => s.confirmed && s.subscribed), [subs]);
  const pending = useMemo(() => subs.filter((s) => !s.confirmed && s.subscribed).length, [subs]);
  const unsubscribed = useMemo(() => subs.filter((s) => !s.subscribed).length, [subs]);

  const content = useMemo(
    () => ({
      subject: subject.trim(),
      preheader,
      intro,
      lang,
      blocks: blocksForServer(blocks),
    }),
    [subject, preheader, intro, lang, blocks],
  );
  const contentKey = JSON.stringify(content);
  const hasContent =
    !!content.subject && (!!intro.trim() || blocks.some((b) => (b.type === "text" ? b.heading.trim() || b.body.trim() : b.articles.length > 0)));

  // Autosave of the draft; cleared after sending
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, preheader, intro, lang, blocks }));
      } catch {
        // storage full or blocked: the draft only lives in the tab
      }
    }, 500);
    return () => clearTimeout(id);
  }, [subject, preheader, intro, lang, blocks]);

  const startOver = () => {
    setSubject("");
    setPreheader("");
    setIntro("");
    setBlocks([newTextBlock()]);
    setSentKey(null);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // nothing stored
    }
  };

  const addLatest = async () => {
    setAdding(true);
    try {
      const list = await latestArticles();
      if (!list.length) {
        toast({ title: "In den letzten sieben Tagen wurde nichts veröffentlicht" });
        return;
      }
      setBlocks((prev) => [...prev, { ...newArticlesBlock(list, LATEST_HEADING[lang] ?? LATEST_HEADING.de), layout: "list" }]);
    } catch (err) {
      toast({ title: "Artikel konnten nicht geladen werden", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  // A whole issue from the week's articles: the best-looking one as a big card, the rest as a list,
  // subject, preview text and intro written by the AI from headlines and teasers
  const [drafting, setDrafting] = useState(false);
  const weeklyReview = async () => {
    const hasContent = !!(subject.trim() || intro.trim() || blocks.some((b) => (b.type === "text" ? b.body.trim() || b.heading.trim() : b.articles.length)));
    if (hasContent && !window.confirm("Den aktuellen Entwurf durch einen Wochenrückblick ersetzen?")) return;
    setDrafting(true);
    try {
      const list = await latestArticles(7, 9);
      if (!list.length) {
        toast({ title: "In den letzten sieben Tagen wurde nichts veröffentlicht" });
        return;
      }
      const fallback = WEEKLY_FALLBACK[lang] ?? WEEKLY_FALLBACK.de;
      const { data, error } = await supabase.functions.invoke("ai-editor-assist", { body: { action: "newsletter", language: lang, article: weeklyDigestInput(list) } });
      const ai = !error && data?.subject ? (data as { subject: string; preheader: string; intro: string }) : null;
      if (!ai) toast({ title: "Einleitung ohne KI erstellt", description: "Die KI war nicht erreichbar. Betreff und Einleitung bitte selbst anpassen." });
      const top = list.find((a) => a.cover_image_url) ?? list[0];
      const rest = list.filter((a) => a.id !== top.id);
      setSubject((ai?.subject ?? fallback.subject).slice(0, 120));
      setPreheader((ai?.preheader ?? "").slice(0, 160));
      setIntro((ai?.intro ?? fallback.intro).slice(0, 3000));
      setBlocks([
        { ...newArticlesBlock([top], HIGHLIGHT_HEADING[lang] ?? HIGHLIGHT_HEADING.de), layout: "card" },
        ...(rest.length ? [{ ...newArticlesBlock(rest, LATEST_HEADING[lang] ?? LATEST_HEADING.de), layout: "list" as const }] : []),
      ]);
      setSentKey(null);
    } catch (err) {
      toast({ title: "Artikel konnten nicht geladen werden", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  const moveBlock = (index: number, dir: -1 | 1) =>
    setBlocks((prev) => {
      const next = [...prev];
      [next[index], next[index + dir]] = [next[index + dir], next[index]];
      return next;
    });

  const invoke = async (mode: SendMode) => {
    const { data, error } = await supabase.functions.invoke("send-newsletter", { body: { mode, ...content } });
    if (error) throw new Error(await edgeFunctionErrorMessage(error, "Die Function send-newsletter ist nicht erreichbar"));
    return data as { html?: string; queued?: number; failed?: number };
  };

  // Server-rendered preview: exactly the mail that goes out (same layout, same escaping)
  const previewSeq = useRef(0);
  useEffect(() => {
    if (!hasContent) { setPreviewHtml(""); setPreviewError(null); return; }
    const seq = ++previewSeq.current;
    setPreviewBusy(true);
    const id = setTimeout(async () => {
      try {
        const data = await invoke("preview");
        if (seq !== previewSeq.current) return;
        setPreviewHtml(data.html ?? "");
        setPreviewError(null);
      } catch (err) {
        if (seq !== previewSeq.current) return;
        setPreviewError(err instanceof Error ? err.message : String(err));
      } finally {
        if (seq === previewSeq.current) setPreviewBusy(false);
      }
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, hasContent]);

  const run = async (mode: "test" | "send") => {
    setBusy(mode);
    try {
      const data = await invoke(mode);
      const queued = data.queued ?? 0;
      if (mode === "send") {
        setSentKey(contentKey);
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // nothing stored
        }
      }
      toast({
        title: mode === "test" ? "Testmail ist unterwegs" : `${queued} Mails in der Warteschlange`,
        description:
          mode === "test"
            ? "Sie kommt in den nächsten Sekunden an deine Konto-Adresse."
            : `Der Versand läuft im Hintergrund, etwa zwei Mails pro Sekunde.${data.failed ? ` ${data.failed} Adressen konnten nicht eingereiht werden.` : ""}`,
      });
    } catch (err) {
      toast({ title: "Versand fehlgeschlagen", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };


  const download = (name: string, fileContent: string, mime: string) => {
    const url = URL.createObjectURL(new Blob([fileContent], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = ["email,confirmed,subscribed,created_at", ...active.map((s) => `${s.email},${s.confirmed},${s.subscribed},${s.created_at}`)];
    download(`newsletter-empfaenger-${new Date().toISOString().slice(0, 10)}.csv`, rows.join("\n"), "text/csv");
    toast({ title: `${active.length} Empfänger exportiert` });
  };

  const alreadySent = sentKey === contentKey;

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" /> Newsletter
          </h1>
          <p className="text-sm text-muted-foreground">Ausgabe schreiben, als Test an dich schicken und an alle bestätigten Abonnenten senden.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Badge variant="secondary">{active.length} aktiv</Badge>
              {pending > 0 && <Badge variant="outline">{pending} unbestätigt</Badge>}
              {unsubscribed > 0 && <Badge variant="outline">{unsubscribed} abgemeldet</Badge>}
            </>
          )}
          <Button variant="outline" onClick={exportCsv} disabled={loading || active.length === 0} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p>
          Newsletter laufen über eine eigene Warteschlange nach den Login- und Benachrichtigungs-Mails und bremsen diese nicht aus.
          Jede Mail hat einen persönlichen Abmeldelink. Abgemeldete Adressen werden übersprungen. Achte auf das Tageslimit
          deines Resend-Tarifs (im kostenlosen Tarif 100 Mails pro Tag).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kopf</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                <div className="space-y-1.5">
                  <Label htmlFor="nl-subject">Betreff</Label>
                  <Input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 120))} placeholder="Die Highlights der Woche" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nl-lang">Sprache</Label>
                  <Select value={lang} onValueChange={setLang}>
                    <SelectTrigger id="nl-lang"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nl-pre">Preheader</Label>
                <Input id="nl-pre" value={preheader} onChange={(e) => setPreheader(e.target.value.slice(0, 160))} placeholder="Kurzer Vorschautext im Postfach" />
              </div>
              <RichTextField id="nl-intro" label="Einleitung" value={intro} onChange={setIntro} maxLength={3000} placeholder="Hallo zusammen …" lang={lang} />
            </CardContent>
          </Card>

          <ul className="m-0 list-none space-y-4 p-0" aria-label="Newsletter-Abschnitte">
            {blocks.map((b, i) => (
              <li key={b.id}>
                <BlockEditor
                  block={b}
                  index={i}
                  count={blocks.length}
                  lang={lang}
                  onChange={(next) => setBlocks((prev) => prev.map((x) => (x.id === b.id ? next : x)))}
                  onMove={(dir) => moveBlock(i, dir)}
                  onRemove={() => setBlocks((prev) => prev.filter((x) => x.id !== b.id))}
                />
              </li>
            ))}
          </ul>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={weeklyReview} disabled={drafting} className="gap-2">
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />} Wochenrückblick
            </Button>
            <Button variant="outline" onClick={() => setBlocks((prev) => [...prev, newTextBlock()])} disabled={blocks.length >= 12} className="gap-2">
              <PanelTop className="h-4 w-4" /> Textabschnitt
            </Button>
            <Button variant="outline" onClick={() => setBlocks((prev) => [...prev, newArticlesBlock()])} disabled={blocks.length >= 12} className="gap-2">
              <Newspaper className="h-4 w-4" /> Artikel
            </Button>
            <Button variant="outline" onClick={addLatest} disabled={blocks.length >= 12 || adding} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Neueste Artikel
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Der Entwurf wird in diesem Browser gespeichert.</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startOver}>
              Neu beginnen
            </Button>
          </div>
        </div>

        <div className="w-full space-y-4 self-start lg:sticky lg:top-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                Vorschau
                {previewBusy && hasContent && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Vorschau wird erstellt" />}
              </CardTitle>
              <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Vorschau-Breite">
                {(
                  [
                    ["desktop", "Desktop", Monitor],
                    ["mobile", "Handy", Smartphone],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <Button
                    key={value}
                    variant={previewWidth === value ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    aria-pressed={previewWidth === value}
                    onClick={() => setPreviewWidth(value)}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasContent ? (
                <div className="flex h-[560px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  Betreff und Inhalt eingeben, dann erscheint hier die Mail.
                </div>
              ) : previewError ? (
                <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  Vorschau nicht möglich: {previewError}
                </div>
              ) : (
                <iframe
                  title="Newsletter-Vorschau"
                  srcDoc={previewHtml}
                  sandbox=""
                  className={`mx-auto block h-[640px] rounded-xl border border-border bg-[#1e1f24] transition-[width] ${previewWidth === "mobile" ? "w-[390px] max-w-full" : "w-full"}`}
                />
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => run("test")} disabled={!hasContent || !!busy} className="gap-2">
                  {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                  Testmail an mich
                </Button>
                <Button onClick={() => setConfirmOpen(true)} disabled={!hasContent || !!busy || active.length === 0 || alreadySent} className="gap-2">
                  {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {alreadySent ? "Gesendet" : `An ${active.length} Abonnenten senden`}
                </Button>
                {previewHtml && (
                  <Button variant="ghost" onClick={() => download(`newsletter-${Date.now()}.html`, previewHtml, "text/html")} className="gap-2">
                    <Download className="h-4 w-4" /> HTML
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Newsletter jetzt senden?</AlertDialogTitle>
            <AlertDialogDescription>
              „{content.subject}“ geht an {active.length} bestätigte Abonnenten. Das lässt sich nicht zurückholen. Schick dir vorher eine Testmail, wenn du sie noch nicht gesehen hast.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => run("send")}>Senden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminNewsletter;
