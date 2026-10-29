import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobPosting } from "@/lib/jobs";

/** Open positions, in the order the admins set; RLS only returns published, unexpired ones */
export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<JobPosting[]> => {
      const { data, error } = await supabase
        .from("job_postings")
        .select("*")
        .eq("published", true)
        .order("sort_order")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobPosting[];
    },
  });
}

export function useJob(slug: string | undefined) {
  return useQuery({
    queryKey: ["job", slug],
    enabled: !!slug,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<JobPosting | null> => {
      const { data, error } = await supabase.from("job_postings").select("*").eq("slug", slug!).maybeSingle();
      if (error) throw error;
      return (data as JobPosting | null) ?? null;
    },
  });
}
