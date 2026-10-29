import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Check, ListVideo, UserMinus, Users, X } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFriendships, useRemoveFriend, useRespondFriendRequest } from "@/hooks/useFriendships";
import { useDeleteSharedWatchlist, useMySharedWatchlists } from "@/hooks/useSharedWatchlists";
import { getDefaultAvatar } from "@/lib/defaultAvatars";
import { formatDate } from "@/lib/locale";
import { initialsOf } from "@/lib/profileStats";
import { EmptyBlock } from "./ProfileParts";

interface MiniProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

function usePeople(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["profile-people", key],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", ids);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((p) => [p.user_id, p])) as Record<string, MiniProfile>;
    },
  });
}

function Person({ id, person, children }: { id: string; person?: MiniProfile; children?: React.ReactNode }) {
  const name = person?.display_name || person?.username || id.slice(0, 8);
  return (
    <li className="flex items-center gap-3 rounded-[12px] border border-border/60 p-3">
      <Link to={`/user/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={person?.avatar_url || getDefaultAvatar(id)} alt="" className="object-cover" />
          <AvatarFallback>{initialsOf(name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          {person?.username && <span className="block truncate text-xs text-muted-foreground">@{person.username}</span>}
        </span>
      </Link>
      {children}
    </li>
  );
}

/** Incoming requests first (they need an answer), then friends, then shared watchlists */
const FriendsPanel = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const { data: friendships = [], isLoading } = useFriendships();
  const respond = useRespondFriendRequest();
  const removeFriend = useRemoveFriend();
  const { data: watchlists = [] } = useMySharedWatchlists();
  const deleteWatchlist = useDeleteSharedWatchlist();

  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === userId);
  const friends = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => ({ friendship: f, id: f.requester_id === userId ? f.addressee_id : f.requester_id }));
  const { data: people = {} } = usePeople([...incoming.map((f) => f.requester_id), ...friends.map((f) => f.id)]);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-[12px] bg-muted/50 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {incoming.length > 0 && (
        <section aria-labelledby="friends-requests" className="flex flex-col gap-3">
          <h2 id="friends-requests" className="font-display text-lg font-bold text-foreground">
            {t("social.requests")} <span className="tabular-nums text-muted-foreground">{incoming.length}</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {incoming.map((f) => (
              <Person key={f.id} id={f.requester_id} person={people[f.requester_id]}>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" className="h-8 gap-1.5" disabled={respond.isPending} onClick={() => respond.mutate({ friendshipId: f.id, accept: true })}>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t("social.accept")}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ friendshipId: f.id, accept: false })}
                    aria-label={t("social.decline")}
                    title={t("social.decline")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Person>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="friends-list" className="flex flex-col gap-3">
        <h2 id="friends-list" className="font-display text-lg font-bold text-foreground">
          {t("social.friendsList")} <span className="tabular-nums text-muted-foreground">{friends.length}</span>
        </h2>
        {friends.length === 0 ? (
          <EmptyBlock icon={<Users className="h-8 w-8" />} title={t("social.noFriendsProfile")}>
            <Link to="/feed" className="text-sm font-medium text-primary hover:underline">
              {t("profile.toFeed")}
            </Link>
          </EmptyBlock>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {friends.map(({ friendship, id }) => (
              <Person key={id} id={id} person={people[id]}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFriend.mutate(friendship.id)}
                  aria-label={t("social.removeFriendBtn")}
                  title={t("social.removeFriendBtn")}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </Person>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="friends-watchlists" className="flex flex-col gap-3">
        <h2 id="friends-watchlists" className="font-display text-lg font-bold text-foreground">
          {t("social.sharedWatchlists")} <span className="tabular-nums text-muted-foreground">{watchlists.length}</span>
        </h2>
        {watchlists.length === 0 ? (
          <EmptyBlock icon={<ListVideo className="h-8 w-8" />} title={t("social.noSharedWatchlists")} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {watchlists.map((wl) => (
              <li key={wl.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-border/60 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{wl.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(wl.created_at)}</p>
                </div>
                {wl.created_by === userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteWatchlist.mutate(wl.id)}
                    aria-label={`${t("common.delete")}: ${wl.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default FriendsPanel;
