import { useBadgeDefinitions, useUserBadges, type BadgeDefinition, type UserBadge } from "@/hooks/useBadges";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";

interface BadgeShowcaseProps {
  userId: string;
  /** compact = small inline icons next to username */
  variant?: "full" | "compact";
  maxCompact?: number;
}

const BadgeShowcase = ({ userId, variant = "full", maxCompact = 3 }: BadgeShowcaseProps) => {
  const { t } = useTranslation();
  const { data: allDefs = [] } = useBadgeDefinitions();
  const { data: userBadges = [] } = useUserBadges(userId);

  if (variant === "compact") {
    const earned = userBadges
      .map(ub => ({ ...ub, badge: allDefs.find(d => d.id === ub.badge_id)! }))
      .filter(ub => ub.badge)
      .slice(0, maxCompact);

    if (earned.length === 0) return null;

    return (
      <span className="inline-flex items-center gap-0.5">
        {earned.map(ub => (
          <Tooltip key={ub.id}>
            <TooltipTrigger asChild>
              <span className="text-sm cursor-default" title={t(`badgeNames.${ub.badge.slug}.name`, ub.badge.name)}>{ub.badge.icon}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <strong>{t(`badgeNames.${ub.badge.slug}.name`, ub.badge.name)}</strong>
              <br />
              {t(`badgeNames.${ub.badge.slug}.desc`, ub.badge.description)}
            </TooltipContent>
          </Tooltip>
        ))}
        {userBadges.length > maxCompact && (
          <span className="text-[10px] text-muted-foreground ml-0.5">+{userBadges.length - maxCompact}</span>
        )}
      </span>
    );
  }

  // Full showcase for profile
  const earnedIds = new Set(userBadges.map(ub => ub.badge_id));
  const categories = ["activity", "collection", "karma", "special"] as const;
  const categoryLabels: Record<string, string> = {
    activity: t("badges.activity", "Aktivität"),
    collection: t("badges.collection", "Sammlung"),
    karma: t("badges.karma", "Karma"),
    special: t("badges.special", "Spezial"),
  };

  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const badges = allDefs.filter(d => d.category === cat);
        if (badges.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-foreground mb-3">{categoryLabels[cat]}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {badges.map(badge => {
                const earned = earnedIds.has(badge.id);
                const ub = userBadges.find(u => u.badge_id === badge.id);
                return (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all ${
                          earned
                            ? "bg-primary/5 border-primary/20 shadow-sm"
                            : "bg-muted/30 border-border/50 opacity-40 grayscale"
                        }`}
                      >
                        <span className="text-2xl">{badge.icon}</span>
                        <span className="text-xs font-medium text-center text-foreground leading-tight">{t(`badgeNames.${badge.slug}.name`, badge.name)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      <p className="font-semibold">{t(`badgeNames.${badge.slug}.name`, badge.name)}</p>
                      <p className="text-muted-foreground">{t(`badgeNames.${badge.slug}.desc`, badge.description)}</p>
                      {earned && ub && (
                        <p className="text-primary mt-1">{t("badges.earnedOn", "Erhalten am")} {formatDate(ub.earned_at)}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgeShowcase;
