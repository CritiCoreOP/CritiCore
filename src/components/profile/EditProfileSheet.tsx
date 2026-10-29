import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getDefaultAvatar } from "@/lib/defaultAvatars";
import { BIO_MAX, DISPLAY_NAME_MAX, USERNAME_MAX, USERNAME_MIN, daysUntilChange, initialsOf, normalizeUsername } from "@/lib/profileStats";

export interface ProfileDraft {
  displayName: string;
  username: string;
  bio: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  current: {
    display_name: string | null;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
    display_name_changed_at: string | null;
    username_changed_at: string | null;
  };
  onAvatarClick: () => void;
  avatarBusy: boolean;
  /** Resolves true when saved; the sheet closes then */
  onSave: (draft: ProfileDraft) => Promise<boolean>;
}

type NameState = "idle" | "short" | "checking" | "free" | "taken" | "same";

/** Name, handle, bio and picture in one place; cooldowns and a taken handle show before saving */
const EditProfileSheet = ({ open, onOpenChange, userId, current, onAvatarClick, avatarBusy, onSave }: Props) => {
  const { t } = useTranslation();
  const ids = { name: useId(), user: useId(), bio: useId() };
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [nameState, setNameState] = useState<NameState>("same");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayName(current.display_name ?? "");
    setUsername(current.username ?? "");
    setBio(current.bio ?? "");
    setNameState("same");
  }, [open, current.display_name, current.username, current.bio]);

  const nameCooldown = daysUntilChange(current.display_name_changed_at, 7);
  const userCooldown = daysUntilChange(current.username_changed_at, 30);

  // Availability of a new handle, checked shortly after typing stops
  useEffect(() => {
    if (!open) return;
    if (username === (current.username ?? "")) return setNameState("same");
    if (username.length < USERNAME_MIN) return setNameState(username ? "short" : "idle");
    setNameState("checking");
    let alive = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username", username).neq("user_id", userId).limit(1);
      if (alive) setNameState(data && data.length > 0 ? "taken" : "free");
    }, 400);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [username, open, current.username, userId]);

  const bioChanged = bio !== (current.bio ?? "");
  const bioTooLong = bioChanged && bio.length > BIO_MAX;
  const blocked = saving || nameState === "taken" || nameState === "checking" || nameState === "short" || bioTooLong;

  const hint: Record<NameState, { text: string; tone: string }> = {
    same: { text: t("usernameRequired.rules"), tone: "text-muted-foreground" },
    idle: { text: t("usernameRequired.rules"), tone: "text-muted-foreground" },
    short: { text: t("usernameRequired.tooShort"), tone: "text-destructive" },
    checking: { text: t("onboarding.usernameChecking"), tone: "text-muted-foreground" },
    free: { text: t("onboarding.usernameFree"), tone: "text-emerald-600 dark:text-emerald-400" },
    taken: { text: t("profile.usernameTaken"), tone: "text-destructive" },
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;
    setSaving(true);
    const ok = await onSave({ displayName: displayName.trim(), username, bio: bio.trim() });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const shownName = displayName.trim() || current.display_name || "?";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <SheetHeader className="border-b border-border/60 p-6 text-left">
            <SheetTitle className="font-display text-xl">{t("profile.editProfile")}</SheetTitle>
            <SheetDescription>{t("profile.editProfileDesc")}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-border/60">
                <AvatarImage src={current.avatar_url || getDefaultAvatar(userId)} alt="" className="object-cover" />
                <AvatarFallback>{initialsOf(shownName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <Button type="button" variant="outline" size="sm" className="gap-2 self-start" onClick={onAvatarClick} disabled={avatarBusy}>
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  {t("profile.changeAvatar")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("profile.avatarHint")}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.name}>{t("profile.displayName")}</Label>
              <Input
                id={ids.name}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={DISPLAY_NAME_MAX}
                disabled={nameCooldown > 0}
                autoComplete="nickname"
                aria-describedby={`${ids.name}-hint`}
              />
              <p id={`${ids.name}-hint`} className="text-xs text-muted-foreground">
                {nameCooldown > 0 ? t("profile.displayNameCooldown", { days: nameCooldown }) : t("profile.displayNameHint")}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.user}>{t("profile.username")}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
                  @
                </span>
                <Input
                  id={ids.user}
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  maxLength={USERNAME_MAX}
                  disabled={userCooldown > 0}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="pl-7"
                  aria-invalid={nameState === "taken" || nameState === "short"}
                  aria-describedby={`${ids.user}-hint`}
                />
              </div>
              <p id={`${ids.user}-hint`} aria-live="polite" className={cn("text-xs", userCooldown > 0 ? "text-muted-foreground" : hint[nameState].tone)}>
                {userCooldown > 0 ? t("profile.usernameCooldown", { days: userCooldown }) : hint[nameState].text}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor={ids.bio}>{t("profile.bioLabel")}</Label>
                <span className={cn("text-xs tabular-nums", bioTooLong ? "text-destructive" : "text-muted-foreground")} aria-hidden="true">
                  {bio.length} / {BIO_MAX}
                </span>
              </div>
              <Textarea
                id={ids.bio}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t("profile.bioPlaceholder")}
                rows={5}
                className="resize-none"
                aria-invalid={bioTooLong}
                aria-describedby={`${ids.bio}-hint`}
              />
              <p id={`${ids.bio}-hint`} className={cn("text-xs", bioTooLong ? "text-destructive" : "text-muted-foreground")}>
                {bioTooLong ? t("profile.bioTooLong", { max: BIO_MAX }) : t("profile.bioHint")}
              </p>
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 gap-2 border-t border-border/60 bg-background p-4 sm:space-x-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={blocked}>
              {saving ? t("common.loading") : t("profile.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EditProfileSheet;
