import { Badge } from "@/components/ui/badge";
import tgnLogo from "@/assets/tgn-logo.png";
import ignLogo from "@/assets/press/ign-logo.png";
import gamestarLogo from "@/assets/press/gamestar-logo.png";
import itsanimeLogo from "@/assets/press/itsanime-logo.png";
import pcgamerLogo from "@/assets/press/pcgamer-logo.png";
import heiseLogo from "@/assets/press/heise-logo.png";
import polygonLogo from "@/assets/press/polygon-logo.png";

/**
 * Registry of known press outlet logos.
 * key = stored in DB `press_logo` column
 */
export const PRESS_LOGOS: Record<string, { label: string; logoUrl?: string; darkBg?: boolean }> = {
  tgn:       { label: "TGN",           logoUrl: tgnLogo, darkBg: true },
  ign:       { label: "IGN",           logoUrl: ignLogo },
  gamestar:  { label: "GameStar",      logoUrl: gamestarLogo },
  itsanime:  { label: "It's Anime",    logoUrl: itsanimeLogo },
  pcgamer:   { label: "PC Gamer",      logoUrl: pcgamerLogo, darkBg: true },
  heise:     { label: "heise",         logoUrl: heiseLogo },
  polygon:   { label: "Polygon",       logoUrl: polygonLogo },
  gameswelt: { label: "Gameswelt" },
  kotaku:    { label: "Kotaku" },
  eurogamer: { label: "Eurogamer" },
  dergamer:  { label: "DerGamer" },
  spieletipps: { label: "Spieletipps" },
  fourplayers: { label: "4Players" },
  golem:     { label: "Golem.de" },
  custom:    { label: "Presse" },
};

interface PressLogoBadgeProps {
  logoKey: string | null | undefined;
  className?: string;
}

const PressLogoBadge = ({ logoKey, className }: PressLogoBadgeProps) => {
  if (!logoKey) return null;
  const config = PRESS_LOGOS[logoKey] || PRESS_LOGOS.custom;

  const bgClass = config.darkBg
    ? "bg-zinc-900 dark:bg-zinc-900 text-white"
    : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100";

  return (
    <Badge
      className={`gap-1.5 text-xs font-bold px-2.5 py-1.5 border border-border ${bgClass} ${className ?? ""}`}
    >
      {config.logoUrl ? (
        <img src={config.logoUrl} alt={config.label} className="h-4 w-auto max-w-[80px] object-contain" />
      ) : (
        <span className="font-bold">{config.label}</span>
      )}
    </Badge>
  );
};

export default PressLogoBadge;
