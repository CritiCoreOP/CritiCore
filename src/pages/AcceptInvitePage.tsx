import { useEffect, useState } from "react";
import { useParams, useNavigate } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { useTranslation } from "react-i18next";
import { CheckCircle2 as CheckCircleTwoTone, AlertCircle as ErrorTwoTone } from "lucide-react";

const AcceptInvitePage = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "login">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [articleId, setArticleId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("login");
      return;
    }
    if (token) acceptInvite();
  }, [user, authLoading, token]);

  const acceptInvite = async () => {
    try {
      const { data, error } = await supabase.rpc("accept_article_invite", {
        p_token: token!,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        setStatus("success");
        setArticleId(result.article_id);
      } else {
        setStatus("error");
        setErrorMsg(result?.error || t("collab.inviteError", "Einladung ungültig"));
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-12 container mx-auto px-4 flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm text-center space-y-6">
          {status === "loading" && (
            <>
              <M3LoadingIndicator size={48} />
              <p className="text-muted-foreground">{t("collab.accepting", "Einladung wird angenommen...")}</p>
            </>
          )}

          {status === "login" && (
            <>
              <ErrorTwoTone className="w-10 h-10 text-yellow-500 mx-auto" />
              <p className="text-foreground font-medium">{t("collab.loginRequired", "Du musst eingeloggt sein, um die Einladung anzunehmen.")}</p>
              <Button onClick={() => navigate(`/auth?redirect=/invite/${token}`)}>
                {t("collab.goToLogin", "Zum Login")}
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircleTwoTone className="w-10 h-10 text-green-500 mx-auto" />
              <p className="text-foreground font-medium">{t("collab.accepted", "Du bist jetzt Co-Autor dieses Artikels!")}</p>
              <Button onClick={() => navigate(`/news/schreiben?edit=${articleId}`)}>
                {t("collab.openArticle", "Artikel bearbeiten")}
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <ErrorTwoTone className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-foreground font-medium">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate("/news")}>
                {t("collab.backToNews", "Zurück zu News")}
              </Button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AcceptInvitePage;
