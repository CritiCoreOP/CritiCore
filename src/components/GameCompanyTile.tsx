interface GameCompanyTileProps {
  name: string;
  logo?: string | null;
}

/**
 * Studio tile for game detail pages.
 * IGDB logos are not guaranteed to be transparent, so they are shown as-is on a
 * light chip instead of the invert trick used for TMDB logos.
 */
const GameCompanyTile = ({ name, logo }: GameCompanyTileProps) => (
  <div
    title={name}
    aria-label={name}
    className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-secondary/40 px-3 transition-all hover:border-primary/40 hover:bg-secondary/60"
  >
    {logo ? (
      <img
        src={logo}
        alt={name}
        loading="lazy"
        className="max-h-9 max-w-[110px] object-contain"
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          const fallback = img.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "block";
        }}
      />
    ) : null}
    <span
      className="text-xs font-medium text-center leading-tight line-clamp-2 text-foreground/80"
      style={{ display: logo ? "none" : "block" }}
    >
      {name}
    </span>
  </div>
);

export default GameCompanyTile;
