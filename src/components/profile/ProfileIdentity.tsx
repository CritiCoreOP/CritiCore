import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowBigUp, CalendarDays, Camera, History, Newspaper } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import OfficialBadge from "@/components/OfficialBadge";
import PressLogoBadge from "@/components/PressLogoBadge";
import BadgeShowcase from "@/components/BadgeShowcase";
import tgnLogo from "@/assets/tgn-logo.png";
import { getDefaultAvatar } from "@/lib/defaultAvatars";
import { getLocale } from "@/lib/locale";
import { initialsOf, karmaRank } from "@/lib/profileStats";
import { formatNumber } from "./shared";

export interface IdentityProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_official: boolean;
  created_at: string;
  post_karma?: number | null;
  comment_karma?: number | null;
}

interface Props {
  profile: IdentityProfile;
  displayName: string;
  press: { verified: boolean; logo: string | null };
  staffRoles?: string[];
  pastUsernames?: { id: string; old_username: string }[];
  /** Own profile: the avatar becomes a button that opens the file picker */
  onAvatarClick?: () => void;
  avatarBusy?: boolean;
  /** Shown instead of the bio when there is none (own profile: a prompt to write one) */
  emptyBio?: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}

/**
 * Who this is: avatar, name, handle, marks, bio and the few facts that describe a member.
 * Phones get the avatar beside the name; from lg up it is a sticky column next to the content.
 */
const ProfileIdentity = ({ profile, displayName, press, staffRoles = [], pastUsernames = [], onAvatarClick, avatarBusy, emptyBio, actions, children }: Props) => {
  const { t } = useTranslation();
  const karma = (profile.post_karma ?? 0) + (profile.comment_karma ?? 0);
  const rank = karmaRank(karma);
  const since = new Intl.DateTimeFormat(getLocale(), { month: "long", year: "numeric" }).format(new Date(profile.created_at));

  const avatar = (
    <Avatar className="h-20 w-20 border border-border/60 sm:h-24 sm:w-24 lg:h-36 lg:w-36">
      <AvatarImage src={profile.avatar_url || getDefaultAvatar(profile.user_id)} alt="" className="object-cover" />
      <AvatarFallback className="bg-secondary text-2xl font-bold text-secondary-foreground lg:text-4xl">{initialsOf(displayName)}</AvatarFallback>
    </Avatar>
  );

  return (
    <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-center gap-4 lg:flex-col lg:items-start">
        {onAvatarClick ? (
          <button
            type="button"
            onClick={onAvatarClick}
            disabled={avatarBusy}
            className="group relative shrink-0 rounded-full disabled:cursor-wait"
            aria-label={t("profile.changeAvatar")}
          >
            {avatar}
            <span
              aria-hidden="true"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-transform group-hover:scale-105 lg:bottom-1.5 lg:right-1.5 lg:h-10 lg:w-10"
            >
              <Camera className={avatarBusy ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            </span>
          </button>
        ) : (
          <div className="shrink-0">{avatar}</div>
        )}

        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-bold leading-tight tracking-tight text-foreground lg:text-3xl">{displayName}</h1>
          {profile.username && <p className="mt-0.5 truncate text-muted-foreground">@{profile.username}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 empty:hidden">
        {profile.is_official && <OfficialBadge />}
        {press.verified &&
          (press.logo ? (
            <PressLogoBadge logoKey={press.logo} />
          ) : (
            <Badge className="gap-1.5 border border-primary/30 bg-secondary py-1 pl-1.5 pr-3 text-foreground">
              <img src={tgnLogo} alt="" className="h-4 w-auto" />
              {t("profile.verifiedPress")}
            </Badge>
          ))}
        <BadgeShowcase userId={profile.user_id} variant="compact" maxCompact={6} />
      </div>

      {staffRoles.length > 0 && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-accent-light">
          <Newspaper className="h-4 w-4 shrink-0" aria-hidden="true" />
          {staffRoles.join(", ")}
        </p>
      )}

      {profile.bio ? <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground/85">{profile.bio}</p> : emptyBio}

      <div className="flex flex-wrap gap-2">{actions}</div>

      <ul className="flex flex-col gap-2.5 border-t border-border/60 pt-5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("profile.memberSince", { date: since })}
        </li>
        {karma > 0 && (
          <li className="flex items-center gap-2.5" title={`${formatNumber(profile.post_karma ?? 0)} ${t("karma.post")}, ${formatNumber(profile.comment_karma ?? 0)} ${t("karma.comment")}`}>
            <ArrowBigUp className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold tabular-nums text-foreground">{formatNumber(karma)}</span> Karma
              {rank && <span className="ml-2 rounded-full border border-border/70 px-2 py-0.5 text-xs text-foreground">{t(`karma.${rank}`)}</span>}
            </span>
          </li>
        )}
        {pastUsernames.length > 0 && (
          <li className="flex items-start gap-2.5">
            <History className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">
              {t("profile.formerly", { names: pastUsernames.slice(0, 3).map((h) => `@${h.old_username}`).join(", ") })}
              {pastUsernames.length > 3 && ` +${pastUsernames.length - 3}`}
            </span>
          </li>
        )}
      </ul>

      {children}
    </aside>
  );
};

export default ProfileIdentity;
