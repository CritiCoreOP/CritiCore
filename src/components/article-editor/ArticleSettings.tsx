import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import tgnPlusIcon from "@/assets/tgn-plus.png";
import ArticleMediaLinker from "./ArticleMediaLinker";
import { AuthorPicker, PersonAvatar } from "./AuthorPicker";
import { useAuthorProfile, type TeamMember } from "@/lib/articleAuthor";
import { Settings as SettingsTwoTone, Languages as TranslateTwoTone } from "lucide-react";

const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "th", label: "ไทย" },
];

interface ArticleSettingsProps {
  excerpt: string;
  setExcerpt: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  articleType: string;
  setArticleType: (v: string) => void;
  tgnPlus: boolean;
  setTgnPlus: (v: boolean) => void;
  language: string;
  setLanguage: (v: string) => void;
  onClearDraft: () => void;
  onTranslate: (targetLang: string) => Promise<void>;
  articleId?: string | null;
  userId?: string;
  /** Admins see who wrote the article and can hand it to someone else from the team */
  isAdmin?: boolean;
  authorId?: string | null;
  onAuthorChange?: (member: TeamMember) => Promise<void>;
  /** Set for published articles only: what was corrected, shown with the date under the article */
  correctionNote?: string;
  setCorrectionNote?: (v: string) => void;
  /** Live blog switch; undefined hides it (database without the column) */
  liveStatus?: "live" | "ended" | null;
  setLiveStatus?: (v: "live" | "ended" | null) => void;
}

function AuthorSection({ authorId, onChange }: { authorId: string | null; onChange: (member: TeamMember) => Promise<void> }) {
  const { t } = useTranslation();
  const { data: author } = useAuthorProfile(authorId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{t("article.author.label")}</Label>
      <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 px-3 py-2">
        {authorId && <PersonAvatar userId={authorId} name={author?.name ?? "?"} src={author?.avatar_url ?? null} className="h-8 w-8" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{author?.name ?? t("common.loading")}</span>
          {author?.username && <span className="block truncate text-xs text-muted-foreground">@{author.username}</span>}
        </span>
        <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {t("article.author.change")}
        </Button>
      </div>
      {open && (
        <>
          <p className="text-xs text-muted-foreground">{t("article.author.hint")}</p>
          <AuthorPicker
            value={authorId}
            disabled={busy}
            onPick={async (m) => {
              setBusy(true);
              try {
                await onChange(m);
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

const ArticleSettings = ({
  excerpt,
  setExcerpt,
  category,
  setCategory,
  articleType,
  setArticleType,
  tgnPlus,
  setTgnPlus,
  language,
  setLanguage,
  onClearDraft,
  onTranslate,
  articleId,
  userId,
  isAdmin,
  authorId,
  onAuthorChange,
  correctionNote,
  setCorrectionNote,
  liveStatus,
  setLiveStatus,
}: ArticleSettingsProps) => {
  const [translating, setTranslating] = useState(false);
  const { t } = useTranslation();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title={t("article.settings")}>
          <SettingsTwoTone className="w-4 h-4" />
          <span className="sr-only">{t("article.settings")}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        avoidCollisions={false}
        className="w-[min(92vw,24rem)] max-h-[min(80vh,40rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-popover/95 p-0 shadow-xl backdrop-blur-xl"
      >
        <div className="px-4 py-3 sticky top-0 z-10 bg-popover/95 backdrop-blur-xl">
          <DropdownMenuLabel className="px-0 text-sm font-semibold text-foreground">
            {t("article.settings")}
          </DropdownMenuLabel>
        </div>

        <DropdownMenuSeparator className="mx-0 bg-border/60" />

        <div>
          <div className="space-y-5 px-4 py-4">
            {isAdmin && articleId && onAuthorChange && (
              <>
                <AuthorSection authorId={authorId ?? null} onChange={onAuthorChange} />
                <DropdownMenuSeparator className="mx-0 bg-border/60" />
              </>
            )}

            <div className="space-y-2">
              <Label>{t("article.excerptLabel")}</Label>
              <Textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder={t("article.excerptPlaceholder")}
                className="resize-none"
                rows={3}
              />
            </div>

            {correctionNote !== undefined && setCorrectionNote && (
              <div className="space-y-2">
                <Label htmlFor="article-correction">{t("article.correctionLabel")}</Label>
                <Textarea
                  id="article-correction"
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  placeholder={t("article.correctionPlaceholder")}
                  className="resize-none"
                  maxLength={1000}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{t("article.correctionHint")}</p>
              </div>
            )}

            <DropdownMenuSeparator className="mx-0 bg-border/60" />

            <div className="space-y-2">
              <Label>{t("article.categoryLabel")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("news.general")}</SelectItem>
                  <SelectItem value="games">{t("news.games")}</SelectItem>
                  <SelectItem value="movies">{t("news.movies")}</SelectItem>
                  <SelectItem value="series">{t("news.series")}</SelectItem>
                  <SelectItem value="patchnotes">{t("news.patchnotes")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("article.typeLabel")}</Label>
              <Select value={articleType} onValueChange={setArticleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">{t("news.typeNews")}</SelectItem>
                  <SelectItem value="review">{t("news.typeReview")}</SelectItem>
                  <SelectItem value="opinion">{t("news.typeOpinion")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {liveStatus !== undefined && setLiveStatus && (
              <div className="space-y-2">
                <Label>{t("live.settingLabel")}</Label>
                <Select value={liveStatus ?? "none"} onValueChange={(v) => setLiveStatus(v === "none" ? null : (v as "live" | "ended"))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("live.settingNone")}</SelectItem>
                    <SelectItem value="live">{t("live.settingLive")}</SelectItem>
                    <SelectItem value="ended">{t("live.settingEnded")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("live.settingHint")}</p>
              </div>
            )}

            <DropdownMenuSeparator className="mx-0 bg-border/60" />

            <div className="space-y-2">
              <Label>{t("article.languageLabel")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("article.translateLabel")}</Label>
              <p className="text-xs text-muted-foreground">{t("article.translateDesc")}</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.filter((item) => item.code !== language).map((item) => (
                  <Button
                    key={item.code}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={translating}
                    onClick={async () => {
                      setTranslating(true);
                      try {
                        await onTranslate(item.code);
                      } finally {
                        setTranslating(false);
                      }
                    }}
                  >
                    <TranslateTwoTone className="w-3.5 h-3.5" />
                    {item.label}
                  </Button>
                ))}
              </div>
              {translating && <p className="text-xs text-primary animate-pulse">{t("article.translating")}</p>}
            </div>

            <DropdownMenuSeparator className="mx-0 bg-border/60" />

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-3">
              <div className="flex items-center gap-2">
                <img src={tgnPlusIcon} alt="TGN+" className="h-6 w-6 rounded" />
                <Label>TGN+</Label>
              </div>
              <Switch checked={tgnPlus} onCheckedChange={setTgnPlus} />
            </div>

            <DropdownMenuSeparator className="mx-0 bg-border/60" />

            <ArticleMediaLinker articleId={articleId || null} userId={userId} />

            <DropdownMenuSeparator className="mx-0 bg-border/60" />

            <Button variant="outline" size="sm" className="w-full text-destructive" onClick={onClearDraft}>
              {t("article.clearDraft")}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ArticleSettings;
