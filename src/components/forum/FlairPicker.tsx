import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FlairBadge from "./FlairBadge";
import { cn } from "@/lib/utils";

interface Flair {
  id: string;
  name: string;
  color: string;
  bg_color: string;
  emoji: string | null;
  icon_url: string | null;
}

interface FlairPickerProps {
  communityId: string | null;
  flairType: "post" | "user";
  selectedFlairId: string | null;
  onSelect: (flair: Flair | null) => void;
}

const FlairPicker = ({ communityId, flairType, selectedFlairId, onSelect }: FlairPickerProps) => {
  const [flairs, setFlairs] = useState<Flair[]>([]);

  useEffect(() => {
    if (!communityId) { setFlairs([]); return; }
    supabase
      .from("forum_flairs")
      .select("id, name, color, bg_color, emoji, icon_url")
      .eq("community_id", communityId)
      .eq("flair_type", flairType)
      .order("sort_order")
      .then(({ data }) => setFlairs((data as Flair[]) || []));
  }, [communityId, flairType]);

  if (!flairs.length) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {selectedFlairId && (
        <button
          onClick={() => onSelect(null)}
          className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      )}
      {flairs.map((flair) => (
        <button
          key={flair.id}
          onClick={() => onSelect(flair.id === selectedFlairId ? null : flair)}
          className={cn(
            "rounded-full transition-all",
            flair.id === selectedFlairId && "ring-2 ring-primary ring-offset-1 ring-offset-background"
          )}
        >
          <FlairBadge
            name={flair.name}
            color={flair.color}
            bgColor={flair.bg_color}
            emoji={flair.emoji}
            iconUrl={flair.icon_url}
          />
        </button>
      ))}
    </div>
  );
};

export default FlairPicker;
