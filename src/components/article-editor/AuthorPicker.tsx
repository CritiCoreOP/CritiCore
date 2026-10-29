import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getDefaultAvatar } from "@/lib/defaultAvatars";
import { useTeamMembers, type TeamMember } from "@/lib/articleAuthor";

export function PersonAvatar({ userId, name, src, className }: { userId: string; name: string; src: string | null; className?: string }) {
  return (
    <Avatar className={cn("h-7 w-7", className)}>
      <AvatarImage src={src || getDefaultAvatar(userId)} alt="" className="object-cover" />
      <AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

/** Searchable list of the team (press and admins); the current author is marked, a click picks someone else */
export function AuthorPicker({ value, onPick, disabled }: { value: string | null; onPick: (member: TeamMember) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { data: team = [], isLoading } = useTeamMembers();
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? team.filter((m) => m.name.toLowerCase().includes(q) || (m.username ?? "").toLowerCase().includes(q)) : team;
  }, [team, query]);

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Inside a menu, letters would otherwise jump to menu items
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={t("article.author.search")}
          aria-label={t("article.author.search")}
          className="h-8 pl-8 text-sm"
        />
      </div>
      <ul className="grid max-h-56 gap-0.5 overflow-y-auto overscroll-contain" aria-label={t("article.author.team")}>
        {isLoading && <li className="px-2 py-3 text-xs text-muted-foreground">{t("common.loading")}</li>}
        {!isLoading && shown.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">{t("article.author.none")}</li>}
        {shown.map((m) => {
          const current = m.user_id === value;
          return (
            <li key={m.user_id}>
              <button
                type="button"
                disabled={disabled || current}
                onClick={() => onPick(m)}
                aria-current={current || undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left text-sm transition-colors disabled:cursor-default",
                  current ? "bg-primary/10" : "hover:bg-muted/60",
                )}
              >
                <PersonAvatar userId={m.user_id} name={m.name} src={m.avatar_url} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[m.username && `@${m.username}`, m.roles.includes("admin") && t("article.author.admin")].filter(Boolean).join(", ")}
                  </span>
                </span>
                {current && <Check className="h-4 w-4 shrink-0 text-primary" aria-label={t("article.author.current")} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
