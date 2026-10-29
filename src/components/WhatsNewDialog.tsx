import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  X as CloseIcon,
  Sparkles,
  Compass,
  LayoutGrid,
  Palette,
  Search,
  PenLine,
  PartyPopper,
} from "lucide-react";

const CHANGELOG_VERSION = "2026-08-01";
/** Accounts created after this date are "new" and see onboarding instead. */
const RELEASE_DATE = new Date("2026-07-20T00:00:00Z");

interface ChangeItem {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  tag: "new" | "improved";
}

const changes: ChangeItem[] = [
  { icon: <Sparkles className="w-5 h-5" />, titleKey: "whatsNew.anime", descKey: "whatsNew.animeDesc", tag: "new" },
  { icon: <Compass className="w-5 h-5" />, titleKey: "whatsNew.explore", descKey: "whatsNew.exploreDesc", tag: "improved" },
  { icon: <LayoutGrid className="w-5 h-5" />, titleKey: "whatsNew.mobile", descKey: "whatsNew.mobileDesc", tag: "improved" },
  { icon: <Search className="w-5 h-5" />, titleKey: "whatsNew.search", descKey: "whatsNew.searchDesc", tag: "new" },
  { icon: <Palette className="w-5 h-5" />, titleKey: "whatsNew.design", descKey: "whatsNew.designDesc", tag: "improved" },
  { icon: <PenLine className="w-5 h-5" />, titleKey: "whatsNew.redaktion", descKey: "whatsNew.redaktionDesc", tag: "new" },
];

const tagColors: Record<string, string> = {
  new: "bg-primary/20 text-primary",
  improved: "bg-muted text-muted-foreground",
};

const tagLabels: Record<string, string> = {
  new: "whatsNew.tagNew",
  improved: "whatsNew.tagImproved",
};

export default function WhatsNewDialog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem("whatsNew_dismissed") === CHANGELOG_VERSION) return;

    // Only existing users: accounts registered before this release
    const createdAt = user.created_at ? new Date(user.created_at) : null;
    if (!createdAt || createdAt >= RELEASE_DATE) return;

    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setName(data?.display_name || data?.username || "");
      setOpen(true);
    };
    const timer = setTimeout(load, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user]);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem("whatsNew_dismissed", CHANGELOG_VERSION);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 border-primary/20 max-h-[88dvh] flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-8 pb-6 text-center shrink-0">
          <button
            onClick={handleClose}
            aria-label={t("common.close")}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 mb-3">
            <PartyPopper className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {name
              ? t("whatsNew.welcomeBackNamed", { name })
              : t("whatsNew.welcomeBack")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">{t("whatsNew.welcomeIntro")}</p>
        </div>

        {/* Changes */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("whatsNew.title")}
          </p>
          {changes.map((item, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{t(item.titleKey)}</span>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${tagColors[item.tag]}`}>
                    {t(tagLabels[item.tag])}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-1 shrink-0">
          <Button onClick={handleClose} className="w-full">
            {t("whatsNew.dismiss")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
