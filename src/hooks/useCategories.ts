import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  children?: Category[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_by: string | null;
  created_at: string;
}

export interface MediaRelease {
  id: string;
  media_id: string;
  media_type: string;
  region: string;
  release_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  media_id: string;
  media_type: string;
  list_type: string;
  priority: number;
  notes: string | null;
  created_at: string;
}

// Build tree from flat categories
function buildCategoryTree(cats: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];
  cats.forEach(c => map.set(c.id, { ...c, children: [] }));
  map.forEach(c => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

// Get ancestor chain for breadcrumbs
export function getCategoryPath(categories: Category[], categoryId: string): Category[] {
  const map = new Map<string, Category>();
  categories.forEach(c => map.set(c.id, c));
  const path: Category[] = [];
  let current = map.get(categoryId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }
  return path;
}

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 30,
  });

export const useCategoryTree = () => {
  const { data: categories, ...rest } = useCategories();
  return { data: categories ? buildCategoryTree(categories) : undefined, flat: categories, ...rest };
};

export const useTags = (statusFilter?: string) =>
  useQuery({
    queryKey: ["tags", statusFilter],
    queryFn: async () => {
      let q = supabase.from("tags").select("*").order("name");
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Tag[];
    },
    staleTime: 1000 * 60 * 10,
  });

export const useMediaReleases = (filters?: { status?: string; mediaType?: string }) =>
  useQuery({
    queryKey: ["media-releases", filters],
    queryFn: async () => {
      let q = supabase.from("media_releases").select("*").order("release_date", { ascending: true });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.mediaType) q = q.eq("media_type", filters.mediaType);
      const { data, error } = await q;
      if (error) throw error;
      return data as MediaRelease[];
    },
    staleTime: 1000 * 60 * 5,
  });

export const useMediaCategoriesForMedia = (mediaId: string, mediaType: string) =>
  useQuery({
    queryKey: ["media-categories", mediaId, mediaType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_categories")
        .select("*, categories(*)")
        .eq("media_id", mediaId)
        .eq("media_type", mediaType);
      if (error) throw error;
      return data;
    },
    enabled: !!mediaId,
  });

export const useMediaTagsForMedia = (mediaId: string, mediaType: string) =>
  useQuery({
    queryKey: ["media-tags", mediaId, mediaType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_tags")
        .select("*, tags(*)")
        .eq("media_id", mediaId)
        .eq("media_type", mediaType);
      if (error) throw error;
      return data;
    },
    enabled: !!mediaId,
  });

export const useMediaByCategory = (categoryId: string) =>
  useQuery({
    queryKey: ["media-by-category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_categories")
        .select("media_id, media_type")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

export const useMediaByTag = (tagId: string) =>
  useQuery({
    queryKey: ["media-by-tag", tagId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_tags")
        .select("media_id, media_type")
        .eq("tag_id", tagId);
      if (error) throw error;
      return data;
    },
    enabled: !!tagId,
  });

// Watchlist
export const useWatchlist = (listType: string = "watchlist") => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["watchlist", user?.id, listType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_watchlist")
        .select("*")
        .eq("list_type", listType)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WatchlistItem[];
    },
    enabled: !!user,
  });
};

export const useIsInWatchlist = (mediaId: string, mediaType: string, listType: string = "watchlist") => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["watchlist-check", user?.id, mediaId, mediaType, listType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_watchlist")
        .select("id")
        .eq("media_id", mediaId)
        .eq("media_type", mediaType)
        .eq("list_type", listType)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!mediaId,
  });
};

export const useToggleWatchlist = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ mediaId, mediaType, listType = "watchlist" }: { mediaId: string; mediaType: string; listType?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("user_watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("media_id", mediaId)
        .eq("media_type", mediaType)
        .eq("list_type", listType)
        .maybeSingle();
      if (existing) {
        await supabase.from("user_watchlist").delete().eq("id", existing.id);
        return { added: false };
      } else {
        await supabase.from("user_watchlist").insert({ user_id: user.id, media_id: mediaId, media_type: mediaType, list_type: listType });
        return { added: true };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      qc.invalidateQueries({ queryKey: ["watchlist-check"] });
    },
  });
};

// Suggest tag (for community)
export const useSuggestTag = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!user) throw new Error("Not authenticated");
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("tags").insert({ name, slug, created_by: user.id, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
};
