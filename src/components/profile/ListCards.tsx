import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Link2, Lock, MoreHorizontal, Trash2 } from "lucide-react";
import { Link, useLocalePath } from "@/lib/locale-router";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteList, useListItems, useUpdateList, type CustomList } from "@/hooks/useCustomLists";
import { shareLink } from "@/lib/shareLink";
import { Poster } from "./ProfileParts";

/** A list as a card: the first four posters as its cover, owners get a menu for link, visibility and delete */
export function ListCard({ list, editable }: { list: CustomList; editable?: boolean }) {
  const { t } = useTranslation();
  const localePath = useLocalePath();
  const { data: items = [] } = useListItems(list.id);
  const updateList = useUpdateList();
  const deleteList = useDeleteList();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const covers = items.slice(0, 4);
  const href = `/listen/${list.id}`;

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-border/60 bg-card/30">
      <Link to={href} className="grid grid-cols-4 gap-px bg-border/40" tabIndex={-1} aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) =>
          covers[i] ? (
            <Poster key={covers[i].id} src={covers[i].media_poster} alt="" type={covers[i].media_type} className="rounded-none" />
          ) : (
            <div key={i} className="aspect-[2/3] bg-muted/60" />
          ),
        )}
      </Link>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <Link to={href} className="block truncate font-semibold text-foreground transition-colors hover:text-primary">
            {list.name}
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {list.is_public ? <Globe className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
            {list.is_public ? t("lists.public") : t("profile.private")}, {t("profile.entries", { count: items.length })}
          </p>
          {list.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{list.description}</p>}
        </div>
        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 shrink-0" aria-label={t("profile.listActions", { name: list.name })}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {list.is_public && (
                <DropdownMenuItem onSelect={() => shareLink(`${window.location.origin}${localePath(href)}`, list.name, t("share.copied"))}>
                  <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("profile.copyLink")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => updateList.mutate({ id: list.id, is_public: !list.is_public })}>
                {list.is_public ? <Lock className="mr-2 h-4 w-4" aria-hidden="true" /> : <Globe className="mr-2 h-4 w-4" aria-hidden="true" />}
                {list.is_public ? t("lists.makePrivate") : t("lists.makePublic")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {editable && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("lists.confirmDelete")}</AlertDialogTitle>
              <AlertDialogDescription>{t("profile.deleteListDesc", { name: list.name, count: items.length })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteList.mutate(list.id)}>
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  );
}
