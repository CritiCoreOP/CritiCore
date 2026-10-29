import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ALL_STAFF_ROLES = ["editor_in_chief", "desk_lead_movies", "desk_lead_series", "desk_lead_anime", "desk_lead_games", "desk_lead_news", "author"];

/** People with an editorial function (profiles.staff_roles), editor-in-chief first */
export function useEditorialTeam() {
  return useQuery({
    queryKey: ["editorial-team"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, staff_roles")
        .overlaps("staff_roles", ALL_STAFF_ROLES);
      return (data ?? []).sort(
        (a, b) => Number(b.staff_roles.includes("editor_in_chief")) - Number(a.staff_roles.includes("editor_in_chief")),
      );
    },
    staleTime: 10 * 60_000,
  });
}
