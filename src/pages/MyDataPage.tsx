import { useEffect } from "react";
import { useNavigate } from "@/lib/locale-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import Footer from "@/components/Footer";
import DataTransparency from "@/components/DataTransparency";
import { Loader2 } from "lucide-react";

const MyDataPage = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t("profile.dataTransparencyTitle", "Meine Daten") + " – CritiCore";
  }, [t]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 container mx-auto px-4 pt-24 pb-32 max-w-3xl">
        <DataTransparency userId={user.id} />
      </main>
      <Footer />
    </div>
  );
};

export default MyDataPage;
