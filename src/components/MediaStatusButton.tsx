import { useMediaStatus, useToggleMediaStatus } from "@/hooks/useMediaStatus";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2 as CheckCircleTwoTone, Gamepad2 as SportsEsportsTwoTone, Eye as VisibilityTwoTone } from "lucide-react";

interface Props {
  mediaId: string;
  mediaType: string;
  mediaTitle: string;
  mediaPoster?: string | null;
}

const MediaStatusButton = ({ mediaId, mediaType, mediaTitle, mediaPoster }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: status, isLoading } = useMediaStatus(mediaId, mediaType);
  const toggle = useToggleMediaStatus();

  const isGame = mediaType === "game";
  const label = isGame
    ? (status ? t("mediaStatus.played", "Gespielt") : t("mediaStatus.markPlayed", "Als gespielt markieren"))
    : (status ? t("mediaStatus.watched", "Gesehen") : t("mediaStatus.markWatched", "Als gesehen markieren"));

  const handleClick = () => {
    if (!user) {
      toast.error(t("auth.loginRequired", "Bitte melde dich an"));
      return;
    }
    toggle.mutate(
      { mediaId, mediaType, mediaTitle, mediaPoster },
      {
        onSuccess: (data) => {
          if (data) {
            toast.success(isGame
              ? t("mediaStatus.markedPlayed", "Als gespielt markiert!")
              : t("mediaStatus.markedWatched", "Als gesehen markiert!"));
          } else {
            toast.success(t("mediaStatus.removed", "Status entfernt"));
          }
        },
      }
    );
  };

  return (
    <Button
      variant={status ? "default" : "outline"}
      size="icon"
      className={`h-9 w-9 shrink-0 ${status ? "bg-primary text-primary-foreground" : ""}`}
      onClick={handleClick}
      disabled={isLoading || toggle.isPending}
      title={label}
    >
      {status ? (
        <CheckCircleTwoTone className="!text-[20px]" />
      ) : isGame ? (
        <SportsEsportsTwoTone className="!text-[20px]" />
      ) : (
        <VisibilityTwoTone className="!text-[20px]" />
      )}
    </Button>
  );
};

export default MediaStatusButton;
