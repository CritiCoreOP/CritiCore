import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RedaimWorkspaceList from "@/components/redaim/RedaimWorkspaceList";
import RedaimLayout from "@/components/redaim/RedaimLayout";
import RedaimSearchPage from "@/components/redaim/RedaimSearchPage";
import RedaimMeetingsPage from "@/components/redaim/RedaimMeetingsPage";
import RedaimAskAIPage from "@/components/redaim/RedaimAskAIPage";
import RedaimInboxPage from "@/components/redaim/RedaimInboxPage";
import RedaimLibraryPage from "@/components/redaim/RedaimLibraryPage";
import RedaimLearnPage from "@/components/redaim/RedaimLearnPage";
import RedaimSettingsPage from "@/components/redaim/RedaimSettingsPage";

const SUB_PAGES: Record<string, React.ComponentType> = {
  search: RedaimSearchPage,
  meetings: RedaimMeetingsPage,
  ai: RedaimAskAIPage,
  inbox: RedaimInboxPage,
  library: RedaimLibraryPage,
  learn: RedaimLearnPage,
  settings: RedaimSettingsPage,
};

function useHasRedaimAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["redaim-access", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["press", "admin"]);
      return (data && data.length > 0) || false;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export default function RedaimWorkspacePage() {
  const { workspaceId, locale } = useParams<{ workspaceId?: string; locale?: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: hasAccess, isLoading: accessLoading } = useHasRedaimAccess();

  // Show spinner while checking auth/access
  if (authLoading || accessLoading) {
    return (
      <div className="redaim-workspace redaim-loading-full">
        <div className="redaim-spinner" />
      </div>
    );
  }

  // Not logged in → redirect to auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Zugriff verweigert</h2>
          <p className="text-muted-foreground">Bitte melde dich an, um Redaim zu nutzen.</p>
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
            onClick={() => navigate(`/${locale || "de-DE"}/auth`)}
          >
            Anmelden
          </button>
        </div>
      </div>
    );
  }

  // Logged in but no press/admin role
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Zugriff verweigert</h2>
          <p className="text-muted-foreground">
            Redaim. Workspace ist nur für Presse- und Admin-Accounts verfügbar.
          </p>
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
            onClick={() => navigate(`/${locale || "de-DE"}/`)}
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

  // Check if workspaceId matches a sub-page key
  if (workspaceId && SUB_PAGES[workspaceId]) {
    const SubPage = SUB_PAGES[workspaceId];
    return <SubPage />;
  }

  if (workspaceId) {
    return <RedaimLayout />;
  }

  return <RedaimWorkspaceList />;
}
