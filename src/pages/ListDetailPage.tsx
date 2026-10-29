import { useParams } from "react-router-dom";
import { useListItems } from "@/hooks/useCustomLists";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import Footer from "@/components/Footer";
import type { CustomList } from "@/hooks/useCustomLists";
import { Lock as LockTwoTone, User as PersonTwoTone, ListVideo as PlaylistPlayTwoTone, Share2 as ShareTwoTone } from "lucide-react";

const useListDetail = (listId: string | undefined) =>
  useQuery({
    queryKey: ["list-detail", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_lists")
        .select("*")
        .eq("id", listId!)
        .single();
      if (error) throw error;
      return data as unknown as CustomList;
    },
    enabled: !!listId,
  });

const useListOwnerProfile = (userId: string | undefined) =>
  useQuery({
    queryKey: ["list-owner", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("user_id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

const ListDetailPage = () => {
  const { listId } = useParams<{ listId: string }>();
  const { t } = useTranslation();
  const { data: list, isLoading, error } = useListDetail(listId);
  const { data: items = [] } = useListItems(listId);
  const { data: owner } = useListOwnerProfile(list?.user_id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <M3LoadingIndicator size={48} />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <LockTwoTone className="!text-[48px] text-muted-foreground" />
        <p className="text-muted-foreground">{t("lists.notFoundOrPrivate", "Liste nicht gefunden oder privat.")}</p>
      </div>
    );
  }

  const mediaPath = (type: string, id: string) =>
    `/${type === "movie" ? "filme" : type === "series" ? "serien" : "games"}/${id}`;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <PlaylistPlayTwoTone className="!text-[28px] text-primary" />
              <h1 className="text-2xl font-bold text-foreground truncate">{list.name}</h1>
            </div>
            {list.description && (
              <p className="text-muted-foreground text-sm mb-2">{list.description}</p>
            )}
            {owner && (
              <Link to={`/user/${list.user_id}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <PersonTwoTone className="!text-[14px]" />
                {owner.display_name || owner.username || "User"}
              </Link>
            )}
          </div>
          <button
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: list.name, url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url);
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/10 hover:bg-primary/20 transition-all duration-200 backdrop-blur-sm shrink-0"
          >
            <ShareTwoTone className="w-4 h-4" />
            <span className="hidden sm:inline">{t("share.label", "Teilen")}</span>
          </button>
        </div>

        <Badge variant="secondary" className="mb-6">
          {items.length} {t("lists.items", "Einträge")}
        </Badge>

        {/* Items */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <Link key={item.id} to={mediaPath(item.media_type, item.media_id)}>
              <Card className="hover:ring-1 hover:ring-primary/30 transition-all">
                <CardContent className="py-3 flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{idx + 1}</span>
                  {item.media_poster ? (
                    <img src={item.media_poster} alt={item.media_title} className="w-10 h-14 rounded object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-10 h-14 rounded bg-muted shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{item.media_title}</p>
                    <Badge variant="outline" className="text-[10px] uppercase mt-0.5">{item.media_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-12">{t("lists.emptyList", "Diese Liste ist noch leer.")}</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ListDetailPage;
