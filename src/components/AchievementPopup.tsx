import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUnseenBadges, useMarkBadgesSeen, useBadgeDefinitions, useCheckBadges } from "@/hooks/useBadges";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const AchievementPopup = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: unseenBadges = [] } = useUnseenBadges();
  // Only needed once a badge is to be shown: the popup is on every page, for guests and crawlers too,
  // and loading the definitions everywhere was the most frequent request of the whole site
  const { data: allDefs = [] } = useBadgeDefinitions(unseenBadges.length > 0);
  const markSeen = useMarkBadgesSeen();
  const checkBadges = useCheckBadges();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [open, setOpen] = useState(false);

  // Check badges on mount / when user changes
  useEffect(() => {
    if (user) {
      checkBadges.mutate();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show popup when unseen badges arrive
  useEffect(() => {
    if (unseenBadges.length > 0) {
      setCurrentIdx(0);
      setOpen(true);
    }
  }, [unseenBadges.length]);

  if (!open || unseenBadges.length === 0) return null;

  const current = unseenBadges[currentIdx];
  const badge = allDefs.find(d => d.id === current?.badge_id);

  if (!badge) return null;

  const handleNext = () => {
    // Mark current as seen
    markSeen.mutate([current.badge_id]);

    if (currentIdx < unseenBadges.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={val => { if (!val) { markSeen.mutate(unseenBadges.map(b => b.badge_id)); setOpen(false); } }}>
      <DialogContent className="max-w-xs text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Achievement glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <span className="relative text-6xl drop-shadow-lg">{badge.icon}</span>
          </div>

          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">
              {t("badges.unlocked", "Achievement freigeschaltet!")}
            </p>
            <h2 className="text-xl font-bold text-foreground">{t(`badgeNames.${badge.slug}.name`, badge.name)}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t(`badgeNames.${badge.slug}.desc`, badge.description)}</p>
          </div>

          {unseenBadges.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {currentIdx + 1} / {unseenBadges.length}
            </p>
          )}

          <Button onClick={handleNext} className="w-full">
            {currentIdx < unseenBadges.length - 1
              ? t("badges.next", "Nächstes Badge")
              : t("badges.awesome", "Super!")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementPopup;
