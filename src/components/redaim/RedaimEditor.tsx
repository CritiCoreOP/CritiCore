import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useAutoSave, type RwPage } from "@/hooks/useRedaimPages";
import { useLiveSync } from "@/hooks/useLiveSync";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE } from "@/lib/compressImage";
import { applyCorrections, type SpellCorrection } from "@/components/article-editor/SpellErrors";
import RedaimSlashMenu from "./RedaimSlashMenu";
import RedaimEmojiPicker from "./RedaimEmojiPicker";
import TwemojiImg from "./TwemojiImg";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Globe, ImagePlus, X,
  Heading2, Quote, List, ListOrdered, Link as LinkIcon, SpellCheck, Check
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  page: RwPage;
  readOnly?: boolean;
  onPublish?: () => void;
  onPageUpdate?: (updates: Partial<RwPage>) => void;
}

async function uploadImage(original: File, userId: string): Promise<string | null> {
  const file = await compressImage(original, ARTICLE_IMAGE);
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("rw-images").upload(path, file);
  if (error) return null;
  // The bucket is private; create a long-lived signed URL (10 years) so the
  // embedded image keeps rendering. Signing succeeds only for callers the RLS
  // SELECT policy allows (the owner or a workspace member).
  const { data } = await supabase.storage
    .from("rw-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  return data?.signedUrl ?? null;
}

export default function RedaimEditor({ page, readOnly = false, onPublish, onPageUpdate }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(page.title);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState(page.cover_url || "");
  const [pageIcon, setPageIcon] = useState(page.icon || "📄");
  const [wordCount, setWordCount] = useState(0);
  const [spellChecking, setSpellChecking] = useState(false);
  const [corrections, setCorrections] = useState<SpellCorrection[]>([]);
  const [showSpellResults, setShowSpellResults] = useState(false);
  const save = useAutoSave(page.id);
  const titleRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Live sync via Supabase Broadcast
  const { connected, collabUsers, broadcastUpdate, onRemoteUpdate, suppressRemoteRef } = useLiveSync(page.id);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Tippe "/" für Blöcke...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: page.content && typeof page.content === "object" && (page.content as any).type
      ? page.content
      : { type: "doc", content: [{ type: "paragraph" }] },
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      save(json, title);
      broadcastUpdate(json);
      const text = editor.getText();
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    },
  });

  // Register remote update handler
  useEffect(() => {
    if (!editor) return;
    onRemoteUpdate((json: any) => {
      // Preserve cursor position
      const { from, to } = editor.state.selection;
      editor.commands.setContent(json, { emitUpdate: false });
      try {
        const docSize = editor.state.doc.content.size;
        const safeFrom = Math.min(from, docSize);
        const safeTo = Math.min(to, docSize);
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      } catch {}
    });
  }, [editor, onRemoteUpdate]);

  // Initial word count
  useEffect(() => {
    if (editor) {
      const text = editor.getText();
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    }
  }, [editor]);

  // Slash command detection
  useEffect(() => {
    if (!editor) return;
    const handler = ({ editor: e }: any) => {
      const { from } = e.state.selection;
      const textBefore = e.state.doc.textBetween(Math.max(0, from - 1), from);
      if (textBefore === "/") {
        const coords = e.view.coordsAtPos(from);
        const editorRect = e.view.dom.getBoundingClientRect();
        setSlashPos({ top: coords.bottom - editorRect.top + 4, left: coords.left - editorRect.left });
        setSlashOpen(true);
      }
    };
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor]);

  // Update title in DB
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== page.title) save(editor?.getJSON(), title);
    }, 1000);
    return () => clearTimeout(timer);
  }, [title]);

  // Sync page metadata changes
  useEffect(() => {
    setTitle(page.title);
    setCoverUrl(page.cover_url || "");
    setPageIcon(page.icon || "📄");
  }, [page.id]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const url = await uploadImage(file, user.id);
    if (url) {
      setCoverUrl(url);
      onPageUpdate?.({ cover_url: url });
      await supabase.from("rw_pages" as any).update({ cover_url: url } as any).eq("id", page.id);
    }
  };

  const handleRemoveCover = async () => {
    setCoverUrl("");
    onPageUpdate?.({ cover_url: null });
    await supabase.from("rw_pages" as any).update({ cover_url: null } as any).eq("id", page.id);
  };

  const handleInlineImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !editor) return;
    const url = await uploadImage(file, user.id);
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const handleEmojiSelect = async (emoji: string) => {
    setPageIcon(emoji);
    onPageUpdate?.({ icon: emoji });
    await supabase.from("rw_pages" as any).update({ icon: emoji } as any).eq("id", page.id);
  };

  const insertImageFromSlash = () => { imageInputRef.current?.click(); };

  const addLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL:", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const runSpellcheck = async () => {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text) { toast.info("Kein Text zum Prüfen vorhanden."); return; }
    setSpellChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("spellcheck", {
        body: { text, language: "de" },
      });
      if (error) throw error;
      const result = data?.corrections || [];
      setCorrections(result);
      setShowSpellResults(true);
      if (result.length === 0) toast.success("Keine Fehler gefunden! ✨");
    } catch (err: any) {
      console.error("Spellcheck error:", err);
      toast.error("Rechtschreibprüfung fehlgeschlagen");
    } finally {
      setSpellChecking(false);
    }
  };

  // Placed by the words around each error and changed in the document, not in the HTML string:
  // a replace on the HTML hit the first match anywhere, attributes and correct words included
  const applyCorrection = (correction: SpellCorrection) => {
    if (!editor) return;
    if (applyCorrections(editor, [correction])) {
      toast.success(`"${correction.original}" → "${correction.correction}"`);
    }
    setCorrections((prev) => prev.filter((c) => c !== correction));
  };

  const applyAllCorrections = () => {
    if (!editor || corrections.length === 0) return;
    applyCorrections(editor, corrections);
    toast.success("Alle Korrekturen angewendet");
    setCorrections([]);
    setShowSpellResults(false);
  };

  if (!editor) return null;

  return (
    <div className="redaim-editor-wrapper">
      {/* Top bar */}
      <div className="redaim-editor-topbar">
        <div className="redaim-topbar-left">
          <span className="redaim-topbar-page-info">
            <span>{pageIcon}</span> {title || "Untitled"}
          </span>
          {page.is_public && <span className="redaim-topbar-badge">Öffentlich</span>}
        </div>
        <div className="redaim-topbar-right">
          <span className="redaim-word-count">{wordCount} Wörter</span>
          {collabUsers.length > 0 && (
            <div className="redaim-presence-bar">
              {collabUsers.map((u) => (
                <div
                  key={u.userId}
                  className="redaim-presence-avatar"
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}
          {connected && (
            <span className="text-xs" style={{ color: "var(--rw-accent, #2383E2)" }} title="Live-Sync aktiv">● Live</span>
          )}
          {!readOnly && onPublish && (
            <button className="redaim-publish-btn" onClick={onPublish}>
              <Globe size={13} /> Veröffentlichen
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="redaim-editor-content">
        {coverUrl ? (
          <div className="redaim-cover" style={{ backgroundImage: `url(${coverUrl})` }}>
            {!readOnly && (
              <div className="redaim-cover-actions">
                <button onClick={() => coverInputRef.current?.click()} className="redaim-cover-action-btn">
                  <ImagePlus size={14} /> Ändern
                </button>
                <button onClick={handleRemoveCover} className="redaim-cover-action-btn">
                  <X size={14} /> Entfernen
                </button>
              </div>
            )}
          </div>
        ) : !readOnly ? (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 48px 0" }}>
            <div className="redaim-add-cover" onClick={() => coverInputRef.current?.click()}>
              <ImagePlus size={16} /> Cover hinzufügen
            </div>
          </div>
        ) : null}

        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleInlineImage} />

        <div className="redaim-editor-inner">
          <div className="redaim-page-header">
            <div className="redaim-emoji-wrapper">
              <button
                className="redaim-page-emoji"
                onClick={() => !readOnly && setEmojiOpen(!emojiOpen)}
                title="Icon ändern"
              >
                <TwemojiImg emoji={pageIcon} size={36} />
              </button>
              {emojiOpen && (
                <>
                  <div className="redaim-emoji-backdrop" onClick={() => setEmojiOpen(false)} />
                  <RedaimEmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setEmojiOpen(false)}
                    onRemove={async () => {
                      setPageIcon("📄");
                      onPageUpdate?.({ icon: "📄" });
                      await supabase.from("rw_pages" as any).update({ icon: "📄" } as any).eq("id", page.id);
                    }}
                  />
                </>
              )}
            </div>
            <input
              ref={titleRef}
              className="redaim-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              readOnly={readOnly}
            />
          </div>

          {!readOnly && (
            <div className="redaim-toolbar">
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "active" : ""} title="Fett"><Bold size={16} /></button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? "active" : ""} title="Kursiv"><Italic size={16} /></button>
              <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive("underline") ? "active" : ""} title="Unterstrichen"><UnderlineIcon size={16} /></button>
              <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive("strike") ? "active" : ""} title="Durchgestrichen"><Strikethrough size={16} /></button>
              <button onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive("code") ? "active" : ""} title="Code"><Code size={16} /></button>
              <div className="redaim-toolbar-divider" />
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? "active" : ""} title="Überschrift"><Heading2 size={16} /></button>
              <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive("blockquote") ? "active" : ""} title="Zitat"><Quote size={16} /></button>
              <div className="redaim-toolbar-divider" />
              <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? "active" : ""} title="Aufzählung"><List size={16} /></button>
              <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? "active" : ""} title="Nummerierte Liste"><ListOrdered size={16} /></button>
              <div className="redaim-toolbar-divider" />
              <button onClick={addLink} className={editor.isActive("link") ? "active" : ""} title="Link"><LinkIcon size={16} /></button>
              <button onClick={() => imageInputRef.current?.click()} title="Bild einfügen"><ImagePlus size={16} /></button>
              <div className="redaim-toolbar-divider" />
              <button onClick={runSpellcheck} className={spellChecking ? "active" : ""} title="Rechtschreibprüfung" disabled={spellChecking}>
                <SpellCheck size={16} className={spellChecking ? "animate-pulse" : ""} />
              </button>
            </div>
          )}

          <div className="redaim-editor-area" style={{ position: "relative" }}>
            <EditorContent editor={editor} className="redaim-tiptap" />
            <RedaimSlashMenu
              editor={editor}
              isOpen={slashOpen}
              onClose={() => setSlashOpen(false)}
              position={slashPos}
              onInsertImage={insertImageFromSlash}
            />
          </div>
        </div>
      </div>

      {/* Spellcheck Results Dialog */}
      <Dialog open={showSpellResults} onOpenChange={setShowSpellResults}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SpellCheck className="w-5 h-5" style={{ color: "var(--rw-accent, #2383E2)" }} />
              Rechtschreibprüfung
            </DialogTitle>
          </DialogHeader>

          {corrections.length === 0 ? (
            <div className="text-center py-8">
              <Check className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--rw-accent, #2383E2)" }} />
              <p className="font-medium">Keine Fehler gefunden!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {corrections.length} {corrections.length === 1 ? "Korrektur" : "Korrekturen"} gefunden
                </p>
                <Button size="sm" onClick={applyAllCorrections}>Alle anwenden</Button>
              </div>

              {corrections.map((c, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through text-destructive">{c.original}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium" style={{ color: "var(--rw-accent, #2383E2)" }}>{c.correction}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.reason}</p>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => applyCorrection(c)}>
                    Anwenden
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
