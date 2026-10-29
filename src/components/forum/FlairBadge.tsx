interface FlairBadgeProps {
  name: string;
  color: string;
  bgColor: string;
  emoji?: string | null;
  iconUrl?: string | null;
  size?: "sm" | "md";
}

const FlairBadge = ({ name, color, bgColor, emoji, iconUrl, size = "sm" }: FlairBadgeProps) => {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  const imgSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-semibold whitespace-nowrap ${sizeClasses}`}
      style={{ color, backgroundColor: bgColor }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className={`${imgSize} object-contain rounded-sm`} loading="lazy" />
      ) : emoji ? (
        <span>{emoji}</span>
      ) : null}
      {name}
    </span>
  );
};

export default FlairBadge;
