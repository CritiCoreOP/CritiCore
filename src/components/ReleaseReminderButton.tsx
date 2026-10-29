import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BellPlus, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDataOptOut } from "@/hooks/useDataOptOut";
import { formatDate } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { upcomingReleaseDay, type ReminderMediaType } from "@/lib/releaseReminder";

export type { ReminderMediaType };

/** First path segment of the detail page, German form; the mail links to the localized page */
const SECTION: Record<ReminderMediaType, string> = { game: "games", movie: "filme", series: "serien", anime: "anime" };
const LANGS = ["de", "en", "fr", "es", "th"];

interface Props {
  mediaId: string;
  mediaType: ReminderMediaType;
  title: string;
  image?: string | null;
  /** ISO date of the release; the button only shows for a known day in the future */
  releaseDate: string | null | undefined;
}

/** "Remind me": a mail on release day (function release-reminders), stored in release_subscriptions */
export default function ReleaseReminderButton({ mediaId, mediaType, title, image, releaseDate }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { guardOptOut } = useDataOptOut();
  const client = useQueryClient();
  const day = upcomingReleaseDay(releaseDate, mediaType);
  const key = ["release-reminder", user?.id, mediaType, mediaId];

  const { data: existing } = useQuery({
    queryKey: key,
    enabled: !!user && !!day,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_subscriptions")
        .select("id, release_date")
        .eq("user_id", user!.id)
        .eq("media_id", mediaId)
        .eq("media_type", mediaType)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // The day moved since the reminder was set: follow it, so the mail comes on the new day
  useEffect(() => {
    if (!existing || !day || existing.release_date === day) return;
    void supabase.from("release_subscriptions").update({ release_date: day, title, image_url: image ?? null }).eq("id", existing.id)
      .then(({ error }) => { if (!error) client.setQueryData(key, { ...existing, release_date: day }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key is derived from the same values
  }, [existing, day, title, image]);

  const toggle = useMutation({
    mutationFn: async () => {
      if (existing) {
        const { error } = await supabase.from("release_subscriptions").delete().eq("id", existing.id);
        if (error) throw error;
        return null;
      }
      const lang = LANGS.includes(i18n.language?.slice(0, 2)) ? i18n.language.slice(0, 2) : "de";
      const { data, error } = await supabase
        .from("release_subscriptions")
        .insert({
          user_id: user!.id,
          media_id: mediaId,
          media_type: mediaType,
          title: title.slice(0, 300),
          image_url: image && image.length <= 1000 ? image : null,
          path: `/${SECTION[mediaType]}/${mediaId}`,
          release_date: day,
          lang,
          notify_on: ["release"],
        })
        .select("id, release_date")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      client.setQueryData(key, row);
      if (row) toast.success(t("reminder.setTitle"), { description: t("reminder.setDesc", { date: formatDate(row.release_date!, { day: "numeric", month: "long", year: "numeric" }) }) });
      else toast(t("reminder.removed"));
    },
    onError: () => toast.error(t("reminder.error")),
  });

  if (!day) return null;

  const onClick = () => {
    if (!user) {
      toast(t("reminder.loginTitle"), { description: t("reminder.loginDesc") });
      return;
    }
    if (guardOptOut()) return;
    toggle.mutate();
  };

  const on = !!existing;
  return (
    <Button variant={on ? "default" : "outline"} size="sm" onClick={onClick} disabled={toggle.isPending} className="gap-2" title={t("reminder.hint")} aria-pressed={on}>
      {on ? <BellRing className="h-4 w-4" aria-hidden="true" /> : <BellPlus className="h-4 w-4" aria-hidden="true" />}
      <span className="max-sm:sr-only">{on ? t("reminder.on") : t("reminder.off")}</span>
    </Button>
  );
}
