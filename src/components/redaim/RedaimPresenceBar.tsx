import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PresenceUser {
  userId: string;
  name: string;
  color: string;
}

interface Props {
  pageId: string | undefined;
}

export default function RedaimPresenceBar({ pageId }: Props) {
  const { user } = useAuth();
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!pageId || !user) return;
    const map = new Map<string, PresenceUser>();

    const channel = supabase.channel(`rw-presence-${pageId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        map.clear();
        Object.values(state).forEach((arr: any) => {
          arr.forEach((p: any) => {
            if (p.userId !== user.id) {
              map.set(p.userId, { userId: p.userId, name: p.name, color: p.color });
            }
          });
        });
        setUsers(Array.from(map.values()));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];
          await channel.track({
            userId: user.id,
            name: user.email?.split("@")[0] || "Anon",
            color: colors[Math.abs(user.id.charCodeAt(0)) % colors.length],
          });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [pageId, user]);

  if (users.length === 0) return null;

  return (
    <div className="redaim-presence-bar">
      {users.map((u) => (
        <div
          key={u.userId}
          className="redaim-presence-avatar"
          style={{ backgroundColor: u.color }}
          title={u.name}
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
