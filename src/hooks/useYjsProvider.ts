import { useEffect, useRef, useMemo, useState } from "react";
import * as Y from "yjs";
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

export function useYjsProvider(pageId: string | undefined) {
  const { user } = useAuth();
  const ydoc = useMemo(() => new Y.Doc(), []);
  const channelRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [collabUsers, setCollabUsers] = useState<CollabUser[]>([]);
  const initializedRef = useRef(false);

  // Current user info
  const currentUser: CollabUser | null = useMemo(() => {
    if (!user) return null;
    const color = COLORS[Math.abs(user.id.charCodeAt(0)) % COLORS.length];
    return {
      name: user.email?.split("@")[0] || "Anon",
      color,
      userId: user.id,
    };
  }, [user]);

  useEffect(() => {
    if (!pageId || !user) return;
    initializedRef.current = false;

    const channel = supabase.channel(`rw-collab-${pageId}`, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });

    channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        if (payload?.update) {
          const update = Uint8Array.from(atob(payload.update), (c) => c.charCodeAt(0));
          Y.applyUpdate(ydoc, update, "remote");
        }
      })
      .on("broadcast", { event: "yjs-sync-request" }, () => {
        // Someone new joined – send them our full state
        const state = Y.encodeStateAsUpdate(ydoc);
        const b64 = btoa(String.fromCharCode(...state));
        channel.send({ type: "broadcast", event: "yjs-sync-response", payload: { update: b64 } });
      })
      .on("broadcast", { event: "yjs-sync-response" }, ({ payload }) => {
        if (payload?.update) {
          const update = Uint8Array.from(atob(payload.update), (c) => c.charCodeAt(0));
          Y.applyUpdate(ydoc, update, "remote");
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
          // Request state from existing peers
          channel.send({ type: "broadcast", event: "yjs-sync-request", payload: {} });
        }
      });

    channelRef.current = channel;

    // Broadcast local updates to others
    const updateHandler = (update: Uint8Array, origin: any) => {
      if (origin === "remote") return;
      const b64 = btoa(String.fromCharCode(...update));
      channel.send({ type: "broadcast", event: "yjs-update", payload: { update: b64 } });
    };
    ydoc.on("update", updateHandler);

    return () => {
      ydoc.off("update", updateHandler);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setConnected(false);
      initializedRef.current = false;
    };
  }, [pageId, user, ydoc]);

  return { ydoc, connected, currentUser, collabUsers, initializedRef };
}
