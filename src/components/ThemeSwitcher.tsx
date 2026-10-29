import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, type ThemeName } from "@/hooks/useTheme";
import { isRetroUnlocked } from "@/components/ScoreBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check as CheckTwoTone, X as CloseTwoTone, Code as CodeTwoTone, Palette as PaletteTwoTone, AlertTriangle as WarningAmberTwoTone } from "lucide-react";

const themes: { id: ThemeName; icon: string }[] = [
  { id: "classic", icon: "🌙" },
  { id: "glass", icon: "🧊" },
  { id: "md3", icon: "🎨" },
  { id: "old", icon: "💾" },
];

const ThemeSwitcher = () => {
  const { t } = useTranslation();
  const { theme, setTheme, customCSS, setCustomCSS } = useTheme();
  const [cssDialogOpen, setCssDialogOpen] = useState(false);
  const [draftCSS, setDraftCSS] = useState(customCSS);
  const [retroVisible, setRetroVisible] = useState(isRetroUnlocked);

  useEffect(() => {
    const handler = () => setRetroVisible(true);
    window.addEventListener("retro-unlocked", handler);
    return () => window.removeEventListener("retro-unlocked", handler);
  }, []);

  const visibleThemes = retroVisible ? themes : themes.filter(t => t.id !== "old");

  const openCSSDialog = () => {
    setDraftCSS(customCSS);
    setCssDialogOpen(true);
  };

  const saveCSS = () => {
    setCustomCSS(draftCSS);
    setCssDialogOpen(false);
  };

  const clearCSS = () => {
    setDraftCSS("");
    setCustomCSS("");
    setCssDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <PaletteTwoTone className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {visibleThemes.map((t_item) => (
            <DropdownMenuItem
              key={t_item.id}
              onClick={() => setTheme(t_item.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>{t_item.icon}</span>
                <span className="flex flex-col">
                  <span>{t(`themes.${t_item.id}`)}</span>
                  {t_item.id === "glass" && (
                    <span className="text-[10px] leading-tight text-amber-500 flex items-center gap-1">
                      <WarningAmberTwoTone style={{ fontSize: 11 }} />
                      {t("themes.glassWarning")}
                    </span>
                  )}
                </span>
              </span>
              {theme === t_item.id && <CheckTwoTone className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openCSSDialog} className="flex items-center gap-2 cursor-pointer">
            <CodeTwoTone className="w-4 h-4" />
            <span>{t("themes.customCSS")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={cssDialogOpen} onOpenChange={setCssDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("themes.customCSSTitle")}</DialogTitle>
            <DialogDescription>{t("themes.customCSSDesc")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={draftCSS}
            onChange={(e) => setDraftCSS(e.target.value)}
            placeholder={t("themes.customCSSPlaceholder")}
            className="min-h-[200px] font-mono text-sm"
            spellCheck={false}
          />
          <DialogFooter className="flex gap-2">
            {customCSS && (
              <Button variant="outline" onClick={clearCSS} className="flex items-center gap-1">
                <CloseTwoTone className="w-4 h-4" />
                {t("themes.clearCSS")}
              </Button>
            )}
            <Button onClick={saveCSS}>{t("themes.saveCSS")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ThemeSwitcher;
