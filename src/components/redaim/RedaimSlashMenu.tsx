import { useState, useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Table, Minus, ImagePlus } from "lucide-react";

interface SlashMenuItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
}

interface Props {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  onInsertImage?: () => void;
}

export default function RedaimSlashMenu({ editor, isOpen, onClose, position, onInsertImage }: Props) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const ITEMS: SlashMenuItem[] = [
    { title: "Text", description: "Normaler Textblock", icon: <Type size={18} />, command: (e) => e.chain().focus().setParagraph().run() },
    { title: "Heading 1", description: "Große Überschrift", icon: <Heading1 size={18} />, command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { title: "Heading 2", description: "Mittlere Überschrift", icon: <Heading2 size={18} />, command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { title: "Heading 3", description: "Kleine Überschrift", icon: <Heading3 size={18} />, command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { title: "Image", description: "Bild einfügen", icon: <ImagePlus size={18} />, command: () => { onInsertImage?.(); } },
    { title: "To-Do", description: "Checkliste", icon: <CheckSquare size={18} />, command: (e) => e.chain().focus().toggleTaskList().run() },
    { title: "Bullet List", description: "Aufzählung", icon: <List size={18} />, command: (e) => e.chain().focus().toggleBulletList().run() },
    { title: "Numbered List", description: "Nummerierte Liste", icon: <ListOrdered size={18} />, command: (e) => e.chain().focus().toggleOrderedList().run() },
    { title: "Quote", description: "Zitat-Block", icon: <Quote size={18} />, command: (e) => e.chain().focus().toggleBlockquote().run() },
    { title: "Code", description: "Code-Block", icon: <Code size={18} />, command: (e) => e.chain().focus().toggleCodeBlock().run() },
    { title: "Table", description: "Tabelle einfügen", icon: <Table size={18} />, command: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { title: "Divider", description: "Trennlinie", icon: <Minus size={18} />, command: (e) => e.chain().focus().setHorizontalRule().run() },
  ];

  const filtered = ITEMS.filter((i) => i.title.toLowerCase().includes(filter.toLowerCase()));

  const selectItem = useCallback((item: SlashMenuItem) => {
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: from - filter.length - 1, to: from }).run();
    item.command(editor);
    onClose();
    setFilter("");
  }, [editor, filter, onClose]);

  useEffect(() => {
    if (!isOpen) { setFilter(""); setSelectedIndex(0); return; }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); setFilter(""); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && filtered[selectedIndex]) { e.preventDefault(); selectItem(filtered[selectedIndex]); return; }
      if (e.key === "Backspace") {
        if (filter.length === 0) { onClose(); return; }
        setFilter((f) => f.slice(0, -1));
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setFilter((f) => f + e.key);
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, filter, filtered, selectedIndex, selectItem, onClose]);

  if (!isOpen || filtered.length === 0) return null;

  return (
    <div className="redaim-slash-menu" style={{ top: position.top, left: position.left }}>
      {filtered.map((item, i) => (
        <button
          key={item.title}
          className={`redaim-slash-item ${i === selectedIndex ? "active" : ""}`}
          onClick={() => selectItem(item)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="redaim-slash-icon">{item.icon}</span>
          <div>
            <div className="redaim-slash-title">{item.title}</div>
            <div className="redaim-slash-desc">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
