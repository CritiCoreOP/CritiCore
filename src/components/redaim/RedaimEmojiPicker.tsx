import { useState, useRef, useEffect, useCallback } from "react";
import TwemojiImg from "./TwemojiImg";
import { Search, Shuffle } from "lucide-react";

/* ─── Emoji data ─── */
const CATEGORIES: { name: string; icon: string; emojis: string[] }[] = [
  { name: "Zuletzt", icon: "🕐", emojis: [] }, // filled dynamically
  {
    name: "People",
    icon: "😊",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","☹️","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖",
    ],
  },
  {
    name: "Natur",
    icon: "🌿",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🦂","🕷️","🕸️","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🪸","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🌸","🌺","🌻","🌹","🌷","🌼","🌱","🌿","🍀","🍁","🍂","🍃","🌴","🌵","🌾","🎋","🍄","☀️","🌈","🔥","💧","🌊","❄️","⚡","🌪️",
    ],
  },
  {
    name: "Essen",
    icon: "🍕",
    emojis: [
      "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🍆","🌶️","🥕","🧄","🧅","🥦","🥬","🌽","🍞","🥐","🥖","🧀","🥚","🍳","🥞","🧇","🍕","🍔","🍟","🌭","🍿","🧂","🥤","☕","🍵","🧃","🍺","🍷","🥂","🍰","🧁","🍩","🍪","🎂","🍫","🍬","🍭","🍮","🍯",
    ],
  },
  {
    name: "Aktivität",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🥅","⛳","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🎯","🪀","🪁","🎮","🕹️","🎰","🎲","🧩","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻","🎪","🏆","🥇","🥈","🥉","🏅","🎖️","🎗️",
    ],
  },
  {
    name: "Reisen",
    icon: "✈️",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🛴","🚲","🛵","🏍️","🚨","🚔","🚍","🚘","🚖","✈️","🛫","🛬","🛩️","🚀","🛸","🚁","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","🏠","🏡","🏘️","🏚️","🏗️","🏢","🏬","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","💒","🗼","🗽","⛪","🕌","🕍","⛩️","🏰","🏯","🗻","🏔️","⛰️","🌋","🏕️",
    ],
  },
  {
    name: "Objekte",
    icon: "💡",
    emojis: [
      "📝","📄","📃","📑","📊","📈","📉","📅","📆","📌","📍","📎","📏","📐","✂️","🖊️","🖋️","✒️","📁","📂","🗂️","🗃️","🗄️","💼","📦","📮","📬","📭","📪","📫","🏷️","💡","🔦","🕯️","🧰","🔧","🔨","⚙️","🔩","🔑","🗝️","🔒","🔓","🛡️","💎","🪄","💻","🖥️","🖨️","📱","📞","📷","📹","🎥","📺","📻","⏰","⏳","🔔","🔕",
    ],
  },
  {
    name: "Symbole",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","✅","❌","⭕","❗","❓","💯","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔶","🔷","🔸","🔹","▪️","▫️","◾","◽","⬛","⬜","🏁","🚩","🎌","🏴","🏳️","♻️","⚠️","🔰","⚜️","🔱","〽️","✳️","✴️","❇️","©️","®️","™️",
    ],
  },
  {
    name: "Flaggen",
    icon: "🏳️",
    emojis: [
      "🇩🇪","🇦🇹","🇨🇭","🇺🇸","🇬🇧","🇫🇷","🇪🇸","🇮🇹","🇯🇵","🇰🇷","🇨🇳","🇧🇷","🇷🇺","🇮🇳","🇦🇺","🇨🇦","🇲🇽","🇹🇷","🇸🇦","🇿🇦","🇳🇱","🇧🇪","🇸🇪","🇳🇴","🇩🇰","🇫🇮","🇵🇱","🇺🇦","🇹🇭","🇻🇳","🇮🇩","🇵🇭","🇲🇾","🇸🇬","🇦🇪","🇪🇬","🇳🇬","🇰🇪","🇦🇷","🇨🇱","🇨🇴","🇵🇪",
    ],
  },
];

const RECENT_KEY = "redaim-recent-emojis";
const MAX_RECENT = 24;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function addRecent(emoji: string) {
  const r = getRecent().filter((e) => e !== emoji);
  r.unshift(emoji);
  localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, MAX_RECENT)));
}



/* ─── Tabs ─── */
type PickerTab = "emoji" | "icons" | "upload";

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  onRemove?: () => void;
}

