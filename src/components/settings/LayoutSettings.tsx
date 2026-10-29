import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, LayoutTemplate, Plus, RotateCcw, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DOCK_MAX,
  SECTIONS,
  SECTION_KEYS,
  moveItem,
  resetLayoutPrefs,
  setLayoutPrefs,
  useLayoutPrefs,
  type HomeOrder,
  type SectionKey,
} from "@/lib/layoutPrefs";

/**
 * A small icon button for the order lists. At the ends it is only aria-disabled, so the focus
 * stays on it when an item arrives at the top or bottom (a disabled button would drop the focus).
 */
function ListButton({ label, onClick, inactive, children }: { label: string; onClick: () => void; inactive?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={inactive || undefined}
      onClick={inactive ? undefined : onClick}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
        inactive ? "cursor-default opacity-40" : "hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Settings card: what the front page leads with, the side rail, the phone dock and the navbar order */
export default function LayoutSettings() {
  const { t } = useTranslation();
  const prefs = useLayoutPrefs();
  const railId = useId();
  const dockId = useId();
  const navId = useId();
  const name = (key: SectionKey) => t(SECTIONS[key].labelKey);
  const available = SECTION_KEYS.filter((key) => !prefs.dock.includes(key));
  const dockFull = prefs.dock.length >= DOCK_MAX;

  const homeOptions: { value: HomeOrder; label: string }[] = [
    { value: "news", label: t("layoutPrefs.homeNews") },
    { value: "media", label: t("layoutPrefs.homeMedia") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2 text-base">
          <LayoutTemplate className="!text-[20px] text-primary" aria-hidden="true" />
          {t("layoutPrefs.title")}
        </CardTitle>
        <CardDescription>{t("layoutPrefs.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Front page */}
        <fieldset>
          <legend className="text-sm font-medium text-foreground">{t("layoutPrefs.homeLabel")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {homeOptions.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={prefs.homeOrder === opt.value ? "default" : "outline"}
                aria-pressed={prefs.homeOrder === opt.value}
                onClick={() => setLayoutPrefs({ homeOrder: opt.value })}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <Separator />

        {/* Side rail */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor={railId} className="text-sm font-medium text-foreground">
              {t("layoutPrefs.railLabel")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("layoutPrefs.railDesc")}</p>
          </div>
          <Switch id={railId} checked={prefs.sideRail} onCheckedChange={(on) => setLayoutPrefs({ sideRail: on })} />
        </div>

        <Separator />

        {/* Phone dock */}
        <div>
          <p id={dockId} className="text-sm font-medium text-foreground">
            {t("layoutPrefs.dockLabel")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("layoutPrefs.dockDesc", { max: DOCK_MAX })}</p>
          <ol aria-labelledby={dockId} className="mt-3 divide-y divide-border rounded-lg border border-border">
            {prefs.dock.map((key, i) => (
              <li key={key} className="flex items-center gap-1 py-1 pl-3 pr-1">
                <span className="w-5 text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name(key)}</span>
                <ListButton label={t("layoutPrefs.moveUp", { name: name(key) })} inactive={i === 0} onClick={() => setLayoutPrefs({ dock: moveItem(prefs.dock, i, -1) })}>
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </ListButton>
                <ListButton
                  label={t("layoutPrefs.moveDown", { name: name(key) })}
                  inactive={i === prefs.dock.length - 1}
                  onClick={() => setLayoutPrefs({ dock: moveItem(prefs.dock, i, 1) })}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </ListButton>
                {/* The last section stays: a dock with only the menu button helps nobody */}
                <ListButton
                  label={t("layoutPrefs.remove", { name: name(key) })}
                  inactive={prefs.dock.length === 1}
                  onClick={() => setLayoutPrefs({ dock: prefs.dock.filter((k) => k !== key) })}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </ListButton>
              </li>
            ))}
          </ol>
          {available.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {available.map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={dockFull}
                  aria-label={t("layoutPrefs.add", { name: name(key) })}
                  onClick={() => setLayoutPrefs({ dock: [...prefs.dock, key] })}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {name(key)}
                </Button>
              ))}
            </div>
          )}
          {dockFull && <p className="mt-2 text-xs text-muted-foreground">{t("layoutPrefs.dockFull")}</p>}
        </div>

        <Separator />

        {/* Navbar order */}
        <div>
          <p id={navId} className="text-sm font-medium text-foreground">
            {t("layoutPrefs.navLabel")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("layoutPrefs.navDesc")}</p>
          <ol aria-labelledby={navId} className="mt-3 divide-y divide-border rounded-lg border border-border">
            {prefs.nav.map((key, i) => (
              <li key={key} className="flex items-center gap-1 py-1 pl-3 pr-1">
                <span className="w-5 text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name(key)}</span>
                <ListButton label={t("layoutPrefs.moveUp", { name: name(key) })} inactive={i === 0} onClick={() => setLayoutPrefs({ nav: moveItem(prefs.nav, i, -1) })}>
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </ListButton>
                <ListButton
                  label={t("layoutPrefs.moveDown", { name: name(key) })}
                  inactive={i === prefs.nav.length - 1}
                  onClick={() => setLayoutPrefs({ nav: moveItem(prefs.nav, i, 1) })}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </ListButton>
              </li>
            ))}
          </ol>
        </div>

        <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={resetLayoutPrefs}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("layoutPrefs.reset")}
        </Button>
      </CardContent>
    </Card>
  );
}
