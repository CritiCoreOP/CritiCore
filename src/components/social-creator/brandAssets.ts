import criticoreFull from "@/assets/criticore-full.png";
import criticoreIti from "@/assets/criticore-iti.png";
import criticoreForums from "@/assets/criticore-forums-logo.png";
import criticorePrideFull from "@/assets/criticore-pride-full.png";
import criticorePrideHands from "@/assets/criticore-pride-hands.png";
import criticorePrideIti from "@/assets/criticore-pride-iti.png";
import tgnLogo from "@/assets/tgn-logo.png";
import tgnPlus from "@/assets/tgn-plus.png";
import imdbLogo from "@/assets/imdb-logo.png";
import tmdbLogo from "@/assets/tmdb-logo.png";
import ignLogo from "@/assets/press/ign-logo.png";
import gamestarLogo from "@/assets/press/gamestar-logo.png";
import itsanimeLogo from "@/assets/press/itsanime-logo.png";
import pcgamerLogo from "@/assets/press/pcgamer-logo.png";
import heiseLogo from "@/assets/press/heise-logo.png";
import polygonLogo from "@/assets/press/polygon-logo.png";

export interface BrandLogo {
  key: string;
  label: string;
  src: string;
  group: "CritiCore" | "TGN" | "Partner" | "Presse";
  /** logo needs dark backdrop for contrast (white logos) */
  darkBg?: boolean;
}

export const BRAND_LOGOS: BrandLogo[] = [
  { key: "criticore-full", label: "CritiCore Wortmarke", src: criticoreFull, group: "CritiCore", darkBg: true },
  { key: "criticore-iti", label: "CritiCore Icon", src: criticoreIti, group: "CritiCore", darkBg: true },
  { key: "criticore-forums", label: "CritiCore Forums", src: criticoreForums, group: "CritiCore", darkBg: true },
  { key: "criticore-pride-full", label: "CritiCore Pride", src: criticorePrideFull, group: "CritiCore", darkBg: true },
  { key: "criticore-pride-hands", label: "Pride Hands", src: criticorePrideHands, group: "CritiCore", darkBg: true },
  { key: "criticore-pride-iti", label: "Pride Icon", src: criticorePrideIti, group: "CritiCore", darkBg: true },
  { key: "tgn", label: "TGN", src: tgnLogo, group: "TGN", darkBg: true },
  { key: "tgn-plus", label: "TGN+", src: tgnPlus, group: "TGN", darkBg: true },
  { key: "tmdb", label: "TMDB", src: tmdbLogo, group: "Partner" },
  { key: "imdb", label: "IMDb", src: imdbLogo, group: "Partner" },
  { key: "ign", label: "IGN", src: ignLogo, group: "Presse", darkBg: true },
  { key: "gamestar", label: "GameStar", src: gamestarLogo, group: "Presse" },
  { key: "itsanime", label: "It's Anime", src: itsanimeLogo, group: "Presse" },
  { key: "pcgamer", label: "PC Gamer", src: pcgamerLogo, group: "Presse", darkBg: true },
  { key: "heise", label: "heise", src: heiseLogo, group: "Presse" },
  { key: "polygon", label: "Polygon", src: polygonLogo, group: "Presse" },
];

/** Brand palette derived from the website design tokens. */
export const BRAND_COLORS: { label: string; value: string }[] = [
  { label: "Primary Blue", value: "#1252c2" },
  { label: "Accent Light Blue", value: "#5c9dff" },
  { label: "Background", value: "#19171b" },
  { label: "Surface", value: "#211e25" },
  { label: "Foreground", value: "#efedf4" },
  { label: "Score High", value: "#4ab588" },
  { label: "Score Mid", value: "#d9a23f" },
  { label: "Score Low", value: "#d35a4f" },
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
];

export const BRAND_GRADIENTS: { label: string; value: string }[] = [
  { label: "Hero", value: "linear-gradient(155deg, #111318 0%, #161b24 45%, #131519 100%)" },
  { label: "Glow", value: "linear-gradient(135deg, #1252c2 0%, #5c9dff 100%)" },
  { label: "Blue Night", value: "linear-gradient(160deg, #10233f 0%, #191b1f 100%)" },
  { label: "Deep Blue", value: "linear-gradient(160deg, #123049 0%, #19171b 100%)" },
  { label: "Score", value: "linear-gradient(135deg, #4ab588 0%, #2a7a5c 100%)" },
  { label: "Pride", value: "linear-gradient(135deg, #e94560 0%, #f5a623 25%, #4ab588 50%, #2383e2 75%, #9b59b6 100%)" },
];

// Self-hosted, loaded with the (lazy) social creator only
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/jetbrains-mono/400.css";

export const BRAND_FONTS: { label: string; value: string }[] = [
  { label: "Display (Glacial)", value: "'Glacial Indifference', Inter, system-ui, sans-serif" },
  { label: "Body (Inter)", value: "Inter, system-ui, -apple-system, sans-serif" },
  { label: "Serif (DM Serif Display)", value: "'DM Serif Display', Georgia, serif" },
  { label: "Mono (JetBrains Mono)", value: "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace" },
];

/** Exact, reusable strings taken from the live website & brand. */
export const BRAND_TEXTS: { label: string; value: string }[] = [
  { label: "Name", value: "CritiCore" },
  { label: "Claim", value: "News & Reviews zu Games, Filmen & Serien" },
  { label: "Claim EN", value: "News & Reviews for Games, Movies & Series" },
  { label: "Domain", value: "criticore.cc" },
  { label: "Domain (www)", value: "www.criticore.cc" },
  { label: "Tagline", value: "Deine Plattform für ehrliche Reviews und Bewertungen." },
  { label: "X / Twitter", value: "@CritiCoretgn" },
  { label: "Instagram", value: "@criticoretgn" },
  { label: "TikTok", value: "@criticoretgn" },
  { label: "Bluesky", value: "criticore.cc" },
  { label: "Hashtag", value: "#CritiCore" },
  { label: "CTA", value: "Jetzt lesen auf criticore.cc" },
  { label: "Breaking", value: "BREAKING NEWS" },
  { label: "Review", value: "IM TEST" },
  { label: "Pride", value: "Love is Love 🏳️‍🌈" },
];
