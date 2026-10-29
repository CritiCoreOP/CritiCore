import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
];

export interface CollabUser {
  name: string;
  color: string;
  userId: string;
}

/**
 * Lightweight live-sync provider using Supabase Broadcast.
 * Broadcasts editor JSON on each update and applies incoming updates.
 */
export function useLiveSync(pageId: string | undefined) {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [collabUsers, setCollabUsers] = useState<CollabUser[]>([]);
  const onRemoteUpdateRef = useRef<((json: any) => void) | null>(null);
  const suppressRemoteRef = useRef(false);

  const currentUser: CollabUser | null = useMemo(() => {
    if (!user) return null;
    const color = COLORS[Math.abs(user.id.charCodeAt(0)) % COLORS.length];
    return { name: user.email?.split("@")[0] || "Anon", color, userId: user.id };
  }, [user]);

  useEffect(() => {
    if (!pageId || !user) return;

    const channel = supabase.channel(`rw-live-${pageId}`, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });

    channel
      .on("broadcast", { event: "editor-update" }, ({ payload }) => {
        if (payload?.userId !== user.id && payload?.json && onRemoteUpdateRef.current) {
          suppressRemoteRef.current = true;
          onRemoteUpdateRef.current(payload.json);
          // Reset after a tick so the next local update can broadcast again
          setTimeout(() => { suppressRemoteRef.current = false; }, 50);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others: CollabUser[] = [];
        Object.values(state).forEach((arr: any) => {
          arr.forEach((p: any) => {
            if (p.userId !== user.id) {
              others.push({ userId: p.userId, name: p.name, color: p.color });
            }
          });
        });
        setCollabUsers(others);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          const color = COLORS[Math.abs(user.id.charCodeAt(0)) % COLORS.length];
          await channel.track({
            userId: user.id,
            name: user.email?.split("@")[0] || "Anon",
            color,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setConnected(false);
    };
  }, [pageId, user]);

  /** Call this from editor's onUpdate to broadcast changes */
  const broadcastUpdate = (json: any) => {
    if (suppressRemoteRef.current) return; // Don't echo back remote updates
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: "broadcast",
      event: "editor-update",
      payload: { json, userId: user.id },
    });
  };

  /** Register a callback to apply remote updates to the editor */
  const onRemoteUpdate = (cb: (json: any) => void) => {
    onRemoteUpdateRef.current = cb;
  };

  return { connected, currentUser, collabUsers, broadcastUpdate, onRemoteUpdate, suppressRemoteRef };
}
