import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function RedaimInvitePage() {
  const { token, locale } = useParams<{ token: string; locale: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "login">("loading");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setStatus("login"); return; }
    if (!token) { setStatus("error"); setErrorMsg("Kein Token"); return; }

    (async () => {
      const { data, error } = await supabase.rpc("accept_rw_invite", { p_token: token });
      if (error || !(data as any)?.success) {
        setStatus("error");
        setErrorMsg((data as any)?.error || error?.message || "Fehler");
      } else {
        setStatus("success");
        setWorkspaceId((data as any).workspace_id);
      }
    })();
  }, [user, authLoading, token]);

  return (
    <div className="redaim-workspace redaim-invite-page">
      <div className="redaim-invite-card">
        <h1 className="redaim-hero-title">Redaim.</h1>
        {status === "loading" && <Loader2 className="animate-spin mx-auto mt-8" size={32} />}
        {status === "login" && (
          <>
            <p className="mt-4 redaim-text-muted">Bitte melde dich an, um die Einladung anzunehmen.</p>
            <Button className="redaim-btn-primary mt-4" onClick={() => navigate(`/${locale}/auth?redirect=/rw/invite/${token}`)}>
              Anmelden
            </Button>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={48} className="text-green-500 mx-auto mt-4" />
            <p className="mt-4">Einladung angenommen!</p>
            <Button className="redaim-btn-primary mt-4" onClick={() => navigate(`/${locale}/rw/${workspaceId}`)}>
              Zum Workspace
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto mt-4" />
            <p className="mt-4 redaim-text-muted">{errorMsg}</p>
            <Button className="redaim-btn-primary mt-4" onClick={() => navigate(`/${locale}/rw`)}>
              Zurück
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
