import { useTheme } from "@/hooks/useTheme";
import { useEffect, useState } from "react";

const GUESTBOOK_MESSAGES = [
  "Cool site!! - xXDarkLord99Xx",
  "Signed ur guestbook ~*~Sarah~*~ ♥",
  "nice page dude!! check out mine!!",
  "FIRST!!!1! - h4x0r2003",
  "ur site is AWESOME!! ★★★★★",
];

const RetroObjects = () => {
  const { theme } = useTheme();
  const [counter, setCounter] = useState(13847);

  useEffect(() => {
    if (theme !== "old") return;
    const iv = setInterval(() => setCounter(c => c + Math.floor(Math.random() * 3)), 4000);
    return () => clearInterval(iv);
  }, [theme]);

  if (theme !== "old") return null;

  return (
    <>
      {/* Under Construction Banner - top */}
      <div className="retro-construction-banner">
        <span className="retro-blink">🚧</span>
        <img src="https://web.archive.org/web/20091027083817/http://www.geocities.com/SouthBeach/Cove/8826/construction.gif" alt="under construction" className="retro-construction-gif" />
        <span className="retro-marquee-text">!! UNDER CONSTRUCTION !! COME BACK SOON !!</span>
        <img src="https://web.archive.org/web/20091027083817/http://www.geocities.com/SouthBeach/Cove/8826/construction.gif" alt="under construction" className="retro-construction-gif" />
        <span className="retro-blink">🚧</span>
      </div>

      {/* Visitor Counter */}
      <div className="retro-visitor-counter">
        <span>You are visitor #</span>
        <span className="retro-counter-number">{counter.toLocaleString()}</span>
        <span>since 1997</span>
      </div>

      {/* Floating chaotic objects */}
      <div className="retro-floating-email" title="Email me!">
        ✉️ Email me!
      </div>

      <div className="retro-floating-new" title="NEW!">
        <span className="retro-blink retro-new-badge">NEW!</span>
      </div>

      <div className="retro-guestbook">
        📝 Guestbook
        <div className="retro-guestbook-entries">
          {GUESTBOOK_MESSAGES.map((m, i) => (
            <div key={i} className="retro-guestbook-entry">{m}</div>
          ))}
        </div>
      </div>

      <div className="retro-webring">
        <span>◀</span>
        <span>🌐 CritiCore WebRing 🌐</span>
        <span>▶</span>
      </div>

      {/* Scattered star/sparkle GIFs */}
      <div className="retro-sparkle retro-sparkle-1">✦</div>
      <div className="retro-sparkle retro-sparkle-2">★</div>
      <div className="retro-sparkle retro-sparkle-3">✧</div>
      <div className="retro-sparkle retro-sparkle-4">☆</div>
      <div className="retro-sparkle retro-sparkle-5">✦</div>

      {/* Marquee at bottom */}
      <div className="retro-bottom-marquee">
        <div className="retro-marquee-scroll">
          ★ Welcome to CritiCore ★ Best viewed in Netscape Navigator 4.0 ★ 800x600 resolution ★ Sign my guestbook!! ★ Last updated: 03/15/1999 ★ Made with Notepad ★ Powered by GeoCities ★ ♪ MIDI playing... ♪ ★
        </div>
      </div>

      {/* "Best viewed with" badge */}
      <div className="retro-best-viewed">
        <div>Best viewed with</div>
        <div style={{ fontSize: "10px", fontWeight: "bold" }}>Netscape Navigator 4.0</div>
        <div style={{ fontSize: "9px" }}>800 × 600 • 256 colors</div>
      </div>

      {/* Award badge */}
      <div className="retro-award">
        🏆 Cool Site Award 1999 🏆
      </div>

      {/* Hit counter style */}
      <div className="retro-midi-player">
        🎵 Now Playing: midi_song.mid
        <div className="retro-midi-controls">
          [▶] [⏸] [⏹] [⏮] [⏭]
        </div>
      </div>
    </>
  );
};

export default RetroObjects;
