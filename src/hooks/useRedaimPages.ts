import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RwPage {
  id: string;
  workspace_id: string;
  title: string;
  content: any;
  parent_id: string | null;
  sort_order: number;
  icon: string;
  is_public: boolean;
  cover_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useRedaimPages(workspaceId: string | undefined) {
  const { user } = useAuth();
  const [pages, setPages] = useState<RwPage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    if (!workspaceId) { setPages([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("rw_pages" as any)
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true });
    setPages((data as any as RwPage[]) || []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`rw-pages-${workspaceId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "rw_pages",
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => { fetchPages(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, fetchPages]);

  const createPage = async (title = "Untitled", parentId: string | null = null) => {
    if (!workspaceId || !user) return null;
    const { data, error } = await supabase
      .from("rw_pages" as any)
      .insert({
        workspace_id: workspaceId,
        title,
        parent_id: parentId,
        created_by: user.id,
        sort_order: pages.length,
        content: { type: "doc", content: [{ type: "paragraph" }] },
      } as any)
      .select()
      .single();
    if (error) return null;
    const newPage = data as any as RwPage;
    // Optimistic update: add to local state immediately
    setPages((prev) => [...prev, newPage]);
    return newPage;
  };

  const updatePage = async (pageId: string, updates: Partial<RwPage>) => {
    await supabase
      .from("rw_pages" as any)
      .update(updates as any)
      .eq("id", pageId);
  };

  const deletePage = async (pageId: string) => {
    // Optimistic update: remove from local state immediately
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    await supabase.from("rw_pages" as any).delete().eq("id", pageId);
  };

  return { pages, loading, createPage, updatePage, deletePage, refetch: fetchPages };
}

/** Auto-save hook: debounces content updates */
export function useAutoSave(pageId: string | undefined, delay = 3000) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback((content: any, title?: string) => {
    if (!pageId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const updates: any = { content };
      if (title !== undefined) updates.title = title;
      await supabase.from("rw_pages" as any).update(updates).eq("id", pageId);
    }, delay);
  }, [pageId, delay]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return save;
}
