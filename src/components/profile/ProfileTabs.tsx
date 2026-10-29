import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Eye, ListVideo } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import BadgeShowcase from "@/components/BadgeShowcase";
import { formatDate } from "@/lib/locale";
import type { CustomList } from "@/hooks/useCustomLists";
import { useToggleMediaStatus, type MediaStatusEntry } from "@/hooks/useMediaStatus";
import ReviewList, { type ProfileReview } from "./ReviewList";
import { MediaTile, PagedGrid, SavedTile } from "./MediaGrid";
import { ListCard } from "./ListCards";
import FriendsPanel from "./FriendsPanel";
import { EmptyBlock, FilterChips, ProfileTab, ProfileTabList } from "./ProfileParts";
import type { OwnTab, SavedEntry } from "./shared";

type StatusFilter = "all" | "watched" | "played";


interface Props {
  tab: OwnTab;
  onTabChange: (tab: OwnTab) => void;
  userId: string;
  reviews: ProfileReview[];
  saves: SavedEntry[];
  onRemoveSave: (save: SavedEntry) => void;
  statusItems: MediaStatusEntry[];
  lists: CustomList[];
  friendCount: number;
  pendingRequests: number;
}

function StatusGrid({ items }: { items: MediaStatusEntry[] }) {
  const { t } = useTranslation();
  const toggle = useToggleMediaStatus();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const watched = items.filter((i) => i.status !== "played").length;
  const played = items.length - watched;
  const visible = filter === "all" ? items : items.filter((i) => (filter === "played" ? i.status === "played" : i.status !== "played"));

  if (items.length === 0) return <EmptyBlock icon={<Eye className="h-8 w-8" />} title={t("mediaStatus.noItems")} />;

  return (
    <div className="flex flex-col gap-5">
      {watched > 0 && played > 0 && (
        <FilterChips<StatusFilter>
          label={t("profile.filterStatus")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("explore.filters.allTypes"), count: items.length },
            { value: "watched", label: t("mediaStatus.watched"), count: watched },
            { value: "played", label: t("mediaStatus.played"), count: played },
          ]}
        />
      )}
      <PagedGrid
        key={filter}
        items={visible}
        render={(item) => (
          <MediaTile
            key={item.id}
            type={item.media_type}
            id={item.media_id}
            title={item.media_title}
            poster={item.media_poster}
            meta={t("profile.statusOn", { status: item.status === "played" ? t("mediaStatus.played") : t("mediaStatus.watched"), date: formatDate(item.created_at) })}
            removeLabel={t("mediaStatus.remove")}
            onRemove={() => toggle.mutate({ mediaId: item.media_id, mediaType: item.media_type, mediaTitle: item.media_title, mediaPoster: item.media_poster })}
          />
        )}
      />
    </div>
  );
}

/** The own profile's content: everything a member collected, each kind in its own tab */
const ProfileTabs = ({ tab, onTabChange, userId, reviews, saves, onRemoveSave, statusItems, lists, friendCount, pendingRequests }: Props) => {
  const { t } = useTranslation();

  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as OwnTab)} className="w-full">
      <ProfileTabList label={t("profile.contentLabel")}>
        <ProfileTab value="reviews" label={t("profile.reviews")} count={reviews.length} />
        <ProfileTab value="saves" label={t("profile.saved")} count={saves.length} />
        <ProfileTab value="status" label={t("profile.statusStat")} count={statusItems.length} />
        <ProfileTab value="lists" label={t("lists.listsTab")} count={lists.length} />
        <ProfileTab value="friends" label={t("social.friendsTab")} count={friendCount} highlight={pendingRequests} />
        <ProfileTab value="badges" label={t("badges.tab")} />
      </ProfileTabList>

      <TabsContent value="reviews" className="mt-6">
        <ReviewList reviews={reviews} emptyText={t("profile.noReviews")} />
      </TabsContent>

      <TabsContent value="saves" className="mt-6">
        {saves.length === 0 ? (
          <EmptyBlock icon={<Bookmark className="h-8 w-8" />} title={t("profile.noSaves")}>
            <Link to="/entdecken" className="text-sm font-medium text-primary hover:underline">
              {t("profile.discover")}
            </Link>
          </EmptyBlock>
        ) : (
          <PagedGrid items={saves} render={(s) => <SavedTile key={s.id} type={s.target_type} id={s.target_id} onRemove={() => onRemoveSave(s)} />} />
        )}
      </TabsContent>

      <TabsContent value="status" className="mt-6">
        <StatusGrid items={statusItems} />
      </TabsContent>

      <TabsContent value="lists" className="mt-6">
        {lists.length === 0 ? (
          <EmptyBlock icon={<ListVideo className="h-8 w-8" />} title={t("lists.noLists")} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} editable />
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="friends" className="mt-6">
        <FriendsPanel userId={userId} />
      </TabsContent>

      <TabsContent value="badges" className="mt-6">
        <BadgeShowcase userId={userId} variant="full" />
      </TabsContent>
    </Tabs>
  );
};

export default ProfileTabs;