export default function RedaimEmojiPicker({ onSelect, onClose, onRemove }: Props) {
  const [tab, setTab] = useState<PickerTab>("emoji");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(1); // start at People
  const [recent, setRecent] = useState<string[]>(getRecent);
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const handleSelect = useCallback((emoji: string) => {
    addRecent(emoji);
    setRecent(getRecent());
    onSelect(emoji);
    onClose();
  }, [onSelect, onClose]);

  const randomEmoji = () => {
    const all = CATEGORIES.flatMap((c) => c.emojis);
    const rand = all[Math.floor(Math.random() * all.length)];
    handleSelect(rand);
  };

  // Build categories with recent
  const cats = CATEGORIES.map((c, i) => i === 0 ? { ...c, emojis: recent } : c);

  // Filter
  const filtered = search.trim()
    ? cats.map((c) => ({ ...c, emojis: c.emojis.filter(() => true) })) // emoji search is hard, just show all on filter
    : cats;

  // Actually filter: naive approach — search in emoji unicode codepoint names isn't possible without a map,
  // so we just filter categories that have emojis
  const showAll = search.trim().length > 0;
  const allEmojis = showAll
    ? CATEGORIES.slice(1).flatMap((c) => c.emojis)
    : null;

  return (
    <div className="redaim-emoji-picker" onClick={(e) => e.stopPropagation()}>
      {/* Header tabs */}
      <div className="redaim-emoji-header">
        <div className="redaim-emoji-header-tabs">
          <button className={`redaim-emoji-header-tab ${tab === "emoji" ? "active" : ""}`} onClick={() => setTab("emoji")}>Emoji</button>
          <button className={`redaim-emoji-header-tab ${tab === "icons" ? "active" : ""}`} onClick={() => setTab("icons")}>Icons</button>
          <button className={`redaim-emoji-header-tab ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")}>Upload</button>
        </div>
        {onRemove && (
          <button className="redaim-emoji-remove-btn" onClick={() => { onRemove(); onClose(); }}>
            Remove
          </button>
        )}
      </div>

      {tab === "emoji" && (
        <>
          {/* Search bar */}
          <div className="redaim-emoji-search">
            <Search size={14} className="redaim-emoji-search-icon" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..."
              className="redaim-emoji-search-input"
            />
            <button className="redaim-emoji-random-btn" onClick={randomEmoji} title="Zufällig">
              <Shuffle size={14} />
            </button>
            <span className="redaim-emoji-hand">👋</span>
          </div>

          {/* Grid */}
          <div className="redaim-emoji-grid-container" ref={gridRef}>
            {showAll ? (
              <>
                <div className="redaim-emoji-category-label">Ergebnisse</div>
                <div className="redaim-emoji-grid">
                  {allEmojis!.map((emoji, i) => (
                    <button key={`${emoji}-${i}`} className="redaim-emoji-btn" onClick={() => handleSelect(emoji)}>
                      <TwemojiImg emoji={emoji} size={22} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              cats.map((cat, ci) => {
                if (ci === 0 && cat.emojis.length === 0) return null;
                return (
                  <div key={cat.name}>
                    <div className="redaim-emoji-category-label">{cat.name}</div>
                    <div className="redaim-emoji-grid">
                      {cat.emojis.map((emoji, i) => (
                        <button key={`${emoji}-${i}`} className="redaim-emoji-btn" onClick={() => handleSelect(emoji)}>
                          <TwemojiImg emoji={emoji} size={22} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom category bar */}
          <div className="redaim-emoji-category-bar">
            {cats.map((cat, i) => {
              if (i === 0 && cat.emojis.length === 0) return null;
              return (
                <button
                  key={cat.name}
                  className={`redaim-emoji-cat-btn ${activeCategory === i ? "active" : ""}`}
                  onClick={() => {
                    setActiveCategory(i);
                    setSearch("");
                    // Scroll to category
                    const container = gridRef.current;
                    if (container) {
                      const labels = container.querySelectorAll(".redaim-emoji-category-label");
                      const target = labels[i === 0 ? 0 : cat.emojis.length === 0 ? 0 : i - (cats[0].emojis.length === 0 ? 1 : 0)];
                      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  title={cat.name}
                >
                  <TwemojiImg emoji={cat.icon} size={18} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === "icons" && (
        <div className="redaim-emoji-placeholder-tab">
          <p>Icons kommen bald...</p>
        </div>
      )}

      {tab === "upload" && (
        <div className="redaim-emoji-placeholder-tab">
          <p>Custom Icon Upload kommt bald...</p>
        </div>
      )}
    </div>
  );
}
