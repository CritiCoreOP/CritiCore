import ScoreBadge from "./ScoreBadge";
import { useTranslation } from "react-i18next";

interface ReviewCardProps {
  title: string;
  image: string | null;
  score: number;
  category: string;
  subtitle?: string;
}

const ReviewCard = ({ title, image, score, category, subtitle }: ReviewCardProps) => {
  const { t } = useTranslation();

  return (
    <article className="media-card group relative bg-card rounded-lg overflow-hidden border border-border/40 transition-all duration-300 hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)] cursor-pointer">
      <div className="relative overflow-hidden aspect-[3/4]">
        {image ? (
          <img src={image} alt={title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground text-xs">
            {t("home.noImage")}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-primary/15 text-primary backdrop-blur-sm border border-primary/10 tracking-wide uppercase">{category}</span>
        </div>
        <div className="absolute top-2.5 right-2.5"><ScoreBadge score={score} size="sm" /></div>
      </div>
      <div className="p-3">
        <h3 className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">{title}</h3>
        {subtitle && <p className="text-muted-foreground text-[11px] mt-1 line-clamp-2">{subtitle}</p>}
      </div>
    </article>
  );
};

export default ReviewCard;
