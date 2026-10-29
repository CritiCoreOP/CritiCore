import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { Sparkles as AutoAwesomeTwoTone, CheckCircle2 as CheckCircleTwoTone, Map as MapTwoTone, Wrench as BuildTwoTone, Clock as ScheduleTwoTone } from "lucide-react";

type Status = "done" | "in-progress" | "planned";

interface RoadmapItem {
  id: string;
  title_key: string;
  desc_key: string;
  status: Status;
  quarter?: string | null;
  old_quarter?: string | null;
  sort_order: number;
}

const statusConfig: Record<Status, { icon: React.ReactNode; color: string; bg: string }> = {
  done: {
    icon: <CheckCircleTwoTone className="!text-[20px]" />,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  "in-progress": {
    icon: <BuildTwoTone className="!text-[20px]" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  planned: {
    icon: <ScheduleTwoTone className="!text-[20px]" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
};

const RoadmapPage = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSeo({
      title: t("meta.roadmap.title"),
      description: t("meta.roadmap.description"),
      url: "/roadmap",
    });
    return () => cleanupSeo();
  }, [t]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from("roadmap_items")
        .select("id, title_key, desc_key, status, quarter, old_quarter, sort_order")
        .eq("visible", true)
        .order("sort_order");
      if (data) setItems(data as RoadmapItem[]);
      setLoading(false);
    };
    fetchItems();
  }, []);

  const columns: { status: Status; labelKey: string; icon: React.ReactNode }[] = [
    { status: "done", labelKey: "roadmap.done", icon: <CheckCircleTwoTone className="!text-[22px] text-green-400" /> },
    { status: "in-progress", labelKey: "roadmap.inProgress", icon: <BuildTwoTone className="!text-[22px] text-amber-400" /> },
    { status: "planned", labelKey: "roadmap.planned", icon: <ScheduleTwoTone className="!text-[22px] text-blue-400" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pt-14">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
          <div className="container mx-auto px-4 py-16 sm:py-20 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <MapTwoTone className="!text-[28px] text-primary" />
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <AutoAwesomeTwoTone className="!text-[14px]" />
                {t("roadmap.badge")}
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {t("roadmap.title")}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              {t("roadmap.subtitle")}
            </p>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="container mx-auto px-4 py-10 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {columns.map((col) => {
              const colItems = items.filter((i) => i.status === col.status);
              return (
                <div key={col.status} className="flex flex-col">
                  <div className="flex items-center gap-2.5 mb-4 px-1">
                    {col.icon}
                    <h2 className="text-lg font-semibold text-foreground">{t(col.labelKey)}</h2>
                    <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
                      {loading ? "…" : colItems.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                      ))
                    ) : (
                      colItems.map((item) => {
                        const cfg = statusConfig[item.status];
                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border p-4 transition-colors hover:border-primary/30 ${cfg.bg}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground text-sm leading-snug">
                                  {t(item.title_key)}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                  {t(item.desc_key)}
                                </p>
                                {(item.old_quarter || item.quarter) && (
                                  <div className="flex items-center gap-1.5 mt-3">
                                    {item.old_quarter && (
                                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 line-through opacity-50">
                                        {item.old_quarter}
                                      </Badge>
                                    )}
                                    {item.quarter && (
                                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                        {item.quarter}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RoadmapPage;
