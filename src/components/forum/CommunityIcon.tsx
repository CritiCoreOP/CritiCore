/** Renders a community icon - either an emoji or a custom uploaded image */
const CommunityIcon = ({ icon, size = "md" }: { icon: string | null; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-5 h-5 text-sm",
    md: "w-7 h-7 text-lg",
    lg: "w-12 h-12 text-2xl",
  };

  const isUrl = icon && (icon.startsWith("http") || icon.startsWith("/"));

  if (isUrl) {
    return (
      <img
        src={icon}
        alt=""
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0`}
        loading="lazy"
      />
    );
  }

  return (
    <span className={`${sizeClasses[size]} flex items-center justify-center shrink-0`}>
      {icon || "💬"}
    </span>
  );
};

export default CommunityIcon;
