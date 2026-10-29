import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useMyLists, useCreateList, useAddToList, useRemoveFromList, useMediaInLists } from "@/hooks/useCustomLists";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { Plus as AddTwoTone, Check as CheckTwoTone, ListPlus as PlaylistAddTwoTone } from "lucide-react";

interface AddToListDialogProps {
  mediaId: string;
  mediaType: "movie" | "series" | "game";
  mediaTitle: string;
  mediaPoster?: string | null;
}

const AddToListDialog = ({ mediaId, mediaType, mediaTitle, mediaPoster }: AddToListDialogProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: lists, isLoading: listsLoading } = useMyLists();
  const { data: inLists = [] } = useMediaInLists(mediaId, mediaType);
  const createList = useCreateList();
  const addToList = useAddToList();
  const removeFromList = useRemoveFromList();

  if (!user) return null;

  const handleToggle = async (listId: string, isInList: boolean) => {
    try {
      if (isInList) {
        await removeFromList.mutateAsync({ list_id: listId, media_id: mediaId, media_type: mediaType });
        toast({ title: t("lists.removedFromList", "Aus Liste entfernt") });
      } else {
        await addToList.mutateAsync({ list_id: listId, media_id: mediaId, media_type: mediaType, media_title: mediaTitle, media_poster: mediaPoster });
        toast({ title: t("lists.addedToList", "Zur Liste hinzugefügt") });
      }
    } catch {
      toast({ title: t("lists.error", "Fehler"), variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const list = await createList.mutateAsync({ name: newListName.trim() });
      await addToList.mutateAsync({ list_id: list.id, media_id: mediaId, media_type: mediaType, media_title: mediaTitle, media_poster: mediaPoster });
      setNewListName("");
      toast({ title: t("lists.createdAndAdded", "Liste erstellt & hinzugefügt") });
    } catch {
      toast({ title: t("lists.error", "Fehler"), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PlaylistAddTwoTone className="w-4 h-4" />
          <span className="max-sm:sr-only">{t("lists.addToList", "Liste")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("lists.saveToList", "In Liste speichern")}</DialogTitle>
        </DialogHeader>

        {listsLoading ? (
          <div className="flex justify-center py-8">
            <M3LoadingIndicator size={24} />
          </div>
        ) : (
          <div className="space-y-3">
            {lists && lists.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lists.map(list => {
                  const isInList = inLists.includes(list.id);
                  return (
                    <button
                      key={list.id}
                      onClick={() => handleToggle(list.id, isInList)}
                      type="button" className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${isInList ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                        {isInList && <CheckTwoTone className="!text-[16px]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{list.name}</p>
                        {list.is_public && (
                          <p className="text-[11px] text-muted-foreground">{t("lists.public", "Öffentlich")}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">{t("lists.createNew", "Neue Liste erstellen")}</p>
              <div className="flex gap-2">
                <label className="sr-only" htmlFor="new-list-name">{t("lists.createNew")}</label><Input id="new-list-name"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder={t("lists.listNamePlaceholder", "Listenname...")}
                  className="text-sm"
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                />
                <Button size="sm" onClick={handleCreate} disabled={!newListName.trim() || creating}>
                  {creating ? <M3LoadingIndicator size={16} /> : <AddTwoTone className="!text-[18px]" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToListDialog;
