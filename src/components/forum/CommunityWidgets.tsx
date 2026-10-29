import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark as BookmarkTwoTone, Gavel as GavelTwoTone, ExternalLink as OpenInNewTwoTone, CalendarDays as CalendarMonthTwoTone } from "lucide-react";
interface Widget {
  id: string;
  widget_type: string;
  title: string;
  content: any;
  sort_order: number;
}

export default function CommunityWidgets({ widgets }: { widgets: Widget[] }) {
  if (!widgets.length) return null;

  return (
    <div className="space-y-3">
      {widgets.map((w) => (
        <Card key={w.id}>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{w.title}</h3>

            {w.widget_type === "image" && (
              <div>
                {w.content.link_url ? (
                  <a href={w.content.link_url} target="_blank" rel="noopener noreferrer">
                    <img src={w.content.image_url} alt={w.title} className="w-full rounded-lg object-cover" loading="lazy" />
                  </a>
                ) : (
                  <img src={w.content.image_url} alt={w.title} className="w-full rounded-lg object-cover" loading="lazy" />
                )}
              </div>
            )}

            {w.widget_type === "button" && (
              <a href={w.content.link_url} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="default" size="sm" className="w-full rounded-full gap-1.5">
                  {w.content.label || w.title}
                  <OpenInNewTwoTone className="!text-sm" />
                </Button>
              </a>
            )}

            {w.widget_type === "image_button" && (
              <a href={w.content.link_url} target="_blank" rel="noopener noreferrer" className="block group">
                <div className="rounded-lg overflow-hidden relative">
                  <img src={w.content.image_url} alt={w.title} className="w-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              </a>
            )}

            {w.widget_type === "bookmarks" && (
              <div className="space-y-1.5">
                {(w.content.links || []).map((link: any, i: number) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-secondary/50">
                    <BookmarkTwoTone className="!text-sm text-muted-foreground" />
                    <span className="truncate">{link.label}</span>
                  </a>
                ))}
              </div>
            )}

            {w.widget_type === "rules" && (
              <ol className="space-y-2">
                {(w.content.rules || []).map((rule: string, i: number) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground shrink-0">{i + 1}.</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            )}

            {w.widget_type === "calendar" && (
              <div className="space-y-2">
                {(w.content.events || [])
                  .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""))
                  .map((event: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="bg-primary/10 text-primary rounded-lg p-1.5 text-center min-w-[40px]">
                        <CalendarMonthTwoTone className="!text-sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{event.name}</p>
                        {event.date && (
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(event.date).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
