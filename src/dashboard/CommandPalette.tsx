import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FileText, ListOrdered, PenLine, Palette, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/locale-router";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { visibleGroups } from "./nav";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Strg/⌘+K: every page, a few actions, and a search through articles (and users, for admins) */
export default function CommandPalette({ open, onOpenChange, isAdmin }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const term = useDebounced(query.trim().replace(/[%,()]/g, " "), 250);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useQuery({
    queryKey: ["dash", "palette", term, isAdmin],
    enabled: open && term.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const [articles, users] = await Promise.all([
        supabase.from("articles").select("id, title, slug, published").ilike("title", `%${term}%`).order("updated_at", { ascending: false }).limit(6),
        isAdmin
          ? supabase.from("profiles").select("user_id, username, display_name").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(6)
          : Promise.resolve({ data: [] as { user_id: string; username: string | null; display_name: string | null }[] }),
      ]);
      return { articles: articles.data ?? [], users: users.data ?? [] };
    },
  });

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const actions = [
    { id: "write", label: t("dash.palette.write"), icon: PenLine, path: "/news/schreiben" },
    { id: "top10", label: t("dash.palette.newTopTen"), icon: ListOrdered, path: "/dashboard/social/top10" },
    { id: "pack", label: t("dash.palette.socialPack"), icon: Palette, path: "/social-creator" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">{t("dash.palette.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("dash.palette.description")}</DialogDescription>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:gap-2.5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5">
          <CommandInput value={query} onValueChange={setQuery} placeholder={t(isAdmin ? "dash.palette.placeholderAdmin" : "dash.palette.placeholder")} />
          <CommandList className="max-h-[60dvh]">
            <CommandEmpty>{results.isFetching ? t("dash.palette.searching") : t("dash.palette.empty")}</CommandEmpty>

            <CommandGroup heading={t("dash.palette.actions")}>
              {actions.map((a) => (
                <CommandItem key={a.id} value={`action ${a.label}`} onSelect={() => go(a.path)}>
                  <a.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {a.label}
                </CommandItem>
              ))}
            </CommandGroup>

            {visibleGroups(isAdmin).map((group) => (
              <CommandGroup key={group.id} heading={t(...group.label)}>
                {group.items.map((item) => (
                  <CommandItem key={item.id} value={`${t(...item.label)} ${t(...group.label)}`} onSelect={() => go(item.path)}>
                    <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {t(...item.label)}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            {!!results.data?.articles.length && (
              <CommandGroup heading={t("dash.palette.articles")}>
                {results.data.articles.map((a) => (
                  <CommandItem key={a.id} value={`article ${a.title} ${query}`} onSelect={() => go(a.published ? `/news/${a.slug}` : `/news/schreiben?edit=${a.id}`)}>
                    <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 truncate">{a.title}</span>
                    {!a.published && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t("dash.palette.draft")}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!!results.data?.users.length && (
              <CommandGroup heading={t("dash.palette.users")}>
                {results.data.users.map((u) => (
                  <CommandItem key={u.user_id} value={`user ${u.username ?? ""} ${u.display_name ?? ""} ${query}`} onSelect={() => go(`/user/${u.user_id}`)}>
                    <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 truncate">{u.display_name || u.username}</span>
                    {u.username && <span className="ml-auto shrink-0 text-xs text-muted-foreground">@{u.username}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
