import { useFollowStatus, useFollowCount, useToggleFollow } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserPlus as PersonAddTwoTone, UserMinus as PersonRemoveTwoTone } from "lucide-react";

interface Props {
  targetId: string;
  targetType: string;
  targetName: string;
  targetImage?: string | null;
  showCount?: boolean;
  size?: "sm" | "default";
}

const FollowButton = ({ targetId, targetType, targetName, targetImage, showCount = false, size = "sm" }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: followRecord, isLoading } = useFollowStatus(targetId, targetType);
  const { data: count } = useFollowCount(targetId, targetType);
  const toggle = useToggleFollow();

  const isFollowing = !!followRecord;

  const handleClick = () => {
    if (!user) {
      toast.error(t("auth.loginRequired", "Bitte melde dich an"));
      return;
    }
    toggle.mutate(
      { targetId, targetType, targetName, targetImage, isFollowing },
      {
        onSuccess: () => {
          toast.success(
            isFollowing
              ? t("follow.unfollowed", { name: targetName })
              : t("follow.followed", { name: targetName })
          );
        },
      }
    );
  };

  return (
    <Button
      variant={isFollowing ? "secondary" : "outline"}
      size={size === "sm" ? "sm" : "default"}
      onClick={handleClick}
      disabled={isLoading || toggle.isPending}
      className={`gap-1.5 transition-all ${isFollowing ? "text-primary border-primary/30" : ""}`}
    >
      {isFollowing ? (
        <PersonRemoveTwoTone className="!text-[16px]" />
      ) : (
        <PersonAddTwoTone className="!text-[16px]" />
      )}
      <span className="text-xs font-medium">
        {isFollowing ? t("follow.following") : t("follow.follow")}
      </span>
      {showCount && count !== undefined && count > 0 && (
        <span className="text-[10px] opacity-60 ml-0.5">{count}</span>
      )}
    </Button>
  );
};

export default FollowButton;
